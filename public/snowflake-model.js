export const AXES=['Value','Future','Past','Health','Dividend'];
const has=x=>typeof x==='number'&&Number.isFinite(x);
const ratio=(a,b)=>has(a)&&has(b)&&b>0?a/b:null;
const check=(label,value,pass,source)=>({label,value:has(value)?value:null,pass:has(value)?!!pass(value):null,source});
const recent=(date,days,now)=>/^\d{4}-\d{2}-\d{2}$/.test(date||'')&&now-Date.parse(date)>=0&&now-Date.parse(date)<=days*86400000;
export function snowflakeScores(data,now=Date.now()){
 const sources=data.sources||{},get=k=>sources[k]?.fresh?sources[k].value:null;
 let o=get('OVERVIEW'),b=get('BALANCE_SHEET'),c=get('CASH_FLOW');
 if(o&&!recent(o.LatestQuarter,200,now))o=null;
 if(b&&!recent(b.date,550,now))b=null;if(c&&!recent(c.date,550,now))c=null;
 const ov=k=>o?.[k]??null;
 const years=(get('EARNINGS_ESTIMATES')||[]).filter(r=>r.horizon==='fiscal year'&&r.date>=new Date(now).toISOString().slice(0,10)).sort((a,b)=>a.date.localeCompare(b.date));
 const [a,z]=years;const adjacent=a&&z&&Date.parse(z.date)-Date.parse(a.date)>=300*86400000&&Date.parse(z.date)-Date.parse(a.date)<=430*86400000;
 const growth=(x,y)=>has(x)&&x>0&&has(y)?Math.round((y/x-1)*1e10)/1e10:null;
 const rev=adjacent&&a.analystCount>=1&&z.analystCount>=1?growth(a.revenueAverage,z.revenueAverage):null;
 const eps=adjacent&&a.epsAnalystCount>=1&&z.epsAnalystCount>=1?growth(a.epsAverage,z.epsAverage):null;
 const cr=ratio(b?.totalCurrentAssets,b?.totalCurrentLiabilities),liabilities=ratio(b?.totalLiabilities,b?.totalAssets);
 const fcf=c&&has(c.operatingCashflow)&&has(c.capitalExpenditures)?c.operatingCashflow-Math.abs(c.capitalExpenditures):null;
 const dy=ov('DividendYield'),payout=ratio(ov('DividendPerShare'),ov('EPS'));
 const divCheck=(label,value,pass,source)=>dy===0?{label,value:0,pass:false,source,note:'No dividend yield reported (0).'}:check(label,dy===null?null:value,pass,source);
 const tests={
 Value:[check('Positive P/E below 25×',ov('PERatio'),x=>x>0&&x<25,'OVERVIEW'),check('Positive forward P/E below 25×',ov('ForwardPE'),x=>x>0&&x<25,'OVERVIEW'),check('Positive PEG below 1.5×',ov('PEGRatio'),x=>x>0&&x<1.5,'OVERVIEW'),check('Positive price/book below 3×',ov('PriceToBookRatio'),x=>x>0&&x<3,'OVERVIEW'),check('Positive EV/EBITDA below 15×',ov('EVToEBITDA'),x=>x>0&&x<15,'OVERVIEW')],
 Future:[check('Next-year forecast revenue growth above 0%',rev,x=>x>0,'EARNINGS_ESTIMATES'),check('Next-year forecast revenue growth at least 10%',rev,x=>x>=.1,'EARNINGS_ESTIMATES'),check('Next-year forecast revenue growth at least 20%',rev,x=>x>=.2,'EARNINGS_ESTIMATES'),check('Next-year forecast EPS growth above 0%',eps,x=>x>0,'EARNINGS_ESTIMATES'),check('Next-year forecast EPS growth at least 10%',eps,x=>x>=.1,'EARNINGS_ESTIMATES')],
 Past:[check('Quarterly revenue growth year-on-year above 0%',ov('QuarterlyRevenueGrowthYOY'),x=>x>0,'OVERVIEW'),check('Quarterly earnings growth year-on-year above 0%',ov('QuarterlyEarningsGrowthYOY'),x=>x>0,'OVERVIEW'),check('Profit margin above 0%',ov('ProfitMargin'),x=>x>0,'OVERVIEW'),check('Profit margin at least 10%',ov('ProfitMargin'),x=>x>=.1,'OVERVIEW'),check('Return on equity at least 15%',ov('ReturnOnEquityTTM'),x=>x>=.15,'OVERVIEW')],
 Health:[check('Current ratio at least 1×',cr,x=>x>=1,'BALANCE_SHEET'),check('Current ratio at least 1.5×',cr,x=>x>=1.5,'BALANCE_SHEET'),check('Liabilities/assets between 0% and 50%',liabilities,x=>x>=0&&x<=.5,'BALANCE_SHEET'),check('Positive shareholder equity',b?.totalShareholderEquity,x=>x>0,'BALANCE_SHEET'),check('Positive annual operating cash flow',c?.operatingCashflow,x=>x>0,'CASH_FLOW')],
 Dividend:[divCheck('Positive dividend yield',dy,x=>x>0,'OVERVIEW'),divCheck('Dividend yield at least 2%',dy,x=>x>=.02,'OVERVIEW'),divCheck('DPS/EPS payout between 0% and 60%',payout,x=>x>=0&&x<=.6,'OVERVIEW'),divCheck('Positive annual free cash flow',fcf,x=>x>0,'CASH_FLOW'),divCheck('Free cash flow covers positive common dividends',has(fcf)&&has(c?.dividendPayoutCommonStock)&&c.dividendPayoutCommonStock>0?fcf/Math.abs(c.dividendPayoutCommonStock):null,x=>x>=1,'CASH_FLOW')]
 };
 const axes=Object.fromEntries(AXES.map(name=>{const rows=tests[name],known=rows.filter(r=>r.pass!==null).length,passed=rows.filter(r=>r.pass===true).length;return [name,{score:known===5?passed:null,known,passed,tests:rows}];}));
 return {axes,complete:AXES.every(k=>axes[k].score!==null),forecastPeriod:adjacent?`${a.date} to ${z.date}`:null};
}
export function assessSnowflake(row,{minimum={},complete=false}={}){
 const pending=[];const failed=[];
 for(const a of AXES){
  const axis=row.axes[a],target=Number(minimum[a]||0);if(target<=0)continue;
  const lower=axis.score??axis.passed??0,upper=axis.score??(lower+5-(axis.known??0));
  if(upper<target)failed.push(a);else if(lower<target)pending.push(a);
 }
 if(failed.length)return {state:'below',axes:failed};
 if(complete&&!row.complete)for(const a of AXES)if(row.axes[a].score===null&&!pending.includes(a))pending.push(a);
 return {state:pending.length?'pending':'match',axes:pending};
}
export function screenSnowflakes(rows,{query='',industry='',minimum={},complete=false,sort='ticker'}={}){
 const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
 const scope=rows.filter(r=>terms.every(t=>[r.ticker,r.name,r.industry,r.description].join(' ').toLowerCase().includes(t))&&(!industry||r.industry===industry));
 const groups={matches:[],pending:[],below:[]};
 for(const row of scope){const result=assessSnowflake(row,{minimum,complete});groups[result.state==='match'?'matches':result.state].push({...row,filterAssessment:result});}
 const metric=r=>sort==='marketCap'?r.marketCap:AXES.includes(sort)?r.axes[sort].score??r.axes[sort].passed??null:null;
 groups.matches.sort((a,b)=>sort==='ticker'?a.ticker.localeCompare(b.ticker):(metric(b)??-Infinity)-(metric(a)??-Infinity)||a.ticker.localeCompare(b.ticker));
 return groups;
}
export function filterSnowflakes(rows,options={}){return screenSnowflakes(rows,options).matches;}
