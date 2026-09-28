import {planMetrics} from '../public/plan-model.js';import {universe,analyzeStock} from '../public/engine.js';
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export async function captureEvidence(db,ticker){const rows=(await db.prepare('SELECT kind,payload,error_code FROM market_cache WHERE ticker=? AND payload IS NOT NULL').bind(ticker).all()).results;const price=rows.find(r=>r.kind==='TIME_SERIES_DAILY_ADJUSTED'),revenue=rows.find(r=>r.kind==='INCOME_STATEMENT');if(!price)return {available:false,capturedAt:new Date().toISOString()};const p=JSON.parse(price.payload);const stock=analyzeStock({...universe.find(s=>s.ticker===ticker),...p.value,revenue:revenue?JSON.parse(revenue.payload).value:[]});return {available:true,capturedAt:new Date().toISOString(),asOf:stock.asOf,fetchedAt:p.fetchedAt,retained:!!price.error_code,score:stock.score,parts:stock.parts,bars:stock.bars.slice(-60)};}
export function validateRecord(kind,p){
 if(!p||typeof p!=='object'||Array.isArray(p))throw Error('Invalid record.');
 if(kind!=='plans')throw Error('Unsupported record type.');
 if(!universe.some(s=>s.ticker===p.ticker))throw Error('Unsupported stock.');
 planMetrics(p);if(typeof p.notes!=='string'||p.notes.length>2000)throw Error('Notes must be at most 2,000 characters.');
 return {ticker:p.ticker,side:p.side,entry:p.entry,stop:p.stop,target:p.target,qty:p.qty,cost:p.cost,notes:p.notes};
}
export async function recordsApi(request,env,context={}){
 const user=context.localUserId||request.headers.get('oai-authenticated-user-id');if(!user)return reply({error:{message:'Sign in to access private records.'}},401);
 if(!env.DB)return reply({error:{message:'Private storage unavailable. Your input has not been saved.'}},503);
 const url=new URL(request.url),kind=url.searchParams.get('kind');if(!['plans'].includes(kind))return reply({error:{message:'Unsupported record type.'}},400);
 try{
 if(request.method==='GET'){const rows=(await env.DB.prepare('SELECT id,revision,payload,updated_at FROM user_records WHERE user_id=? AND kind=? ORDER BY updated_at DESC').bind(user,kind).all()).results;return reply({records:rows.map(r=>({...r,payload:JSON.parse(r.payload)}))});}
 if(!['PUT','DELETE'].includes(request.method))return reply({error:{message:'Method not allowed.'}},405);
 if(request.headers.get('origin')!==url.origin)return reply({error:{message:'Same-origin requests required.'}},403);
 if(!(request.headers.get('content-type')||'').startsWith('application/json'))return reply({error:{message:'JSON required.'}},415);
 const raw=await request.text();if(raw.length>16000)return reply({error:{message:'Record too large.'}},413);const body=JSON.parse(raw);
 if(!body||typeof body!=='object'||!/^[a-zA-Z0-9_-]{1,80}$/.test(body.id)||!Number.isInteger(body.revision)||body.revision<0)return reply({error:{message:'Invalid record version.'}},400);
 if(request.method==='DELETE'){const r=await env.DB.prepare('DELETE FROM user_records WHERE user_id=? AND kind=? AND id=? AND revision=?').bind(user,kind,body.id,body.revision).run();return (r.meta?.changes??r.changes)?reply({deleted:true}):reply({error:{message:'Record changed elsewhere. Reload before deleting.'}},409);}
 const payload=validateRecord(kind,body.payload);
 const existing=await env.DB.prepare('SELECT payload FROM user_records WHERE user_id=? AND kind=? AND id=?').bind(user,kind,body.id).first();
 payload.evidence=existing?JSON.parse(existing.payload).evidence:await captureEvidence(env.DB,payload.ticker);
 const now=new Date().toISOString();
 const result=body.revision===0?await env.DB.prepare('INSERT INTO user_records (user_id,kind,id,revision,payload,updated_at) VALUES (?,?,?,1,?,?) ON CONFLICT(user_id,kind,id) DO NOTHING').bind(user,kind,body.id,JSON.stringify(payload),now).run():await env.DB.prepare('UPDATE user_records SET revision=revision+1,payload=?,updated_at=? WHERE user_id=? AND kind=? AND id=? AND revision=?').bind(JSON.stringify(payload),now,user,kind,body.id,body.revision).run();
 if(!(result.meta?.changes??result.changes))return reply({error:{message:'Record changed elsewhere. Reload to avoid overwriting it.'}},409);return reply({saved:true,revision:body.revision+1});
 }catch(error){const validation=error instanceof SyntaxError||/Invalid|Unsupported|must|Choose|Long:/.test(error.message);return reply({error:{message:validation?error.message:'Storage could not complete the request. Your input is preserved.'}},validation?400:503);}
}
