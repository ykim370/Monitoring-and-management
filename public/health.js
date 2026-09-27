import {universe} from './engine.js';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>s?new Intl.DateTimeFormat('en-NZ',{timeZone:'Pacific/Auckland',dateStyle:'medium',timeStyle:'short'}).format(new Date(s)):'Never';
export async function renderHealth(){
 const body=document.querySelector('#health-body'),status=document.querySelector('#health-status');
 try{
  const response=await fetch('/api/health',{cache:'no-store'});if(!response.ok)throw Error('unavailable');const data=await response.json();
  if(!data.available)throw Error('unavailable');
  status.textContent='Durable last-known data · timestamps in New Zealand time · refresh runs while this page is open';
  const kinds=[['TIME_SERIES_DAILY_ADJUSTED','Prices'],['INCOME_STATEMENT','Revenue'],['EARNINGS_ESTIMATES','Analyst estimates (on demand)']];
  body.innerHTML=universe.flatMap(stock=>kinds.map(([kind,label])=>{
   const row=data.records.find(r=>r.ticker===stock.ticker&&r.kind===kind);
   const state=!row?.succeeded_at?'Missing':row.error_code||row.expires<=Date.now()||(row.as_of&&Date.now()-Date.parse(row.as_of+'T23:59:59Z')>4*86400000)?'Last known / refresh due':'Within refresh window';
   return `<tr><td>${stock.ticker}<small>${label}</small></td><td>${state}<small>${escape(row?.as_of||'—')} · price date</small></td><td>${date(row?.succeeded_at)}</td><td>${date(row?.attempted_at)}</td><td>${escape(row?.error_code||'—')}<small>${escape(row?.error_message||(!row?.succeeded_at?'No successful data saved.':''))}</small></td></tr>`;
  })).join('');
 }catch{status.textContent='Data health storage is unavailable. New prices may still load; retained history cannot be guaranteed.';body.innerHTML='';}
}
document.querySelector('#health-refresh').addEventListener('click',renderHealth);
renderHealth();
