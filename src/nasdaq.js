import snapshot from './data/nasdaq.json' with {type:'json'};
import {universe} from '../public/engine.js';
import {DataError} from './provider.js';

export const DIRECTORY_URL='https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt';
const TTL=6*60*60*1000;
let cached=null,pending=null,retryAt=0;
export function parseDirectory(text){
 const lines=text.trim().split(/\r?\n/),columns=lines.shift().split('|');
 if(columns[0]!=='Symbol'||!columns.includes('Test Issue'))throw Error('Invalid directory');
 const items=[];let asOf='';
 for(const line of lines){
  if(line.startsWith('File Creation Time: ')){asOf=line.split('|')[0].slice(20).trim();continue;}
  const row=Object.fromEntries(columns.map((key,i)=>[key,line.split('|')[i]]));
  if(row['Test Issue']!=='N'||!validSymbol(row.Symbol)||!row['Security Name'])continue;
  items.push({ticker:row.Symbol,name:row['Security Name'],sector:'NASDAQ',etf:row.ETF==='Y'});
 }
 if(!asOf||!items.length)throw Error('Incomplete directory');
 return {asOf,items};
}
export function validSymbol(value){return /^[A-Z][A-Z0-9.\-]{0,9}$/.test(value);}
export async function nasdaqDirectory(context={}){
 if(cached?.expires>Date.now())return {...cached,stale:false};
 if(Date.now()<retryAt)return {...(cached||snapshot),stale:true};
 if(pending)return pending;
 pending=(async()=>{
  const cacheKey='https://swing-desk-cache.internal/nasdaq-directory/v1';
  try{
   const hit=await context.cache?.match(cacheKey);
   if(hit){const data=await hit.json();if(data.expires>Date.now()){cached=data;return {...data,stale:false};}}
   const response=await (context.directoryFetcher||fetch)(DIRECTORY_URL,{signal:AbortSignal.timeout(10000),redirect:'error'});
   if(!response.ok)throw Error('Directory unavailable');
   const data=parseDirectory(await response.text());
   // Reject truncated upstream downloads; retain the last complete directory.
   if(data.items.length<1000)throw Error('Incomplete directory');
   cached={...data,expires:Date.now()+TTL};
   if(context.cache){const work=context.cache.put(cacheKey,new Response(JSON.stringify(cached),{headers:{'Cache-Control':'public, max-age=21600'}})).catch(()=>{});context.waitUntil?context.waitUntil(work):await work;}
   return {...cached,stale:false};
  }catch{retryAt=Date.now()+60000;return {...(cached||snapshot),stale:true};}
  finally{pending=null;}
 })();
 return pending;
}
export async function symbolMetadata(ticker,context={}){
 if(!validSymbol(ticker))throw new DataError('INVALID_SYMBOL','Enter a valid Nasdaq ticker.',400);
 const known=universe.find(s=>s.ticker===ticker);
 if(known)return known;
 const directory=await nasdaqDirectory(context),meta=directory.items.find(s=>s.ticker===ticker);
 if(!meta)throw new DataError('INVALID_SYMBOL','Ticker not found in the Nasdaq listing directory.',400);
 return meta;
}
export async function searchSymbols(query,context={}){
 const q=query.trim().toLowerCase();
 if(!q||q.length>100)return {items:[],total:0};
 const directory=await nasdaqDirectory(context);
 const items=[...new Map([...directory.items,...universe].map(s=>[s.ticker,s])).values()];
 const score=s=>s.ticker.toLowerCase()===q||s.name.toLowerCase()===q?0:s.ticker.toLowerCase().startsWith(q)?1:s.name.toLowerCase().startsWith(q)?2:3;
 const matches=items.filter(s=>(s.ticker+' '+s.name).toLowerCase().includes(q)).sort((a,b)=>score(a)-score(b)||a.ticker.localeCompare(b.ticker));
 return {items:matches.slice(0,30),total:matches.length,asOf:directory.asOf,stale:directory.stale,source:'Nasdaq Trader'};
}
export function resetDirectoryState(){cached=null;pending=null;retryAt=0;}
