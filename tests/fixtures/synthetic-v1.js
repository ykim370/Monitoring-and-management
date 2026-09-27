export const AS_OF = '2026-09-18';
export const universe = [
 ['NVDA','NVIDIA','반도체',184,1,11],['AVGO','Broadcom','반도체',352,.85,14],['TTMI','TTM Technologies','전자부품',76,.75,17],['AAOI','Applied Optoelectronics','광통신',42,.7,20],['CRDO','Credo Technology','광통신',128,.95,23],['TSM','TSMC','반도체',242,.65,26],['AMD','Advanced Micro Devices','반도체',166,.6,29],['MSFT','Microsoft','소프트웨어',512,.55,32],['GOOGL','Alphabet','인터넷',213,.5,35],['AMZN','Amazon','커머스',232,.45,38],['META','Meta Platforms','인터넷',714,0.4,41],['ANET','Arista Networks','네트워크',136,0.2,44],
 ['INTC','Intel','반도체',26,-.85,47],['SNAP','Snap','인터넷',8.6,-.7,50],['RIVN','Rivian','자동차',14,-.95,53],['LCID','Lucid Group','자동차',4.2,-.6,56],['NIO','NIO','자동차',6.4,-.9,59],['BIDU','Baidu','인터넷',89,-.8,62],['PINS','Pinterest','인터넷',28,-.5,65],['ETSY','Etsy','커머스',51,-.75,68],['ROKU','Roku','미디어',72,-.65,71],['U','Unity Software','소프트웨어',23,-.55,74],['SHOP','Shopify','커머스',132,-0.2,77],['PLTR','Palantir','소프트웨어',156,0,80]
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
const last=a=>a[a.length-1];
function rng(seed){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function dates(n){const d=new Date(AS_OF+'T12:00:00Z'),out=[];while(out.length<n){if(d.getUTCDay()!==0&&d.getUTCDay()!==6)out.unshift(d.toISOString().slice(0,10));d.setUTCDate(d.getUTCDate()-1);}return out;}
export function ema(arr,n){const k=2/(n+1);return arr.reduce((out,v,i)=>{out.push(i?v*k+out[i-1]*(1-k):v);return out;},[]);}
function regression(points){const mx=mean(points.map(p=>p.x)),my=mean(points.map(p=>p.y));const den=points.reduce((s,p)=>s+(p.x-mx)**2,0);const m=den?points.reduce((s,p)=>s+(p.x-mx)*(p.y-my),0)/den:0;return {m,b:my-m*mx,points};}
export function triangle(bars){const n=bars.length,peaks=[],troughs=[];for(let i=n-44;i<n-4;i++){if(bars[i].high>bars[i-1].high&&bars[i].high>bars[i+1].high&&bars[i].high>bars[i-2].high&&bars[i].high>bars[i+2].high)peaks.push({x:i,y:bars[i].high});if(bars[i].low<bars[i-1].low&&bars[i].low<bars[i+1].low&&bars[i].low<bars[i-2].low&&bars[i].low<bars[i+2].low)troughs.push({x:i,y:bars[i].low});}
 if(peaks.length<2||troughs.length<2)return null;
 const high=regression(peaks),low=regression(troughs),start=n-44,end=n-1,upper=high.m*end+high.b,lower=low.m*end+low.b,initial=high.m*start+high.b-low.m*start-low.b;
 if(!(high.m<0&&low.m>0&&upper>lower&&(upper-lower)<initial*.8))return null;
 const ratio=last(bars).volume/mean(bars.slice(-21,-1).map(b=>b.volume));const close=last(bars).close;
 const direction=close>upper?1:close<lower?-1:0;
 return {high,low,start,end,upper,lower,ratio,direction,confirmed:direction!==0&&ratio>=1.3};
}
export function makeStock(row){const [ticker,name,sector,anchor,bias,seed]=row;const random=rng(seed),ds=dates(120);let prev=anchor*(bias>=0?.80:1.20);
 let bars=ds.map((date,i)=>{let center;
 if(i<76)center=anchor*(1-bias*.19+bias*.19*i/76)+anchor*.019*Math.sin(i*.35+seed);
 else if(i<117){let t=i-76;center=anchor*(1+(.092-t*.00155)*Math.cos(t*Math.PI/5));}
 else center=anchor*(1+bias*(.037+(i-117)*(.009+(seed%5)*.001)));
 const close=center+anchor*(random()-.5)*.003,open=prev,spread=anchor*(.003+random()*.004);
 const high=Math.max(open,close)+spread,low=Math.min(open,close)-spread;prev=close;
 return {date,open,high,low,close,volume:Math.round((1.8+random()*.7)*1e6*(i>=117?1.65:1))};});
 const base=300+seed*79;const growth=bias>.3?.012+(seed%7)*.007:bias<-.3?-.012-(seed%5)*.014:.008;
 const revenue=Array.from({length:8},(_,i)=>({label:`${2024+Math.floor((i+2)/4)} Q${(i+2)%4+1}`,value:base*Math.pow(1+growth,i)*(1+((i%4)===3?.007:0))}));
 const guidance=Array.from({length:4},(_,i)=>({label:['3월','5월','7월','9월'][i],value:base*5*(1+(bias>.3?1:bias<-.3?-1:0)*i*(.006+(seed%5)*.009))}));
 const closes=bars.map(b=>b.close),e20=ema(closes,20),e50=ema(closes,50),price=last(closes),ret20=(price/closes[closes.length-21]-1)*100;
 const tr=bars.map((b,i)=>Math.max(b.high-b.low,i?Math.abs(b.high-bars[i-1].close):0,i?Math.abs(b.low-bars[i-1].close):0));
 const atr=mean(tr.slice(-14)),pattern=triangle(bars);
 const revGrowth=(last(revenue).value/revenue[revenue.length-5].value-1)*100;
 const revContinuous=revenue.slice(-3).every((p,i)=>p.value>revenue[i+4].value);
 const guideChange=(last(guidance).value/guidance[0].value-1)*100;
 const guideContinuous=guidance.slice(1).every((p,i)=>p.value>guidance[i].value);
 const parts={trend:(price>last(e20)?8:-8)+(last(e20)>last(e50)?7:-7),momentum:clamp(ret20/12,-1,1)*10,pattern:pattern?.confirmed?pattern.direction*10:0,revenue:clamp(revGrowth/25,-1,1)*5+(revContinuous?3:-3),guidance:clamp(guideChange/10,-1,1)*4+(guideContinuous?3:-3)};
 const score=Math.round(clamp(50+Object.values(parts).reduce((s,v)=>s+v,0),0,100));
 return {ticker,name,sector,bars,price,e20,e50,atr,pattern,revenue,guidance,revGrowth,revContinuous,guideChange,guideContinuous,score,parts,ret20,change:(price/bars[bars.length-2].close-1)*100};
}
export const stocks=universe.map(makeStock);
export const stockMap=Object.fromEntries(stocks.map(s=>[s.ticker,s]));
export function rankStocks(dir=1){return [...stocks].sort((a,b)=>dir*(b.score-a.score)||a.ticker.localeCompare(b.ticker)).slice(0,10);}
export function scenario(stock,days=20){const factor=Math.sqrt(days/20),bias=(stock.score-50)/50;const up=stock.atr*factor*(2.5+bias*.7),down=stock.atr*factor*(2.5-bias*.7);return {upper:stock.price+up,lower:Math.max(.01,stock.price-down),up:up/stock.price*100,down:-Math.min(down,stock.price-.01)/stock.price*100,rr:up/Math.min(down,stock.price-.01)};}
export const defaultHoldings=[{ticker:'AVGO',qty:30,avg:330},{ticker:'TTMI',qty:140,avg:71},{ticker:'AAOI',qty:180,avg:39},{ticker:'NVDA',qty:55,avg:180}];
export function validateHoldings(items){return Array.isArray(items)&&items.length<=24&&new Set(items.map(x=>x?.ticker)).size===items.length&&items.every(x=>x&&stockMap[x.ticker]&&Number.isFinite(x.qty)&&x.qty>0&&x.qty<=1e9&&Number.isFinite(x.avg)&&x.avg>0&&x.avg<=1e9);}
export function portfolio(items,days=20){const value=items.reduce((v,h)=>v+h.qty*stockMap[h.ticker].price,0),cost=items.reduce((v,h)=>v+h.qty*h.avg,0);return {value,cost,pnl:value-cost,pct:cost?(value/cost-1)*100:0,up:value?items.reduce((s,h)=>s+h.qty*stockMap[h.ticker].price*scenario(stockMap[h.ticker],days).up,0)/value:0,down:value?items.reduce((s,h)=>s+h.qty*stockMap[h.ticker].price*scenario(stockMap[h.ticker],days).down,0)/value:0};}
