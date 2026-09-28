import {DataError} from './provider.js';
export const REQUEST_LIMIT=70,REQUEST_SPACING=850;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const unavailable=()=>new DataError('BUDGET_UNAVAILABLE','Shared API budget is unavailable. Saved data is retained; new requests are paused.',503);
// All Worker instances use the same D1 rows. Each conditional SQL write is atomic.
export function providerBudget(db){
 if(!db)return null;
 return {
  async claim(key,now=Date.now()){
   const token=crypto.randomUUID();
   const row=await db.prepare(`INSERT INTO provider_jobs (key,token,lease_until,retry_until,failures) VALUES (?,?,?,0,0)
    ON CONFLICT(key) DO UPDATE SET token=excluded.token,lease_until=excluded.lease_until
    WHERE provider_jobs.lease_until<=? AND provider_jobs.retry_until<=? RETURNING token`).bind(key,token,now+90000,now,now).first();
   return row?token:null;
  },
  async reserve(key,now=Date.now()){
   await db.prepare('INSERT OR IGNORE INTO provider_control (id,cooldown_until) VALUES (1,0)').run();
   const row=await db.prepare(`INSERT INTO provider_calls (id,key,started_at) SELECT ?,?,?
    WHERE (SELECT cooldown_until FROM provider_control WHERE id=1)<=?
    AND (SELECT COUNT(*) FROM provider_calls WHERE started_at>?)<?
    AND NOT EXISTS (SELECT 1 FROM provider_calls WHERE started_at>?) RETURNING id`).bind(crypto.randomUUID(),key,now,now,now-60000,REQUEST_LIMIT,now-REQUEST_SPACING).first();
   return !!row;
  },
  async finish(key,token,error,now=Date.now()){
   const waiting=error?.code==='BUDGET_WAIT';const failed=!!error&&!waiting;
   await db.prepare(`UPDATE provider_jobs SET lease_until=0,failures=CASE WHEN ? THEN MIN(failures+1,6) ELSE 0 END,
    retry_until=CASE WHEN ? THEN ?+MIN(1800000,60000*(1 << MIN(failures,5))) ELSE 0 END
    WHERE key=? AND token=?`).bind(failed?1:0,failed?1:0,now,key,token).run();
   if(error?.code==='RATE_LIMIT')await db.prepare('UPDATE provider_control SET cooldown_until=MAX(cooldown_until,?) WHERE id=1').bind(now+60000).run();
   if(waiting)await db.prepare('UPDATE provider_jobs SET retry_until=? WHERE key=? AND token=?').bind(now+5000,key,token).run();
   await db.prepare('DELETE FROM provider_calls WHERE started_at<?').bind(now-86400000).run();
  },
  async status(now=Date.now()){
   const calls=await db.prepare('SELECT COUNT(*) AS used FROM provider_calls WHERE started_at>?').bind(now-60000).first();
   const control=await db.prepare('SELECT cooldown_until FROM provider_control WHERE id=1').first();
   return {limit:REQUEST_LIMIT,used:calls.used,remaining:Math.max(0,REQUEST_LIMIT-calls.used),cooldownUntil:control?.cooldown_until||0,
    jobs:(await db.prepare('SELECT key,lease_until,retry_until,failures FROM provider_jobs').all()).results};
  }
 };
}
export async function withProviderBudget(db,key,task,{now=()=>Date.now(),wait=sleep}={}){
 const budget=providerBudget(db);if(!budget)return task();
 let token;try{token=await budget.claim(key,now());}catch{throw unavailable();}
 if(!token)throw new DataError('REFRESH_PENDING','Refresh already running or waiting for its retry time. Saved data remains available.',429);
 let error;
 try{
  let reserved=false;
  // Bounded wait, never queue an unbounded number of requests in a Worker.
  for(let i=0;i<4;i++){try{reserved=await budget.reserve(key,now());}catch{throw unavailable();}if(reserved)break;await wait(1000);}
  if(!reserved)throw new DataError('BUDGET_WAIT','API budget is resting. The next refresh cycle will retry.',429);
  return await task();
 }catch(e){error=e;throw e;}
 finally{try{await budget.finish(key,token,error,now());}catch{/* A bounded lease expires even if storage fails. */}}
}
