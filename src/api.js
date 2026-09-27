import {marketStore} from './storage.js';
import {universe} from '../public/engine.js';
import {DataError,validateProviderResponse,normalizePrices,normalizeRevenue,normalizeEstimates} from './provider.js';
const memory=new Map(),pending=new Map();let queue=Promise.resolve(),lastCall=0,cooldownUntil=0;
export const TTL={TIME_SERIES_DAILY_ADJUSTED:3600,INCOME_STATEMENT:21600,EARNINGS_ESTIMATES:21600};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function queuedFetch(task,interval){
  const turn=queue.then(async()=>{if(Date.now()<cooldownUntil)throw new DataError('RATE_LIMIT','Provider rate limit reached. Wait one minute and retry.',429);await delay(Math.max(0,lastCall+interval-Date.now()));lastCall=Date.now();});
  queue=turn.catch(()=>{});await turn;return task();
}
export function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...(status===429?{'Retry-After':'60'}:{})}});}
async function rawProvider(fn,ticker,env,context){
  if(!env.ALPHAVANTAGE_API_KEY)throw new DataError('NOT_CONFIGURED','Set ALPHAVANTAGE_API_KEY on the server to load real data.',503);
  const key=fn+':'+ticker,hit=memory.get(key);if(hit&&hit.expires>Date.now())return {...hit.data,cacheHit:true};
  if(pending.has(key))return pending.get(key);
  const request=(async()=>{
    const cacheUrl='https://'+(context.cacheNamespace||'swing-desk-cache.internal')+'/__market_cache/v2/'+encodeURIComponent(key);
    if(context.cache){try{const r=await context.cache.match(cacheUrl);if(r){const cached=await r.json();if(cached.expires>Date.now()){memory.set(key,cached);return {...cached.data,cacheHit:true};}}}catch{}}
    const interval=Math.max(1000,Math.min(60000,Number(env.ALPHAVANTAGE_MIN_INTERVAL_MS)||2000));
    const result=await queuedFetch(async()=>{
      const url=new URL('https://www.alphavantage.co/query');url.search=new URLSearchParams({function:fn,symbol:ticker,apikey:env.ALPHAVANTAGE_API_KEY,...(fn==='TIME_SERIES_DAILY_ADJUSTED'?{outputsize:'full'}:{})});
      let response;try{response=await (context.fetcher||fetch)(url,{signal:AbortSignal.timeout(25000),redirect:'manual'});}catch(error){console.error('Alpha Vantage transport failure',String(error?.name||'Error'),String(error?.message||'unknown').replaceAll(env.ALPHAVANTAGE_API_KEY,'[REDACTED]').replace(/https?:\/\/\S+/g,'[URL]'));throw new DataError('UPSTREAM_UNREACHABLE','Alpha Vantage could not be reached. Retry shortly.',503);}
      if(response.status>=300&&response.status<400)throw new DataError('UPSTREAM_REDIRECT','Alpha Vantage returned an unexpected redirect.',502);
      if(response.status===429){cooldownUntil=Date.now()+60000;throw new DataError('RATE_LIMIT','Alpha Vantage rate limit reached. Wait one minute and retry.',429);}
      if(!response.ok)throw new DataError('UPSTREAM_HTTP','Alpha Vantage is temporarily unavailable.',503);
      let data;try{data=await response.json();}catch{throw new DataError('BAD_RESPONSE','The provider returned a non-JSON response.');}
      if(data.Information||data.Note)console.error('Alpha Vantage notice',String(data.Information||data.Note).replaceAll(env.ALPHAVANTAGE_API_KEY,'[REDACTED]').replace(/https?:\/\/\S+/g,'[URL]'));
      try{validateProviderResponse(data);}catch(error){if(error.code==='RATE_LIMIT')cooldownUntil=Date.now()+60000;throw error;}
      const normalized=fn==='TIME_SERIES_DAILY_ADJUSTED'?normalizePrices(data):fn==='INCOME_STATEMENT'?normalizeRevenue(data):normalizeEstimates(data);
      return {value:normalized,fetchedAt:new Date().toISOString(),source:'Alpha Vantage',cacheHit:false};
    },interval);
    const entry={data:result,expires:Date.now()+TTL[fn]*1000};memory.set(key,entry);
    if(context.cache){const work=context.cache.put(cacheUrl,new Response(JSON.stringify(entry),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age='+TTL[fn]}})).catch(()=>{});context.waitUntil?context.waitUntil(work):await work;}
    return result;
  })();pending.set(key,request);try{return await request;}finally{pending.delete(key);}
}
async function provider(fn,ticker,env,context){
 const store=marketStore(env.DB),key=fn+':'+ticker;let previous=null,storageWarning=false;
 if(store)try{previous=await store.get(key);}catch{storageWarning=true;}
 if(previous?.payload&&previous.expires>Date.now()&&!previous.error_code)return {...JSON.parse(previous.payload),cacheHit:true,stale:false};
 try{
  const result=await rawProvider(fn,ticker,env,context);
  if(store)try{await store.success(key,ticker,fn,result,Date.parse(result.fetchedAt)+TTL[fn]*1000);}catch{storageWarning=true;}
  return {...result,stale:false,storageWarning};
 }catch(error){
  const safe=error instanceof DataError?error:new DataError('INTERNAL_ERROR','Data request failed.',500);
  if(store)try{await store.failure(key,ticker,fn,safe);}catch{storageWarning=true;}
  if(previous?.payload)return {...JSON.parse(previous.payload),cacheHit:true,stale:true,warning:{code:safe.code,message:safe.message},storageWarning};
  throw safe;
 }
}
export async function handleApi(request,env={},context={}){
  try{
    const url=new URL(request.url);if(request.method!=='GET')return json({error:{code:'METHOD_NOT_ALLOWED',message:'Read-only API. Use GET.'}},405);
    if(url.pathname==='/api/health'){const store=marketStore(env.DB);if(!store)return json({available:false,records:[]});return json({available:true,records:await store.all()});}
    if(url.pathname==='/api/status')return json({configured:!!env.ALPHAVANTAGE_API_KEY,source:'Alpha Vantage',mode:'real-eod',universe:universe.map(s=>s.ticker),guidance:'unavailable',priceCacheSeconds:3600,revenueCacheSeconds:21600});
    if(!['/api/prices','/api/revenue','/api/estimates'].includes(url.pathname))return json({error:{code:'NOT_FOUND',message:'API route not found.'}},404);
    const ticker=(url.searchParams.get('symbol')||'').toUpperCase(),meta=universe.find(s=>s.ticker===ticker);
    if(!meta)throw new DataError('INVALID_SYMBOL','Choose one of the 24 supported watchlist symbols.',400);
    const fn=url.pathname==='/api/prices'?'TIME_SERIES_DAILY_ADJUSTED':url.pathname==='/api/revenue'?'INCOME_STATEMENT':'EARNINGS_ESTIMATES';
    const result=await provider(fn,ticker,env,context);
    return json({...meta,...result});
  }catch(error){const known=error instanceof DataError;return json({error:{code:known?error.code:'INTERNAL_ERROR',message:known?error.message:'The data request could not be completed.'}},known?error.status:500);}
}
export function resetApiState(){memory.clear();pending.clear();queue=Promise.resolve();lastCall=0;cooldownUntil=0;}
