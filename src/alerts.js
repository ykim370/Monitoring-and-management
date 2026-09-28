import {analyzeStock,universe,isPriceStale} from '../public/engine.js';import {alertCondition} from '../public/alert-model.js';
const json=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store'}});
export async function alertsApi(request,env,context={}){
 const user=context.localUserId||request.headers.get('oai-authenticated-user-id');if(!user)return json({error:{message:'Sign in to view alerts.'}},401);if(!env.DB)return json({error:{message:'Alert storage unavailable.'}},503);
 if(!['GET','POST'].includes(request.method))return json({error:{message:'Method not allowed.'}},405);
 if(request.method==='POST'&&request.headers.get('origin')!==new URL(request.url).origin)return json({error:{message:'Same-origin request required.'}},403);
 try{const fired=[];
 if(request.method==='POST'){
 const rules=(await env.DB.prepare("SELECT id,payload FROM user_records WHERE user_id=? AND kind='alerts'").bind(user).all()).results;
 const cached=(await env.DB.prepare('SELECT ticker,kind,payload,expires,error_code FROM market_cache').all()).results;
 for(const row of rules){const rule=JSON.parse(row.payload);if(!rule.enabled)continue;const p=cached.find(r=>r.ticker===rule.ticker&&r.kind==='TIME_SERIES_DAILY_ADJUSTED'),rev=cached.find(r=>r.ticker===rule.ticker&&r.kind==='INCOME_STATEMENT');let stock=null;if(p?.payload)stock=analyzeStock({...universe.find(s=>s.ticker===rule.ticker),...JSON.parse(p.payload).value,revenue:rev?.payload?JSON.parse(rev.payload).value:[]});
 const stale=!p?.payload||!!p.error_code||p.expires<=Date.now()||isPriceStale(stock),complete=!!rev?.payload&&!rev.error_code&&rev.expires>Date.now()&&stock?.parts.revenue!==null;
 const active=alertCondition(rule,stock,{stale,complete});if(active===null)continue;
 await env.DB.prepare('INSERT INTO alert_state (user_id,rule_id,active,last_fired) VALUES (?,?,0,0) ON CONFLICT(user_id,rule_id) DO NOTHING').bind(user,row.id).run();
 if(!active){await env.DB.prepare('UPDATE alert_state SET active=0 WHERE user_id=? AND rule_id=?').bind(user,row.id).run();continue;}
 const now=Date.now(),event={id:crypto.randomUUID(),ticker:rule.ticker,message:`${rule.ticker}: ${rule.type.replaceAll('_',' ')}${['price_above','price_below','score_above'].includes(rule.type)?' '+rule.threshold:''}. Price date: ${stock?.asOf||'unavailable'}.`,created_at:new Date(now).toISOString()};
 const cutoff=now-rule.cooldownMinutes*60000;
 const results=await env.DB.batch([
 env.DB.prepare('INSERT INTO alert_events (id,user_id,rule_id,ticker,message,created_at) SELECT ?,?,?,?,?,? FROM alert_state WHERE user_id=? AND rule_id=? AND active=0 AND last_fired<=?').bind(event.id,user,row.id,event.ticker,event.message,event.created_at,user,row.id,cutoff),
 env.DB.prepare('UPDATE alert_state SET active=1,last_fired=? WHERE user_id=? AND rule_id=? AND active=0 AND last_fired<=?').bind(now,user,row.id,cutoff)
 ]);
 if(results[0].meta?.changes??results[0].changes)fired.push(event);
 }}
 const events=(await env.DB.prepare('SELECT id,ticker,message,created_at FROM alert_events WHERE user_id=? ORDER BY created_at DESC LIMIT 50').bind(user).all()).results;return json({events,fired});
 }catch{return json({error:{message:'Could not evaluate or load alerts. Existing rules remain saved.'}},503);}
}
