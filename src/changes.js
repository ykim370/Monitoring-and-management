import {analyzeStock,universe,isPriceStale} from '../public/engine.js';
import {compareSnapshots} from '../public/change-model.js';
export async function marketChanges(db){
 if(!db)return {available:false};
 const rows=(await db.prepare('SELECT ticker,kind,payload,expires,error_code FROM market_cache WHERE payload IS NOT NULL').all()).results;
 const current=[];
 for(const meta of universe){const price=rows.find(r=>r.ticker===meta.ticker&&r.kind==='TIME_SERIES_DAILY_ADJUSTED'),rev=rows.find(r=>r.ticker===meta.ticker&&r.kind==='INCOME_STATEMENT');if(!price||!rev||price.error_code||rev.error_code||price.expires<=Date.now()||rev.expires<=Date.now())continue;
 const p=JSON.parse(price.payload),r=JSON.parse(rev.payload);const stock=analyzeStock({...meta,...p.value,revenue:r.value});if(isPriceStale(stock)||stock.parts.revenue===null)continue;
 current.push({ticker:stock.ticker,date:stock.asOf,score:stock.score,parts:stock.parts});}
 const date=current.reduce((d,s)=>s.date>d?s.date:d,'');const matching=current.filter(s=>s.date===date);
 if(matching.length<2)return {available:true,ready:false,message:'Not enough fresh matching price and revenue data to capture a snapshot.'};
 const existing=await db.prepare('SELECT snapshot FROM market_sessions WHERE date=?').bind(date).first();
 if(existing&&JSON.parse(existing.snapshot).length>matching.length)return {available:true,ready:false,message:'Coverage is lower than the saved snapshot. Refresh the missing data before comparing.'};
 await db.prepare('INSERT INTO market_sessions (date,observed_at,snapshot) VALUES (?,?,?) ON CONFLICT(date) DO UPDATE SET observed_at=excluded.observed_at,snapshot=excluded.snapshot').bind(date,new Date().toISOString(),JSON.stringify(matching)).run();
 const previous=await db.prepare('SELECT date,snapshot FROM market_sessions WHERE date < ? ORDER BY date DESC LIMIT 1').bind(date).first();
 return {available:true,ready:true,date,previousDate:previous?.date||null,coverage:matching.length,...compareSnapshots(previous?JSON.parse(previous.snapshot):null,matching)};
}
