export const FUNDAMENTAL_ROUTES={OVERVIEW:'overview',BALANCE_SHEET:'balance',CASH_FLOW:'cashflow',EARNINGS_ESTIMATES:'estimates'};
// Pick up where the last cycle stopped; skip leases/backoffs owned by any tab.
export function fundamentalTasks(stocks,jobs=[],now=Date.now()){
 const tasks=stocks.flatMap(s=>Object.entries(FUNDAMENTAL_ROUTES).filter(([kind])=>!s.sources[kind]?.fresh).map(([kind,path])=>{
  const key=kind+':'+s.ticker,job=jobs.find(j=>j.key===key),source=s.sources[kind];
  return {ticker:s.ticker,path,kind,key,readyAt:Math.max(job?.retry_until||0,job?.lease_until||0),attemptedAt:Date.parse(source?.attemptedAt||'')||0};
 }));
 return tasks.filter(t=>t.readyAt<=now).sort((a,b)=>a.attemptedAt-b.attemptedAt||a.ticker.localeCompare(b.ticker)||Object.keys(FUNDAMENTAL_ROUTES).indexOf(a.kind)-Object.keys(FUNDAMENTAL_ROUTES).indexOf(b.kind));
}
export async function collectFundamentals(tasks,{request,visible=()=>true,onProgress=()=>{},start=0}={}){
 let done=0,failed=0,throttled=false,next=start;
 for(let i=0;i<tasks.length;i++){
  if(!visible())break;const index=(start+i)%tasks.length,task=tasks[index];next=(index+1)%tasks.length;
  try{const {ok,data}=await request(task);done++;
   if(!ok||data.stale){failed++;const code=data.error?.code||data.warning?.code;
    if(['RATE_LIMIT','BUDGET_WAIT'].includes(code)){throttled=true;await onProgress({done,failed,task});break;}
   }
  }catch{done++;failed++;}
  await onProgress({done,failed,task});
 }
 return {done,failed,throttled,next};
}
