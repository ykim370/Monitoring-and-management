export function portfolioRisk(holdings,stockMap,{shock=5,equity=null,selected=null}={}){
 if(!Number.isFinite(shock)||shock<0||shock>100)throw Error('Shock must be 0–100%.');
 const missing=[],rows=[],sectors={};
 for(const h of holdings){const s=stockMap[h.ticker];if(!s||!Number.isFinite(s.price)){missing.push(h.ticker);continue;}const value=h.qty*s.price;rows.push({ticker:h.ticker,value,sector:s.sector||'Unclassified',stale:!!s.transportStale});sectors[s.sector||'Unclassified']=(sectors[s.sector||'Unclassified']||0)+value;}
 const total=rows.reduce((n,r)=>n+r.value,0),affected=rows.filter(r=>!selected||selected.includes(r.ticker)).reduce((n,r)=>n+r.value,0);
 return {missing,total,rows:rows.map(r=>({...r,weight:total?r.value/total*100:0})),sectors:Object.entries(sectors).map(([sector,value])=>({sector,value,weight:total?value/total*100:0})).sort((a,b)=>b.weight-a.weight),loss:affected*shock/100,equityMultiple:Number.isFinite(equity)&&equity>0?total/equity:null,equityLoss:Number.isFinite(equity)&&equity>0?affected*shock/equity:null};
}
