import {providerBudget} from './provider-budget.js';
import {universe} from '../public/engine.js';import {snowflakeScores} from '../public/snowflake-model.js';
export async function screenerSnapshot(db,now=Date.now()){
 if(!db)return {available:false,stocks:[]};
 const records=(await db.prepare("SELECT ticker,kind,payload,expires,error_code,error_message,succeeded_at,attempted_at FROM market_cache WHERE kind IN ('OVERVIEW','BALANCE_SHEET','CASH_FLOW','EARNINGS_ESTIMATES','TIME_SERIES_DAILY_ADJUSTED')").all()).results;
 return {available:true,budget:await providerBudget(db).status(now),stocks:universe.map(meta=>{
  const sources={};for(const r of records.filter(r=>r.ticker===meta.ticker)){let packet;try{packet=JSON.parse(r.payload);}catch{}sources[r.kind]={value:packet?.value??null,fetchedAt:r.succeeded_at,attemptedAt:r.attempted_at,fresh:!!packet?.value&&r.expires>now&&!r.error_code&&(r.kind!=='EARNINGS_ESTIMATES'||packet.value.every(v=>'epsAverage' in v)),error:r.error_code||null,message:r.error_message||null};}
  const o=sources.OVERVIEW?.value,p=sources.TIME_SERIES_DAILY_ADJUSTED;
  const result={...meta,industry:o?.Industry||meta.sector,description:o?.Description||'',marketCap:sources.OVERVIEW?.fresh?o?.MarketCapitalization:null,currency:o?.Currency||'USD',price:p?.fresh?p.value.bars.at(-1)?.close:null,priceDate:p?.value?.asOf||null,sources};
  delete sources.TIME_SERIES_DAILY_ADJUSTED; // The screener only needs the latest close, not entire price histories.
  return {...result,...snowflakeScores(result,now)};
 })};
}
