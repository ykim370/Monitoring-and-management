// Intentionally limited to session authentication and account/position reads.
// No generic proxy, account switching, orders, deposits, transfers or position mutations.
const BASE='https://api-capital.backend-capital.com/api/v1';
let current=null;
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
class BrokerError extends Error{constructor(code,message,status=502){super(message);this.code=code;this.status=status;}}
const numeric=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const text=v=>typeof v==='string'?v.slice(0,160):'';
export function normalizeCapital(account,rows){
 if(!account||!Array.isArray(rows))throw new BrokerError('INVALID_RESPONSE','Capital.com returned incomplete account data.');
 const b=account.balance||{};
 return {account:{name:text(account.accountName),idSuffix:String(account.accountId).slice(-4),currency:text(account.currency),status:text(account.status),balance:numeric(b.balance),available:numeric(b.available),profitLoss:numeric(b.profitLoss),deposit:numeric(b.deposit)},positions:rows.map(row=>{const p=row.position||{},m=row.market||{};return {dealId:text(p.dealId),epic:text(m.epic),name:text(m.instrumentName),direction:['BUY','SELL'].includes(p.direction)?p.direction:'UNKNOWN',size:numeric(p.size),entry:numeric(p.level),currency:text(p.currency),profitLoss:numeric(p.profitLoss??p.upl),bid:numeric(m.bid),offer:numeric(m.offer),marketStatus:text(m.marketStatus),quoteTime:text(m.updateTimeUTC||m.updateTime),stop:numeric(p.stopLevel),limit:numeric(p.limitLevel),createdAt:text(p.createdDateUTC||p.createdDate)};})};
}
async function call(state,env,path,method='GET'){
 if(!((path==='/session'&&['POST','GET'].includes(method))||(['/accounts','/positions'].includes(path)&&method==='GET')))throw new BrokerError('READ_ONLY','Only account reads are supported.',405);
 const headers={'Content-Type':'application/json','X-CAP-API-KEY':env.CAPITAL_API_KEY};
 if(method==='GET'){headers.CST=state.cst;headers['X-SECURITY-TOKEN']=state.token;}
 let response;try{response=await state.fetcher(BASE+path,{method,headers,redirect:'manual',signal:AbortSignal.timeout(25000),...(method==='POST'?{body:JSON.stringify({identifier:env.CAPITAL_IDENTIFIER,password:env.CAPITAL_API_PASSWORD,encryptedPassword:false})}:{})});}catch{throw new BrokerError('CONNECTION_FAILED','Capital.com could not be reached. Retry shortly.',503);}
 if(response.status===401||response.status===403)throw new BrokerError('AUTH_FAILED','Capital.com rejected the session or credentials. Check the dedicated API key and API password.',401);
 if(response.status===429)throw new BrokerError('RATE_LIMIT','Capital.com requested a pause. Retry in one minute.',429);
 if(!response.ok||response.status>=300&&response.status<400)throw new BrokerError('BROKER_ERROR','Capital.com could not complete the read request.');
 let body;try{body=await response.json();}catch{throw new BrokerError('INVALID_RESPONSE','Capital.com returned an unreadable response.');}
 if(method==='POST'){state.cst=response.headers.get('CST');state.token=response.headers.get('X-SECURITY-TOKEN');if(!state.cst||!state.token)throw new BrokerError('AUTH_FAILED','Capital.com did not provide session tokens.',401);state.sessionUntil=Date.now()+8*60000;}
 return body;
}
async function snapshot(state,env){
 const newSession=!state.cst||state.sessionUntil<Date.now();
 const session=await call(state,env,'/session',newSession?'POST':'GET');
 if(String(session.currentAccountId||session.accountId)!==env.CAPITAL_ACCOUNT_ID)throw new BrokerError('ACCOUNT_MISMATCH','The active Capital.com account is not the configured account. No account switch or trade was performed.',409);
 const accounts=await call(state,env,'/accounts');
 const account=accounts.accounts?.find(a=>String(a.accountId)===env.CAPITAL_ACCOUNT_ID);
 if(!account)throw new BrokerError('ACCOUNT_MISMATCH','The configured account was not returned by Capital.com.',409);
 const positions=await call(state,env,'/positions');
 const data={connected:true,environment:'live',readOnly:true,fetchedAt:new Date().toISOString(),...normalizeCapital(account,positions.positions)};
 state.snapshot={data,until:Date.now()+30000};return data;
}
export async function capitalApi(request,env,context={}){
 if(request.method!=='GET')return reply({error:{code:'READ_ONLY',message:'Only account reads are supported.'}},405);
 // Sites dispatch provides this identity. Broker login and Site owner are separate identities.
 const owner=env.CAPITAL_OWNER_EMAIL?.toLowerCase(),visitor=request.headers.get('oai-authenticated-user-email')?.toLowerCase();
 if(!owner||visitor!==owner)return reply({error:{code:'OWNER_REQUIRED',message:'Sign in as the Site owner to view this Capital.com account.'}},403);
 const names=['CAPITAL_API_KEY','CAPITAL_API_PASSWORD','CAPITAL_IDENTIFIER','CAPITAL_ACCOUNT_ID'];
 if(names.some(k=>!env[k]))return reply({error:{code:'NOT_CONFIGURED',message:'Capital.com connection details have not been configured on the server.'}},503);
 const config=JSON.stringify(names.map(k=>env[k])),fetcher=context.capitalFetcher||fetch;
 if(!current||current.config!==config||current.fetcher!==fetcher)current={config,fetcher,cst:null,token:null,sessionUntil:0,snapshot:null,pending:null,retryAt:0};
 const state=current;
 if(state.snapshot?.until>Date.now())return reply({...state.snapshot.data,cacheHit:true});
 if(state.retryAt>Date.now())return reply({error:{code:'RETRY_LATER',message:'The broker connection is resting after an error. Retry in one minute.'}},429);
 if(!state.pending)state.pending=(async()=>{try{return await snapshot(state,env);}catch(error){state.cst=null;state.token=null;state.snapshot=null;state.retryAt=Date.now()+60000;throw error;}finally{state.pending=null;}})();
 try{return reply(await state.pending);}catch(error){return reply({error:{code:error instanceof BrokerError?error.code:'BROKER_ERROR',message:error instanceof BrokerError?error.message:'Capital.com account data is unavailable.'}},error instanceof BrokerError?error.status:502);}
}
export function resetCapitalState(){current=null;}
