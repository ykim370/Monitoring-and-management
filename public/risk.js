import {stockMap,isPriceStale} from './engine.js';import {portfolioRisk} from './risk-model.js';
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
let current=[];
export function renderRisk(holdings=current){current=holdings;const target=document.querySelector('#risk-results');if(!target)return;
 const selector=document.querySelector('#risk-symbol');const previous=selector.value;selector.replaceChildren(new Option('All holdings',''),...holdings.map(h=>new Option(h.ticker,h.ticker)));selector.value=previous;
 const shock=Number(document.querySelector('#risk-shock').value),equity=Number(document.querySelector('#risk-equity').value);
 if(!Number.isFinite(shock)||shock<0||shock>100){target.textContent='Enter a decline between 0 and 100%.';return;}
 const r=portfolioRisk(holdings,stockMap,{shock,equity,selected:selector.value?[selector.value]:null});
 target.replaceChildren();const line=text=>{const p=document.createElement('p');p.textContent=text;target.append(p);};
 if(!holdings.length){line('Add holdings to see your portfolio exposure.');return;}
 line(`${r.missing.length?'Known subtotal':'Underlying notional exposure'}: ${money(r.total)} · ${r.rows.length}/${holdings.length} positions priced`);
 if(r.missing.length)line('Missing prices: '+r.missing.join(', ')+'. Portfolio totals and equity ratios are incomplete.');
 if(r.rows.some(x=>x.stale||isPriceStale(stockMap[x.ticker])))line('Contains last-known or old prices. These scenarios are indicative.');
 line(`${shock}% decline in ${selector.value||'all priced holdings'}: ${money(-r.loss)} impact on the priced positions.`);
 if(!r.missing.length&&r.equityMultiple!==null)line(`Exposure / entered account equity: ${r.equityMultiple.toFixed(2)}× · hypothetical equity impact: −${r.equityLoss.toFixed(2)}%`);
 line('Cash, broker margin and financing are not connected. Quantity means underlying units; notional exposure is not cash invested. This models long positions only.');
 const table=document.createElement('table');const header=table.createTHead().insertRow();for(const text of ['Position','Notional USD','Weight']){const th=document.createElement('th');th.textContent=text;header.append(th);}const body=table.createTBody();for(const row of r.rows.sort((a,b)=>b.weight-a.weight)){const tr=body.insertRow();for(const value of [row.ticker,money(row.value),row.weight.toFixed(1)+'%'])tr.insertCell().textContent=value;}target.append(table);
 line('Sector concentration (priced positions): '+r.sectors.map(s=>`${s.sector} ${s.weight.toFixed(1)}%`).join(' · '));
}
for(const id of ['risk-shock','risk-equity','risk-symbol'])document.getElementById(id).addEventListener('input',()=>renderRisk());
