import {SETUP_LABELS} from './pullback-model.js';
const n=v=>Number.isFinite(v)?v.toFixed(2):'N/A';
export function setupEvidence(setup,compact=false){
 if(!setup||setup.status==='unknown')return '<p class="subtle">최소 221개 일봉이 필요합니다. 장기 추세를 확인하기 전에는 기회 후보에서 제외합니다.</p>';
 const m=setup.metrics;
 const group=(label,checks)=>`<details class="setup-checks" ${compact?'':'open'}><summary>${label} · ${checks.filter(c=>c.pass).length}/${checks.length}</summary>${checks.map(c=>`<div><span class="${c.pass?'positive':'negative'}">${c.pass?'통과':'미충족'}</span><span>${c.label}<small>계산값 ${n(c.value)}</small></span></div>`).join('')}</details>`;
 return `<div class="setup-state ${setup.status==='ready'?'positive':setup.status==='risk'?'negative':'neutral'}">${SETUP_LABELS[setup.status]}</div><p class="subtle">${m.asOf} 종가 · 최대 21거래일 관찰</p>${group('① 장기 추세 · 전부 필수',setup.trend)}${group('② 단기 눌림목 · 전부 필수',setup.timing)}${group('③ 반등 확인 · 전부 필수',setup.confirmation)}${compact?'':`<p class="subtle">확인 조건은 종가 기준입니다. 매수 체결가가 아니며, 다음 세션에 다시 확인해야 합니다. EMA20 $${n(m.ema20)} · SMA50 $${n(m.sma50)} · SMA200 $${n(m.sma200)} · ATR14 $${n(m.atr)}. 21세션 이내 매일 추세·지지 조건을 재평가하세요.</p><p class="subtle">실적 발표·시장/섹터 추세는 이 신호에 포함되지 않습니다. 재무 가치와 실적 일정은 별도 확인하세요. 임계값은 고정 연구 규칙이며 수익률 최적화나 성과 검증을 거치지 않았습니다.</p>`}`;
}
