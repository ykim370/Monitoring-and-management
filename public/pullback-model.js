// Long-term regime first, short-term timing second. Heuristic v1; not a calibrated forecast.
export const SETUP_LABELS={ready:'반등 확인 · 조건 충족',watch:'눌림목 · 반등 확인 대기',waiting:'상승 추세 · 눌림목 대기',risk:'추세 / 지지 조건 미충족',unknown:'장기 데이터 부족'};
export function sma(values,period){let sum=0;return values.map((v,i)=>{sum+=v;if(i>=period)sum-=values[i-period];return i>=period-1?sum/period:null;});}
export function wilderRsi(values,period=14){const out=values.map(()=>null);if(values.length<=period)return out;let gain=0,loss=0;for(let i=1;i<=period;i++){const d=values[i]-values[i-1];gain+=Math.max(0,d);loss+=Math.max(0,-d);}gain/=period;loss/=period;const value=()=>gain===0&&loss===0?50:loss===0?100:100-100/(1+gain/loss);out[period]=value();for(let i=period+1;i<values.length;i++){const d=values[i]-values[i-1];gain=(gain*(period-1)+Math.max(0,d))/period;loss=(loss*(period-1)+Math.max(0,-d))/period;out[i]=value();}return out;}
export function pullbackSetup(bars){
 const unavailable={version:1,horizon:21,status:'unknown',eligible:false,trendPass:false,pullbackPass:false,confirmed:false,trend:[],timing:[],confirmation:[],metrics:{},series:{sma50:[],sma200:[],rsi:[]}};
 if(!Array.isArray(bars)||bars.length<221||bars.some((b,i)=>![b.close,b.high,b.low,b.volume].every(Number.isFinite)||b.close<=0||b.low<=0||b.high<b.low||b.close>b.high||b.close<b.low||b.volume<0||!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||(i&&b.date<=bars[i-1].date)))return unavailable;
 const closes=bars.map(b=>b.close),ma50=sma(closes,50),ma200=sma(closes,200),rsi=wilderRsi(closes),last=bars.at(-1),price=last.close;
 let ema=closes[0];for(const c of closes.slice(1))ema+=(c-ema)*2/21;
 const atr=bars.slice(-14).reduce((sum,b,j)=>{const prev=bars[bars.length-15+j].close;return sum+Math.max(b.high-b.low,Math.abs(b.high-prev),Math.abs(b.low-prev));},0)/14;
 if(!(atr>0))return unavailable;
 const fast=ma50.at(-1),slow=ma200.at(-1),peak=Math.max(...closes.slice(-22,-1)),drawdown=(peak-price)/atr,distance=(price-ema)/atr;
 const avgVolume=bars.slice(-21,-1).reduce((a,b)=>a+b.volume,0)/20,volumeRatio=avgVolume>0?last.volume/avgVolume:null;
 const ret126=(price/closes.at(-127)-1)*100;
 const check=(id,label,pass,value)=>({id,label,pass:!!pass,value});
 const trend=[check('above200','종가 > SMA200',price>slow,slow),check('alignment','SMA50 > SMA200',fast>slow,fast),check('slope200','SMA200 상승 · 21세션 전 대비',slow>ma200.at(-22),(slow/ma200.at(-22)-1)*100),check('slope50','SMA50 상승 · 21세션 전 대비',fast>ma50.at(-22),(fast/ma50.at(-22)-1)*100),check('return126','126세션 수익률 > 0%',ret126>0,ret126)];
 const timing=[check('depth','직전 21세션 최고 종가 대비 0.5–3 ATR 조정',drawdown>=.5&&drawdown<=3,drawdown),check('emaZone','EMA20 거리 −0.75 ~ +0.75 ATR',distance>=-.75&&distance<=.75,distance),check('support','종가 ≥ SMA50 − 0.5 ATR',price>=fast-.5*atr,fast-.5*atr),check('rsiZone','RSI14 40–60',rsi.at(-1)>=40&&rsi.at(-1)<=60,rsi.at(-1))];
 const confirmation=[check('reclaim','종가 > 전일 고가',price>bars.at(-2).high,bars.at(-2).high),check('rsiRise','RSI14 전일 대비 상승',rsi.at(-1)>rsi.at(-2),rsi.at(-1)-rsi.at(-2)),check('volume','거래량 ≥ 직전 20세션 평균',volumeRatio!==null&&volumeRatio>=1,volumeRatio)];
 const trendPass=trend.every(t=>t.pass),pullbackPass=timing.every(t=>t.pass),confirmed=confirmation.every(t=>t.pass);
 const status=!trendPass||!timing[2].pass||drawdown>3?'risk':pullbackPass?(confirmed?'ready':'watch'):'waiting';
 return {version:1,horizon:21,status,eligible:status==='ready',trendPass,pullbackPass,confirmed,trend,timing,confirmation,metrics:{price,sma50:fast,sma200:slow,ema20:ema,rsi14:rsi.at(-1),atr,drawdownAtr:drawdown,distanceAtr:distance,volumeRatio,ret126,peak,asOf:last.date},series:{sma50:ma50,sma200:ma200,rsi}};
}
