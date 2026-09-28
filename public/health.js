import {universe} from './engine.js';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>s?new Intl.DateTimeFormat('en-NZ',{timeZone:'Pacific/Auckland',dateStyle:'medium',timeStyle:'short'}).format(new Date(s)):'Never';
export async function renderHealth(){
 const body=document.querySelector('#health-body'),status=document.querySelector('#health-status');
 try{
  const response=await fetch('/api/health',{cache:'no-store'});if(!response.ok)throw Error('unavailable');const data=await response.json();
  if(!data.available)throw Error('unavailable');
  status.textContent='Durable last-known data · timestamps in New Zealand time · fresh data is reused across visits';
  const budget=data.budget;document.querySelector('#api-budget').textContent=budget?`Shared API budget: ${budget.used} / ${budget.limit} request slots used in the last 60 seconds · ${budget.remaining} available${budget.cooldownUntil>Date.now()?' · Provider cooldown active':''}`:'API budget status unavailable';
  const kinds=[['TIME_SERIES_DAILY_ADJUSTED','Prices'],['INCOME_STATEMENT','Revenue'],['EARNINGS_ESTIMATES','Analyst estimates (on demand)']];
  body.innerHTML=universe.flatMap(stock=>kinds.map(([kind,label])=>{
   const row=data.records.find(r=>r.ticker===stock.ticker&&r.kind===kind);
   const job=data.budget?.jobs?.find(j=>j.key===kind+':'+stock.ticker);
   const state=!row?.attempted_at&&kind==='EARNINGS_ESTIMATES'?'Not requested':!row?.succeeded_at?'Missing':row.error_code||row.expires<=Date.now()||(row.as_of&&Date.now()-Date.parse(row.as_of+'T23:59:59Z')>4*86400000)?'Last known / refresh due':'Within refresh window';
   return `<tr><td>${stock.ticker}<small>${label}</small></td><td>${state}<small>${kind==='TIME_SERIES_DAILY_ADJUSTED'?'Price date: '+escape(row?.as_of||'—'):'Financial data'}${job?.lease_until>Date.now()?' · Refresh running':job?.retry_until>Date.now()?' · Retry after '+date(job.retry_until):''}</small></td><td>${date(row?.succeeded_at)}</td><td>${date(row?.attempted_at)}</td><td>${escape(row?.error_code||'—')}<small>${escape(row?.error_message||(!row?.succeeded_at?(kind==='EARNINGS_ESTIMATES'&&!row?.attempted_at?'Loads when you open the estimates chart.':'No successful data saved.'):''))}</small></td></tr>`;
  })).join('');
 }catch{status.textContent='Data health storage is unavailable. New prices may still load; retained history cannot be guaranteed.';body.innerHTML='';}
}
document.querySelector('#health-refresh').addEventListener('click',renderHealth);
renderHealth();
