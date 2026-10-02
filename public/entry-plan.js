import {priceBehind} from './market-session.js';
const money=v=>'$'+v.toFixed(2),round=v=>Math.round(v*100)/100;
// Long-only daily-chart research plan. Fixed buffers and R/R gate are heuristics,
// not optimized parameters. No broker orders or position sizing are produced.
export function entryPlan(stock,days=21,now=Date.now()){
 const s=stock.setup,m=s?.metrics;
 const base={days,asOf:stock.asOf,levels:[],status:'wait',reason:'장기 추세를 확인할 가격 이력이 부족합니다.'};
 if(!s||s.status==='unknown')return base;
 if(priceBehind(stock.asOf,now)||(stock.priceTransportStale??stock.transportStale))return {...base,reason:'최신 가격 수신 전에는 진입·청산 가격을 제시하지 않습니다.'};
 const exitLow=round(Math.min(...stock.bars.slice(-5).map(b=>b.low))-.25*m.atr);
 const overhead=[m.sma50,m.sma200,Math.max(...stock.bars.slice(-22,-1).map(b=>b.high))].filter(v=>v>m.price).sort((a,b)=>a-b)[0];
 base.exitNote=`보유 중이라면: 최근 5세션 저가 아래 ${money(exitLow)}를 이탈하면 청산을 재검토합니다.${overhead?' 반등 시 '+money(overhead)+' 부근의 평균선/최근 고점 저항에서 회복 실패 여부를 확인하세요.':''} 개인 진입가·수량은 반영하지 않은 차트 기준입니다.`;
 if(!s.trendPass)return {...base,reason:`매수 대기. 종가가 SMA200 ${money(m.sma200)} 위에 있고 50·200일선 상승 등 장기 조건 5개를 모두 충족해야 합니다. 하루 반등만으로 진입하지 않습니다.`};
 if(!s.pullbackPass)return {...base,reason:`매수 대기. EMA20 ${money(m.ema20)} 주변의 눌림목과 SMA50 지지 조건이 아직 맞지 않습니다.`};
 const bars=stock.bars,last=bars.at(-1),atr=m.atr;
 // Trigger above the signal candle; stop below the recent pullback low.
 const trigger=round(last.high+.1*atr),maxEntry=round(trigger+.25*atr);
 const swingLow=Math.min(...bars.slice(-5).map(b=>b.low)),stop=round(swingLow-.25*atr);
 const high21=round(Math.max(...bars.slice(-22,-1).map(b=>b.high)));
 const high63=round(Math.max(...bars.slice(-64,-1).map(b=>b.high)));
 const risk=maxEntry-stop;
 if(!(stop>0&&risk>0&&high21>maxEntry))return {...base,reason:'직전 21세션 고점까지 상승 여유가 부족합니다. 새 눌림목이나 돌파 후 지지 확인을 기다립니다.'};
 const rr=(high21-maxEntry)/risk;
 const levels=[{label:'매수 관찰 구간',value:trigger,upper:maxEntry,reason:`최근 일봉 고가 ${money(last.high)} 위 0.1 ATR부터 관찰. 상단은 추가 0.25 ATR로 추격 제한.`},
 {label:'손절 / 무효화',value:stop,reason:`최근 5세션 저가 ${money(swingLow)} 아래 0.25 ATR. 눌림목 저점이 깨지면 진입 논리 무효.`},
 {label:'1차 매도 관찰',value:high21,reason:'직전 21세션 고점 재시험. 돌파 유지 실패 시 일부 이익 실현을 검토.'}];
 if(high63>high21+.25*atr)levels.push({label:'2차 매도 관찰',value:high63,reason:'1차 고점을 종가·평균 이상 거래량으로 돌파한 경우에만 직전 63세션 고점을 관찰.'});
 const status=rr<1.5?'avoid':!s.confirmed?'pending':'conditional';
 return {...base,status,levels,rr,trigger,maxEntry,stop,reason:rr<1.5?`매수 대기 · 상단 진입 기준 1차 목표 손익비 ${rr.toFixed(2)}R로 최소 1.50R 미달.`:!s.confirmed?'반등 확인 대기 · 전일 고가 회복, RSI 상승, 평균 이상 거래량이 모두 필요합니다.':'조건부 진입 관찰 · 추세·눌림목·반등 조건 충족. 다음 세션에 다시 확인하세요.'};
}
export function entryPlanView(stock,days=21,now=Date.now()){
 const p=entryPlan(stock,days,now),has=p.levels.length>0;
 return `<section class="entry-plan" aria-label="매수 매도 계획"><h3>매수 · 매도 계획</h3><p class="${p.status==='conditional'?'positive':'neutral'}"><strong>${p.reason}</strong></p>${!has&&p.exitNote?`<p>${p.exitNote}</p>`:''}${has?`<dl>${p.levels.map(l=>`<div><dt>${l.label}</dt><dd><strong>${money(l.value)}${l.upper?'–'+money(l.upper):''}</strong><small>${l.reason}</small></dd></div>`).join('')}</dl><p class="subtle">진입 상단 기준 1차 손익비 ${p.rr.toFixed(2)}R · 가격 간 거리 기준, 비용 제외. 상단 초과 갭이면 추격하지 않고 재계산합니다. 손절선 이하에서는 계획 취소; 실제 체결은 갭·슬리피지로 달라질 수 있습니다.</p><p class="subtle">${days}거래일 안에 목표에 닿지 않으면 청산 여부를 재평가합니다. 1차 돌파 실패나 장기 조건 훼손 시 기간보다 먼저 재평가합니다.</p>`:''}<p class="subtle">${p.asOf||'—'} 미국 종가 기반 · 장기 상승 종목의 매수 연구 계획 · 자동 주문 아님. 실적·뉴스 미반영. 버퍼와 1.50R 기준은 성과 검증 전 고정 규칙입니다.</p></section>`;
}
