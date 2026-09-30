import {safe} from './records-client.js';
import {universe} from './engine.js';
const status=document.querySelector('#capital-status'),summary=document.querySelector('#capital-summary'),rows=document.querySelector('#capital-positions'),button=document.querySelector('#capital-refresh');
let busy=false,timer,last=null;
const num=v=>Number.isFinite(v)?v.toLocaleString('en-NZ',{maximumFractionDigits:4}):'N/A';
function render(data){
 last=data;const a=data.account;
 status.textContent=`LIVE · ${a.name} · account ending ${a.idSuffix} · retrieved ${new Date(data.fetchedAt).toLocaleString('en-NZ',{timeZone:'Pacific/Auckland'})} NZ · ${data.positions.length} open positions`;
 summary.innerHTML=[['Balance',a.balance],['Available',a.available],['Open profit / loss',a.profitLoss],['Deposit / margin',a.deposit]].map(([label,value])=>`<div class="summary-card"><div class="summary-label">${label}</div><div class="summary-value capital-value">${num(value)} <small>${safe(a.currency)}</small></div></div>`).join('');
 rows.innerHTML=data.positions.length?data.positions.map(p=>{const match=universe.find(s=>s.ticker===p.epic);return `<tr><td>${match?`<button class="ticker-button" data-stock="${safe(match.ticker)}">${safe(p.name||p.epic)}</button>`:safe(p.name||p.epic)}<small>${safe(p.epic)} · deal …${safe(p.dealId.slice(-6))}</small></td><td>${safe(p.direction)}</td><td>${num(p.size)}<small>CFD units</small></td><td>${num(p.entry)}<small>${safe(p.currency)}</small></td><td>${num(p.bid)} / ${num(p.offer)}<small>${safe(p.marketStatus)} · ${safe(p.quoteTime)}</small></td><td>${num(p.profitLoss)}<small>${safe(p.currency)} · broker value</small></td><td>${num(p.stop)} / ${num(p.limit)}</td></tr>`;}).join(''):'<tr><td colspan="7" class="empty-state">Capital.com reports no open positions in this account.</td></tr>';
}
async function refresh(){if(busy)return;busy=true;button.disabled=true;clearTimeout(timer);status.textContent='Reading the live Capital.com account…';try{const r=await fetch('/api/capital',{cache:'no-store',signal:AbortSignal.timeout(90000)}),d=await r.json();if(!r.ok)throw Error(d.error?.message||'The account could not be refreshed.');render(d);}catch(e){status.textContent=(last?`Update failed. Last snapshot: ${new Date(last.fetchedAt).toLocaleString('en-NZ')} — values below are stale. `:'Not connected. ')+e.message;if(!last){summary.innerHTML='';rows.innerHTML='<tr><td colspan="7" class="empty-state">Account data is unavailable. No balances or positions have been estimated.</td></tr>';}}finally{busy=false;button.disabled=false;if(!document.hidden)timer=setTimeout(refresh,60000);}}
button.addEventListener('click',refresh);
document.addEventListener('visibilitychange',()=>{clearTimeout(timer);if(!document.hidden)refresh();});
refresh();
