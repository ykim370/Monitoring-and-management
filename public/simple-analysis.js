import {entryPlan} from './entry-plan.js';
import {priceBehind} from './market-session.js';
const money=v=>Number.isFinite(v)?'$'+v.toFixed(2):'—';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function simpleAnalysis(stock,days=21,now=Date.now()){
 const setup=stock.setup,m=setup?.metrics||{},plan=entryPlan(stock,days,now);
 const missing=!setup||setup.status==='unknown',stale=priceBehind(stock.asOf,now)||(stock.priceTransportStale??stock.transportStale??false);
 const active=!missing&&!stale;
 let title='기다리기',note='매수 조건이 아직 부족합니다.',tone='neutral';
 if(missing){title='판단 보류';note='장기 추세를 확인할 가격 이력이 부족합니다.';}
 else if(stale){title='업데이트 대기';note='최신 종가가 없어 매수·매도 가격을 표시하지 않습니다.';}
 else if(plan.status==='conditional'){title='조건부 매수 관찰';note='상승 추세와 반등 조건 충족. 다음 거래일에도 확인하세요.';tone='positive';}
 else if(!setup.trendPass){note='반등이 있어도 장기 상승 추세가 확인될 때까지 기다립니다.';}
 else if(plan.status==='avoid'){note='첫 목표까지 기대 이익이 손절 위험에 비해 작습니다.';}
 else if(plan.status==='pending'){note='장기 추세는 양호하지만 반등 확인이 더 필요합니다.';}
 else{note='상승 추세 안에서 더 좋은 눌림목을 기다립니다.';}
 const checks=id=>[...(setup?.trend||[]),...(setup?.timing||[]),...(setup?.confirmation||[])].find(c=>c.id===id);
 const reasons=missing?[]:[
 {label:'큰 방향',good:setup.trendPass,text:setup.trendPass?'가격이 200일 평균 위이고 50·200일 평균도 상승 중입니다.':`장기 조건 ${setup.trend.filter(c=>c.pass).length}/5 충족. ${checks('above200')?.pass?'가격은 200일 평균 위지만 다른 추세 조건이 부족합니다.':`가격 ${money(m.price)}가 200일 평균 ${money(m.sma200)} 아래입니다.`}`},
 {label:'매수 위치',good:setup.pullbackPass,text:setup.pullbackPass?`20일 EMA(최근 가격에 비중을 둔 평균) ${money(m.ema20)} 근처의 조정 구간입니다.`:!checks('support')?.pass?`지지 기준 ${money(checks('support')?.value)} 아래여서 회복을 먼저 확인합니다.`:'가격·조정 폭·RSI 조건이 모두 맞는 눌림목은 아닙니다.'},
 {label:'반등 힘',good:setup.confirmed,text:setup.confirmed?`전일 고가 돌파 + RSI 상승 + 평균 대비 거래량 ${m.volumeRatio.toFixed(2)}배. 반등 근거가 있습니다.`:`반등 조건 ${setup.confirmation.filter(c=>c.pass).length}/3 충족. 가격 회복·RSI 상승·거래량 확인이 더 필요합니다.`}
 ];
 const shown=active&&plan.levels.length>0;
 const buy=shown?plan.levels[0]:null,stop=shown?plan.levels[1]:null,t1=shown?plan.levels[2]:null,t2=shown?plan.levels[3]:null;
 const rows=[['매수 구간',buy?money(buy.value)+'–'+money(buy.upper):'—',buy?(plan.status==='conditional'?'최근 일봉 고가 위. 상단을 넘으면 추격하지 않기.':'관찰용 가격 · 아직 매수 조건 미충족'):'조건 충족 후 표시'],['손절 기준',stop?money(stop.value):'—',stop?'최근 5거래일 저점 아래. 이탈하면 계획 무효.':'유효한 진입 계획이 있을 때 표시'],['1차 매도',t1?money(t1.value):'—',t1?'이전 21거래일 고점. 저항에 막히는지 확인.':'유효한 진입 계획이 있을 때 표시'],['2차 매도',t2?money(t2.value):'—',t2?'1차 고점 돌파 확인 후 보는 63거래일 고점.':active?'별도 목표 없음':'데이터 확보 후 표시']];
 return `<section class="simple-analysis" aria-label="쉬운 기술 분석"><header><span class="subtle">${days}거래일 관찰 · ${escape(stock.asOf||'미수신')} 미국 종가</span><h3 class="${tone}">${title}</h3><p>${note}</p></header><h4>매수 · 매도 가격</h4><dl class="simple-levels">${rows.map(([label,value,why])=>`<div><dt>${label}</dt><dd><strong>${value}</strong><small>${why}</small></dd></div>`).join('')}</dl>${shown?`<p class="simple-rr">손익비 ${plan.rr.toFixed(2)} : 1 <small>진입 상단 기준 · 위험 1 대비 첫 목표 이익 · 비용 제외</small></p>`:''}${active&&!shown&&plan.exitNote?`<details class="holder-note"><summary>이미 보유 중이라면?</summary><p>${plan.exitNote}</p></details>`:''}<h4>핵심 근거 3가지${stale&&!missing?' · 이전 종가 기준':''}</h4>${missing?'<p>가격 이력 확보 후 표시합니다.</p>':`<ol class="simple-reasons">${reasons.map(r=>`<li><strong>${r.label} <span class="${r.good?'positive':'neutral'}">${r.good?'충족':'미충족'}</span></strong><p>${r.text}</p></li>`).join('')}</ol>`}<p class="subtle">종가 기반 조건부 분석 · 실적·뉴스 미반영 · 수익 보장 없음</p></section>`;
}
