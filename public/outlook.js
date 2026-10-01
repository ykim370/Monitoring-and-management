import {priceBehind} from './market-session.js';
const num=v=>Number.isFinite(v)?v.toFixed(2):'—';
const usd=v=>'$'+num(v);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// An auditable explanation of observed conditions, not a probability model.
// Long-term qualification always takes precedence over a one-day bounce.
export function shortTermOutlook(stock,now=Date.now()){
 const setup=stock.setup,m=setup?.metrics;
 if(!m||setup.status==='unknown')return {tone:'neutral',summary:'판단 보류 · 장기 가격 이력 부족',up:[],down:[],conditions:[],limits:'최소 221개 유효 일봉을 확보한 뒤 추세와 단기 반등을 함께 평가합니다.'};
 const check=id=>[...setup.trend,...setup.timing,...setup.confirmation].find(c=>c.id===id);
 const pass=id=>check(id)?.pass===true;
 const priceStale=stock.priceTransportStale??stock.transportStale??false;
 const old=priceBehind(stock.asOf,now)||priceStale;
 const up=[],down=[],conditions=[];
 if(setup.trendPass)up.push(`종가 ${usd(m.price)}가 SMA200 ${usd(m.sma200)} 위에 있고 50·200일선이 모두 상승합니다. 장기 상승 추세 안의 조정이므로 추세 재개를 검토할 근거가 있습니다.`);
 else{
  if(!pass('above200'))down.push(`종가 ${usd(m.price)}가 SMA200 ${usd(m.sma200)} 아래입니다. 단기 반등이 나와도 장기 추세 회복이 확인되지 않았고, 이 평균선 부근에서 상승이 막히는지 관찰해야 합니다.`);
  if(!pass('slope50'))down.push(`SMA50은 21세션 전보다 ${num(check('slope50').value)}% 변했습니다. 중기 추세가 상승하지 않아 하루 반등만으로 지속적인 회복을 판단하기 어렵습니다.`);
  if(!pass('alignment')||!pass('slope200'))down.push(`50·200일선의 상승 정렬이 완성되지 않았습니다. 강한 장기 상승 종목의 눌림목이라는 필수 전제가 충족되지 않습니다.`);
  if(pass('slope200')&&pass('return126'))up.push(`SMA200은 21세션 전보다 ${num(check('slope200').value)}%, 126세션 수익률은 ${num(m.ret126)}%입니다. 더 긴 기간의 상승 흔적은 남아 있지만 단기 하락 압력이 해소됐다는 뜻은 아닙니다.`);
 }
 if(setup.confirmed)up.push(`종가가 전일 고가 ${usd(check('reclaim').value)}를 넘었고 RSI14가 ${num(check('rsiRise').value)}포인트 상승했으며 거래량은 직전 20세션 평균의 ${num(m.volumeRatio)}배입니다. 가격·모멘텀·거래량이 함께 반등을 지지합니다. 다음 세션에도 회복 가격을 유지하는지 확인해야 합니다.`);
 else down.push(`반등 확인 ${setup.confirmation.filter(c=>c.pass).length}/3: ${setup.confirmation.filter(c=>!c.pass).map(c=>c.label).join(', ')} 조건이 아직 없습니다. 가격만 잠깐 오르는 움직임과 지속적인 반등을 구별할 근거가 부족합니다.`);
 if(setup.pullbackPass)up.push(`직전 21세션 최고 종가에서 ${num(m.drawdownAtr)} ATR 조정했고 RSI14는 ${num(m.rsi14)}입니다. EMA20 주변과 50일선 지지 범위 안에 있어 설정한 눌림목 조건에 맞습니다. 가격이 싸다는 가치평가를 뜻하지는 않습니다.`);
 else{
  if(!pass('support'))down.push(`종가가 50일선 지지 기준 ${usd(check('support').value)}보다 낮습니다. 단기 매수세가 들어와도 중기 지지 회복 전에는 재하락 위험을 우선 점검합니다.`);
  if(m.distanceAtr>.75||m.rsi14>60)down.push(`EMA20 이격 ${num(m.distanceAtr)} ATR, RSI14 ${num(m.rsi14)}로 눌림목 진입 범위에서 벗어나 있습니다. 상승 추세라도 지금 가격을 추격하면 조정에 노출될 수 있습니다.`);
  else if(m.drawdownAtr>3||m.rsi14<40)down.push(`조정 깊이 ${num(m.drawdownAtr)} ATR, RSI14 ${num(m.rsi14)}입니다. 약세가 깊어져 단순 할인 구간보다 추세 훼손 여부를 먼저 확인해야 합니다.`);
 }
 const recent=stock.bars?.slice(-21)||[],low=recent.length?Math.min(...recent.map(b=>b.low)):NaN,high=recent.length?Math.max(...recent.map(b=>b.high)):NaN;
 if(Number.isFinite(high)&&Number.isFinite(low)){
  conditions.push(`상승 지속 확인: 최근 21세션 고가 ${usd(high)}를 종가로 넘고 평균 이상 거래량이 동반되는지 확인합니다. 이 가격은 관찰 기준이며 도달 예측이 아닙니다.`);
  conditions.push(`하락 경고: EMA20 ${usd(m.ema20)} ${m.price>=m.ema20?'이탈':'회복 실패'}와 최근 21세션 저가 ${usd(low)} 이탈을 관찰합니다. 저가가 깨지면 최근 가격 범위를 벗어나는 추가 약세 신호입니다.`);
 }
 if(!setup.trendPass)conditions.push(`관점 개선 조건: SMA200 ${usd(m.sma200)}와 50일선 지지 기준 ${usd(check('support').value)}를 회복·유지하고, 50일선 상승을 포함한 장기 조건 5개가 모두 충족되어야 기회 후보로 바뀝니다.`);
 else conditions.push('관점 악화 조건: 장기 추세 조건이나 50일선 지지 조건이 하나라도 깨지면 상승 추세 눌림목 판단을 중단합니다.');
 let tone='neutral',summary='방향 혼재 · 추가 확인 필요';
 if(!setup.trendPass||!pass('support')){tone='negative';summary=setup.confirmed?'단기 반등 근거는 있지만 추세 위험 우선':'추세·지지 약화 · 하락 위험 우선';}
 else if(setup.status==='ready'){tone='positive';summary='상승 추세 안에서 반등 확인 · 지속 여부 관찰';}
 else if(setup.status==='watch')summary='상승 추세의 눌림목 · 반등 확인 전';
 else summary='장기 상승 추세 유지 · 현재 눌림목 진입 조건 부족';
 if(old){tone='neutral';summary='최신 판단 보류 · 저장된 가격 기준 설명';}
 return {tone,summary,up,down,conditions,old,limits:`${stock.asOf} 미국 종가 기준의 조건부 해석입니다. 실적 발표·뉴스·시장/섹터 방향은 이 판단에 반영되지 않았습니다. 지표는 서로 연관되어 독립적인 증거의 개수나 상승 확률로 합산하지 않습니다. ${stock.revenueTransportStale?'매출 자료는 갱신 대기 중이며 위 가격 해석과 별개입니다. ':''}수익률을 검증한 예측 모델은 아닙니다.`};
}
export function outlookView(stock,days=21,compact=false,now=Date.now()){
 const o=shortTermOutlook(stock,now);
 if(compact)return `<p class="outlook-compact ${o.tone}">${escape(o.summary)}</p>`;
 const list=(title,rows)=>rows.length?`<h4>${title}</h4><ul>${rows.map(t=>`<li>${escape(t)}</li>`).join('')}</ul>`:'';
 return `<section class="short-outlook" aria-label="단기 방향 해석"><h3>종합 해석 · 앞으로 ${days}거래일</h3><p class="outlook-verdict ${o.tone}">${escape(o.summary)}</p>${o.old?'<p class="negative">아래 근거는 마지막 수신 가격에 대한 설명입니다. 최신 가격 확보 전에는 현재 방향 판단에 사용하지 않습니다.</p>':''}${list('오를 수 있는 근거',o.up)}${list('떨어질 수 있는 근거',o.down)}${list('다음에 확인할 가격과 조건',o.conditions)}<p class="subtle">${escape(o.limits)}</p></section>`;
}
