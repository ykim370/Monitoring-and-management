import {fundamentalTasks,collectFundamentals} from './snowflake-refresh.js';
import {AXES,screenSnowflakes} from './snowflake-model.js';
import {safe} from './records-client.js';
const $=s=>document.querySelector(s),root=$('#snowflake'),minimum=Object.fromEntries(AXES.map(a=>[a,0]));
let stocks=[],busy=false,timer,opened=false,drag=null,budget=null,cursor=0;
const point=(i,v,r=112)=>{const angle=-Math.PI/2+i*2*Math.PI/5;return [200+Math.cos(angle)*r*v/5,200+Math.sin(angle)*r*v/5];};
const date=x=>x?new Intl.DateTimeFormat('en-NZ',{timeZone:'Pacific/Auckland',dateStyle:'medium',timeStyle:'short'}).format(new Date(x)):'Never';
function radar(values,interactive=false){
 const complete=values.every(v=>v!==null),dots=values.map((v,i)=>v===null?'':`<circle cx="${point(i,interactive&&v===0?.8:v)[0]}" cy="${point(i,interactive&&v===0?.8:v)[1]}" r="${interactive?9:6}" ${interactive?`data-axis="${i}" tabindex="0" role="slider" aria-label="Minimum ${AXES[i]} score" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${v}"`:''}><title>${AXES[i]} ${v}/5</title></circle>`).join('');
 return `<svg viewBox="0 0 400 400" ${interactive?'aria-label="Minimum scores. Drag a handle or use arrow keys."':'role="img" aria-label="'+safe(AXES.map((a,i)=>a+': '+(values[i]??'unavailable')).join(', '))+'"'}>${[1,2,3,4,5].map(v=>`<circle class="snow-ring" cx="200" cy="200" r="${112*v/5}"/>`).join('')}${AXES.map((a,i)=>`<line class="snow-spoke" x1="200" y1="200" x2="${point(i,5)[0]}" y2="${point(i,5)[1]}"/>`).join('')}${complete?`<polygon class="snow-shape" points="${values.map((v,i)=>point(i,v).join(',')).join(' ')}"/>`:''}${dots}${interactive?AXES.map((a,i)=>`<text class="snow-axis-label" x="${point(i,5,165)[0]}" y="${point(i,5,165)[1]}">${a.toUpperCase()}<tspan x="${point(i,5,165)[0]}" dy="20">${values[i]} / 5</tspan></text>`).join(''):''}</svg>`;
}
function renderFilter(){ $('#snow-filter-chart').innerHTML=radar(AXES.map(a=>minimum[a]),true);for(const a of AXES){$(`[data-snow-range="${a}"]`).value=minimum[a];$(`[data-snow-value="${a}"]`).textContent=minimum[a]+'/5';}}
function options(){return {query:$('#snow-query').value,industry:$('#snow-industry').value,minimum,complete:$('#snow-complete').checked,sort:$('#snow-sort').value};}
const number=x=>x===null||x===undefined?'—':new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(x);
function renderResults(){
 const groups=screenSnowflakes(stocks,options()),rows=groups.matches,complete=stocks.filter(s=>s.complete).length;
 const active=AXES.filter(a=>minimum[a]>0);
 $('#snow-filter-summary').textContent=active.length?'Required: '+active.map(a=>a+' ≥ '+minimum[a]+'/5').join(' AND '):'No minimum scores set — showing all stocks in this scope.';
 $('#snow-pending').innerHTML=groups.pending.length?`<summary>${groups.pending.length} stocks still need data — not rejected by your minimums</summary><p>These are not confirmed matches. Missing or expired inputs prevent a decision${options().complete?'; “Only complete snowflakes” also requires every check to be available':''}.</p><div class="snow-pending-list">${groups.pending.map(r=>`<button class="secondary" data-snow-detail="${r.ticker}">${r.ticker} · waiting for ${safe(r.filterAssessment.axes.join(', '))}</button>`).join('')}</div>`:'';
 $('#snow-count').textContent=`${rows.length} confirmed matches · ${groups.pending.length} awaiting data · ${groups.below.length} below minimums · ${complete}/${stocks.length} complete snowflakes`;
 $('#snow-results').innerHTML=rows.length?rows.map(r=>`<tr><td><button class="snow-stock" data-snow-detail="${r.ticker}" aria-label="View ${r.ticker} fundamental evidence"><span class="snow-mini">${radar(AXES.map(a=>r.axes[a].score))}</span><span><b>${r.ticker}</b><small>${safe(r.name)}</small></span></button></td><td>${safe(r.industry)}<small>${r.complete?'Complete snowflake':'Partial / unavailable data'}</small></td>${AXES.map(a=>`<td class="snow-score">${r.axes[a].score===null?(r.axes[a].known?`<span title="${r.axes[a].known} of 5 checks available">≥${r.axes[a].passed}<small>/ 5 · partial</small></span>`:'<span class="subtle">N/A</span>'):r.axes[a].score+'<small>/ 5</small>'}</td>`).join('')}<td><button class="secondary" data-stock="${r.ticker}">Charts</button></td></tr>`).join(''):`<tr><td colspan="8" class="empty-state">${groups.pending.length?'No confirmed matches yet. '+groups.pending.length+' stocks are awaiting enough data to evaluate your minimums.':'No stocks in the evaluated scope meet every minimum. Stocks with higher scores are included automatically.'}</td></tr>`;
}
function showDetail(ticker){const r=stocks.find(s=>s.ticker===ticker);if(!r)return;
 $('#snow-detail-title').textContent=ticker+' · '+r.name;
 $('#snow-detail-content').innerHTML=`<div class="snow-detail-top"><div class="snow-detail-chart">${radar(AXES.map(a=>r.axes[a].score))}</div><div><p>${safe(r.industry)}</p><p>${safe(r.description||'Company description has not been loaded.')}</p><p>Last daily close: ${number(r.price)} USD · ${safe(r.priceDate||'Unavailable')}</p><button class="secondary" data-stock="${r.ticker}" data-close="snow-detail">Open trading charts</button></div></div><p class="subtle">Five fixed checks per axis. Ratio inputs use decimals (0.10 = 10%). A partial score is a proven lower bound: ≥2/5 means two checks already passed, even if others are unavailable. N/A means no checks can be evaluated. This is Swing Desk’s own screening model, not Simply Wall St’s scoring or a forecast of returns.</p>${AXES.map(a=>`<details class="snow-evidence" open><summary>${a} · ${r.axes[a].score??(r.axes[a].known?'≥'+r.axes[a].passed:'N/A')} / 5 · ${r.axes[a].known} of 5 checks available</summary>${a==='Future'?`<p>Forecast fiscal years: ${safe(r.forecastPeriod||'Two consecutive future annual estimates unavailable')}. Revenue and EPS comparisons require positive bases and analyst coverage.</p>`:''}<ul>${r.axes[a].tests.map(t=>`<li><b>${t.pass===null?'Unavailable':t.pass?'Pass':'Not met'}</b><span>${safe(t.label)}<small>Input: ${number(t.value)} ${safe(t.note||'')} · ${safe(t.source)}</small></span></li>`).join('')}</ul></details>`).join('')}<details class="snow-evidence"><summary>Source dates and availability</summary>${['OVERVIEW','BALANCE_SHEET','CASH_FLOW','EARNINGS_ESTIMATES'].map(k=>{const s=r.sources[k];return `<p><b>${k}</b> · ${s?.fresh?'Within refresh window':'Missing, expired or failed refresh'}<br>Retrieved: ${date(s?.fetchedAt)} · Fiscal date: ${safe(s?.value?.date||s?.value?.LatestQuarter||'See forecast periods')}<br>${safe(s?.message||'')}</p>`;}).join('')}<p>Overview metrics need a latest quarter within 200 days; annual statements must be within 550 days. Ratios are not sector-adjusted. Financial health is based on annual reports, not live account balances.</p></details>`;
 $('#snow-detail').showModal();
}
async function snapshot(){const r=await fetch('/api/screener',{cache:'no-store'}),d=await r.json();if(!r.ok||!d.available)throw Error('Stored fundamentals are unavailable.');stocks=d.stocks;budget=d.budget;const prior=$('#snow-industry').value;$('#snow-industry').innerHTML='<option value="">All industries</option>'+[...new Set(stocks.map(r=>r.industry))].sort().map(s=>`<option value="${safe(s)}">${safe(s)}</option>`).join('');$('#snow-industry').value=prior;renderResults();}
function status(message){$('#snow-status').textContent=message;}
async function refresh(){
 if(busy||document.hidden)return;clearTimeout(timer);busy=true;$('#snow-refresh').disabled=true;
 document.documentElement.dataset.fundamentalsLoading='true';let retryMs=60000;
 try{
  await snapshot();
  if(budget?.cooldownUntil>Date.now()){
   retryMs=Math.max(1000,budget.cooldownUntil-Date.now()+1000);
   status('Alpha Vantage requested a pause. Collection resumes after '+date(budget.cooldownUntil)+'. Stocks awaiting data are listed separately.');return;
  }
  const tasks=fundamentalTasks(stocks,budget?.jobs);
  const result=await collectFundamentals(tasks,{start:tasks.length?cursor%tasks.length:0,visible:()=>!document.hidden,
   request:async task=>{const response=await fetch(`/api/${task.path}?symbol=${encodeURIComponent(task.ticker)}`,{signal:AbortSignal.timeout(40000)});return {ok:response.ok,data:await response.json()};},
   onProgress:async ({done,failed})=>{status(`Collecting fundamentals · ${done}/${tasks.length} due sources · ${failed} waiting or unavailable. Minimums include equal or higher scores.`);if(done%2===0)await snapshot().catch(()=>{});}
  });cursor=result.next;
  await snapshot();status(result.throttled?'API budget is resting. Saved results stay visible; collection resumes with the next source in 60 seconds.':`${stocks.filter(s=>s.complete).length}/24 complete snowflakes · ${result.failed?result.failed+' sources waiting or unavailable · ':''}Next check in 60 seconds while visible.`);
 }catch{status('The stored-data status could not be refreshed. Existing results remain visible; retry in 60 seconds.');}
 finally{delete document.documentElement.dataset.fundamentalsLoading;busy=false;$('#snow-refresh').disabled=false;if(opened&&!document.hidden)timer=setTimeout(refresh,retryMs);}
}
$('#snow-ranges').innerHTML=AXES.map(a=>`<label>${a}<input type="range" min="0" max="5" step="1" value="0" aria-label="${a} minimum" data-snow-range="${a}"><output data-snow-value="${a}">0/5</output></label>`).join('');
root.addEventListener('input',e=>{if(e.target.dataset.snowRange){minimum[e.target.dataset.snowRange]=Number(e.target.value);renderFilter();}renderResults();});
root.addEventListener('change',renderResults);
$('#snow-reset').onclick=()=>{AXES.forEach(a=>minimum[a]=0);$('#snow-query').value='';$('#snow-industry').value='';$('#snow-complete').checked=false;$('#snow-sort').value='ticker';renderFilter();renderResults();};
root.addEventListener('click',e=>{const t=e.target.closest('[data-snow-detail]');if(t)showDetail(t.dataset.snowDetail);const preset=e.target.closest('[data-snow-preset]');if(preset){AXES.forEach(a=>minimum[a]=0);Object.assign(minimum,JSON.parse(preset.dataset.snowPreset));renderFilter();renderResults();}});
const chart=$('#snow-filter-chart');
chart.addEventListener('pointerdown',e=>{const h=e.target.closest('[data-axis]');if(!h)return;drag=Number(h.dataset.axis);chart.setPointerCapture(e.pointerId);e.preventDefault();});
chart.addEventListener('pointermove',e=>{if(drag===null)return;const box=chart.querySelector('svg').getBoundingClientRect(),x=(e.clientX-box.left)*400/box.width-200,y=(e.clientY-box.top)*400/box.height-200,angle=-Math.PI/2+drag*2*Math.PI/5;minimum[AXES[drag]]=Math.max(0,Math.min(5,Math.round((x*Math.cos(angle)+y*Math.sin(angle))/112*5)));renderFilter();renderResults();});
chart.addEventListener('pointerup',()=>drag=null);chart.addEventListener('pointercancel',()=>drag=null);
chart.addEventListener('keydown',e=>{const h=e.target.closest('[data-axis]');if(!h||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const i=Number(h.dataset.axis),a=AXES[i];minimum[a]=e.key==='Home'?0:e.key==='End'?5:Math.max(0,Math.min(5,minimum[a]+(['ArrowUp','ArrowRight'].includes(e.key)?1:-1)));renderFilter();chart.querySelector(`[data-axis="${i}"]`).focus();renderResults();});
$('#snow-refresh').onclick=()=>{opened=true;refresh();};
$('#snow-detail-close').onclick=()=>$('#snow-detail').close();
renderFilter();snapshot().catch(()=>status('Open the screener to collect fundamentals.'));
new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&!opened){opened=true;refresh();}},{threshold:.1}).observe(root);
document.addEventListener('visibilitychange',()=>{clearTimeout(timer);if(!document.hidden&&opened)refresh();});
