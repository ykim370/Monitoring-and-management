// Nasdaq search is independent of the small automatically refreshed watchlist.
export function setupStockLookup({universe,getSelected,onSelect}){
 const select=document.querySelector('#stock-select'),host=document.createElement('div');
 host.className='stock-lookup';
 host.innerHTML='<label for="stock-lookup">티커 또는 회사명</label><input id="stock-lookup" type="search" autocomplete="off" spellcheck="false" placeholder="TSLA 또는 Tesla" aria-describedby="stock-lookup-message stock-lookup-scope"><small id="stock-lookup-scope">나스닥 전체 상장 종목 검색 · 선택 후 데이터 조회</small><div id="stock-lookup-results" aria-label="종목 검색 결과"></div><small id="stock-lookup-message" role="status"></small>';
 select.before(host);select.setAttribute('aria-label','지원 종목 목록');
 const input=host.querySelector('input'),results=host.querySelector('#stock-lookup-results'),message=host.querySelector('[role=status]');
 const known=new Map(universe.map(s=>[s.ticker,s]));let revision=0,timer,controller;
 const text=s=>s.ticker+' — '+s.name;
 const exact=(items,q)=>items.find(s=>[s.ticker,s.name,text(s)].some(v=>v.toLowerCase()===q.trim().toLowerCase()));
 function cancel(){revision++;clearTimeout(timer);controller?.abort();}
 function restore(){const meta=getSelected();input.value=text(meta);results.replaceChildren();message.textContent='';}
 function choose(meta){cancel();known.set(meta.ticker,meta);if(![...select.options].some(o=>o.value===meta.ticker))select.add(new Option(meta.ticker,meta.ticker));onSelect(meta);restore();}
 async function search(commit=false){
  cancel();const current=revision,q=input.value.trim();results.replaceChildren();
  if(!q){message.textContent='티커 또는 회사명을 입력하세요.';return;}
  const local=exact([...known.values()],q);
  if(commit&&local){choose(local);return;}
  controller=new AbortController();message.textContent='나스닥 종목 검색 중…';
  try{
   const response=await fetch('/api/symbols?q='+encodeURIComponent(q),{signal:controller.signal});
   if(!response.ok)throw Error('search');const data=await response.json();
   if(current!==revision)return;
   if(!Array.isArray(data.items))throw Error('search');
   const match=exact(data.items,q);
   if(commit&&(match||data.total===1)){choose(match||data.items[0]);return;}
   for(const meta of data.items){
    known.set(meta.ticker,meta);const button=document.createElement('button');button.type='button';button.className='stock-lookup-result';button.textContent=text(meta);button.addEventListener('mousedown',e=>e.preventDefault());button.addEventListener('click',()=>choose(meta));results.append(button);
   }
   message.textContent=(data.total?`${data.total}개 종목 일치${data.total>30?' · 상위 30개 표시':''}. ${data.total>1?'여러 종목이 일치합니다. ':''}목록에서 선택하세요.`:'나스닥 상장 목록에서 찾을 수 없습니다. 티커나 영문 회사명을 확인하세요.')+(data.stale?` · 최신 목록 연결 지연: ${data.asOf} 기준 저장 목록 사용`:'');
  }catch(error){if(current===revision&&error.name!=='AbortError')message.textContent='검색 연결에 실패했습니다. 다시 입력하거나 Enter로 재시도하세요.';}
 }
 input.addEventListener('focus',()=>input.select());
 input.addEventListener('input',()=>{cancel();results.replaceChildren();message.textContent='';timer=setTimeout(()=>search(),250);});
 input.addEventListener('change',()=>{const q=input.value;setTimeout(()=>{if(input.value===q&&!results.contains(document.activeElement))search(true);},0);});
 input.addEventListener('keydown',event=>{
  if(event.isComposing)return;
  if(event.key==='Enter'){event.preventDefault();search(true);}
  if(event.key==='Escape'){event.preventDefault();cancel();restore();input.blur();}
  if(event.key==='ArrowDown'&&results.firstElementChild){event.preventDefault();results.firstElementChild.focus();}
 });
 results.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();cancel();restore();input.focus();}});
 return {sync(){if(document.activeElement!==input&&!host.contains(document.activeElement))restore();}};
}
