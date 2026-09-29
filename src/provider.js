// Alpha Vantage payload normalization. Safe to unit-test without network or keys.
export class DataError extends Error {
  constructor(code,message,status=502){super(message);this.name='DataError';this.code=code;this.status=status;}
}
export function validateProviderResponse(data){
  if(!data||typeof data!=='object')throw new DataError('BAD_RESPONSE','The market data provider returned an invalid response.');
  if(data['Error Message'])throw new DataError('PROVIDER_ERROR','Alpha Vantage could not return data for this request.');
  if(data.Note||data.Information){const message=String(data.Note||data.Information).toLowerCase();
    if(/rate|frequency|limit|requests per|higher api call volume/.test(message))throw new DataError('RATE_LIMIT','Alpha Vantage rate limit reached. Wait one minute and retry.',429);
    if(/premium|api key|apikey|entitlement/.test(message))throw new DataError('API_ACCESS','Check the Alpha Vantage key and endpoint entitlement.',503);
    throw new DataError('PROVIDER_NOTICE','Alpha Vantage returned a service notice. Try again later.',503);
  }
  return data;
}
const num=v=>v===null||v===undefined||v===''||v==='None'?null:Number.isFinite(Number(v))?Number(v):null;
export function normalizePrices(payload){
  validateProviderResponse(payload);
  const series=payload['Time Series (Daily)'];
  if(!series||typeof series!=='object')throw new DataError('NO_PRICES','Daily OHLCV history is unavailable.');
  let futureSplit=1;
  const bars=Object.entries(series).filter(([date])=>/^\d{4}-\d{2}-\d{2}$/.test(date)).sort(([a],[b])=>b.localeCompare(a)).slice(0,260).map(([date,r])=>{
    const split=num(r['8. split coefficient'])??1;
    const o=num(r['1. open']),h=num(r['2. high']),l=num(r['3. low']),c=num(r['4. close']),v=num(r['6. volume']);
    if([o,h,l,c,v].some(x=>x===null)||Math.min(o,h,l,c)<=0||v<0||h<Math.max(o,c)||l>Math.min(o,c)||split<=0)throw new DataError('BAD_PRICES','The provider returned an invalid OHLCV bar.');
    const bar={date,open:o/futureSplit,high:h/futureSplit,low:l/futureSplit,close:c/futureSplit,volume:v*futureSplit};
    futureSplit*=split;return bar;
  }).reverse();
  if(bars.length<60)throw new DataError('SHORT_HISTORY','At least 60 daily sessions are required.');
  return {bars,asOf:bars.at(-1).date,timezone:payload['Meta Data']?.['5. Time Zone']||'US/Eastern',priceBasis:'split-adjusted to latest share units; dividends not adjusted',currency:'USD'};
}
export function normalizeRevenue(payload){
  validateProviderResponse(payload);
  if(!Array.isArray(payload.quarterlyReports))throw new DataError('NO_REVENUE','Quarterly revenue is unavailable.');
  const seen=new Set();
  const rows=payload.quarterlyReports.filter(r=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(r.fiscalDateEnding)||seen.has(r.fiscalDateEnding))return false;seen.add(r.fiscalDateEnding);return true;}).sort((a,b)=>a.fiscalDateEnding.localeCompare(b.fiscalDateEnding)).slice(-8);
  // Preserve missing reports as missing data, not zeros or a shifted quarter comparison.
  if(rows.some(r=>num(r.totalRevenue)===null||num(r.totalRevenue)<0||!/^[A-Z]{3}$/.test(r.reportedCurrency||'')))throw new DataError('INCOMPLETE_REVENUE','Revenue contains a missing value or reporting currency.');
  return rows.map(r=>({date:r.fiscalDateEnding,label:r.fiscalDateEnding.slice(0,7),value:Number(r.totalRevenue)/1e6,currency:r.reportedCurrency}));
}
export function normalizeEstimates(payload){
  validateProviderResponse(payload);
  if(!Array.isArray(payload.estimates))throw new DataError('NO_ESTIMATES','Analyst consensus is unavailable.');
  return payload.estimates.filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&['fiscal year','fiscal quarter'].includes(r.horizon)).map(r=>({date:r.date,horizon:r.horizon,revenueAverage:num(r.revenue_estimate_average),revenueLow:num(r.revenue_estimate_low),revenueHigh:num(r.revenue_estimate_high),analystCount:num(r.revenue_estimate_analyst_count),epsAverage:num(r.eps_estimate_average),epsAnalystCount:num(r.eps_estimate_analyst_count),epsHistory:[90,60,30,7,0].map(d=>({daysAgo:d,value:num(d?r['eps_estimate_average_'+d+'_days_ago']:r.eps_estimate_average)}))}));
}
