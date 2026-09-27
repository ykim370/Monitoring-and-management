// Pure signal calculations. No API credentials, requests, or generated market prices.
export const universe = [
  {
    "ticker": "NVDA",
    "name": "NVIDIA",
    "sector": "반도체"
  },
  {
    "ticker": "AVGO",
    "name": "Broadcom",
    "sector": "반도체"
  },
  {
    "ticker": "TTMI",
    "name": "TTM Technologies",
    "sector": "전자부품"
  },
  {
    "ticker": "AAOI",
    "name": "Applied Optoelectronics",
    "sector": "광통신"
  },
  {
    "ticker": "CRDO",
    "name": "Credo Technology",
    "sector": "광통신"
  },
  {
    "ticker": "TSM",
    "name": "TSMC",
    "sector": "반도체"
  },
  {
    "ticker": "AMD",
    "name": "Advanced Micro Devices",
    "sector": "반도체"
  },
  {
    "ticker": "MSFT",
    "name": "Microsoft",
    "sector": "소프트웨어"
  },
  {
    "ticker": "GOOGL",
    "name": "Alphabet",
    "sector": "인터넷"
  },
  {
    "ticker": "AMZN",
    "name": "Amazon",
    "sector": "커머스"
  },
  {
    "ticker": "META",
    "name": "Meta Platforms",
    "sector": "인터넷"
  },
  {
    "ticker": "ANET",
    "name": "Arista Networks",
    "sector": "네트워크"
  },
  {
    "ticker": "INTC",
    "name": "Intel",
    "sector": "반도체"
  },
  {
    "ticker": "SNAP",
    "name": "Snap",
    "sector": "인터넷"
  },
  {
    "ticker": "RIVN",
    "name": "Rivian",
    "sector": "자동차"
  },
  {
    "ticker": "LCID",
    "name": "Lucid Group",
    "sector": "자동차"
  },
  {
    "ticker": "NIO",
    "name": "NIO",
    "sector": "자동차"
  },
  {
    "ticker": "BIDU",
    "name": "Baidu",
    "sector": "인터넷"
  },
  {
    "ticker": "PINS",
    "name": "Pinterest",
    "sector": "인터넷"
  },
  {
    "ticker": "ETSY",
    "name": "Etsy",
    "sector": "커머스"
  },
  {
    "ticker": "ROKU",
    "name": "Roku",
    "sector": "미디어"
  },
  {
    "ticker": "U",
    "name": "Unity Software",
    "sector": "소프트웨어"
  },
  {
    "ticker": "SHOP",
    "name": "Shopify",
    "sector": "커머스"
  },
  {
    "ticker": "PLTR",
    "name": "Palantir",
    "sector": "소프트웨어"
  }
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
const last=a=>a[a.length-1];
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

export const stocks=[];
export const stockMap={};
export const defaultHoldings=[];
export const MAX_PRICE_AGE_DAYS=4;

export function analyzeStock(input) {
  const {bars,revenue=[]}=input;
  if(!Array.isArray(bars)||bars.length<60) throw new Error('At least 60 valid daily bars are required.');
  const closes=bars.map(b=>b.close),price=last(closes),e20=ema(closes,20),e50=ema(closes,50);
  const ret20=(price/closes.at(-21)-1)*100;
  const trueRanges=bars.map((b,i)=>Math.max(b.high-b.low,i?Math.abs(b.high-bars[i-1].close):0,i?Math.abs(b.low-bars[i-1].close):0));
  const atr=mean(trueRanges.slice(-14)),pattern=triangle(bars);
  // A year-over-year comparison needs the same fiscal quarter and currency.
  const current=revenue.at(-1),prior=revenue.at(-5);
  const comparable=!!(current&&prior&&prior.value>0&&current.currency===prior.currency&&Math.abs((Date.parse(current.date)-Date.parse(prior.date))/86400000-365)<40);
  const revGrowth=comparable?(current.value/prior.value-1)*100:null;
  const recent=revenue.slice(-4);
  const consecutive=recent.length===4&&recent.slice(1).every((p,i)=>{
    const gap=(Date.parse(p.date)-Date.parse(recent[i].date))/86400000;
    return gap>=60&&gap<=120&&p.currency===recent[i].currency;
  });
  const revContinuous=consecutive?recent.slice(1).every((p,i)=>p.value>recent[i].value):null;
  // Management-issued revenue guidance is not supplied by these endpoints.
  // Missing evidence contributes zero, never a fabricated negative signal.
  const parts={
    trend:(price>last(e20)?8:-8)+(last(e20)>last(e50)?7:-7),
    momentum:clamp(ret20/12,-1,1)*10,
    pattern:pattern?.confirmed?pattern.direction*10:0,
    revenue:comparable&&revContinuous!==null?clamp(revGrowth/25,-1,1)*5+(revContinuous?3:-3):null,
    guidance:null,
  };
  const score=Math.round(clamp(50+Object.values(parts).reduce((s,v)=>s+(v??0),0),0,100));
  return {...input,price,e20,e50,atr,pattern,revenue,guidance:[],revGrowth,revContinuous,guideChange:null,guideContinuous:null,parts,score,ret20,change:(price/closes.at(-2)-1)*100,coverage:parts.revenue===null?70:86};
}
export function installStock(input){const s=analyzeStock(input);stockMap[s.ticker]=s;const i=stocks.findIndex(x=>x.ticker===s.ticker);if(i<0)stocks.push(s);else stocks[i]=s;return s;}
export function isPriceStale(s,now=Date.now()){return !s.asOf||(now-Date.parse(s.asOf+'T23:59:59Z'))/86400000>MAX_PRICE_AGE_DAYS;}
export function rankedUniverse(now=Date.now()){
  const latest=stocks.reduce((d,s)=>s.asOf>d?s.asOf:d,'');
  return stocks.filter(s=>s.asOf===latest&&!s.transportStale&&!isPriceStale(s,now)&&s.parts.revenue!==null);
}
export function rankStocks(dir=1,now=Date.now()){
  const all=rankedUniverse(now).sort((a,b)=>b.score-a.score||a.ticker.localeCompare(b.ticker));
  const count=Math.min(10,Math.floor(all.length/2)); // Never put a ticker on both lists when coverage is incomplete.
  return dir===1?all.slice(0,count):all.slice(-count||all.length).reverse();
}
export function scenario(stock,days=20){const factor=Math.sqrt(days/20),bias=(stock.score-50)/50;const up=stock.atr*factor*(2.5+bias*.7),down=stock.atr*factor*(2.5-bias*.7);return {upper:stock.price+up,lower:Math.max(.01,stock.price-down),up:up/stock.price*100,down:-Math.min(down,stock.price-.01)/stock.price*100,rr:up/Math.min(down,stock.price-.01)};}
export function validateHoldings(items){return Array.isArray(items)&&items.length<=24&&new Set(items.map(x=>x?.ticker)).size===items.length&&items.every(x=>x&&universe.some(s=>s.ticker===x.ticker)&&Number.isFinite(x.qty)&&x.qty>0&&x.qty<=1e9&&Number.isFinite(x.avg)&&x.avg>0&&x.avg<=1e9);}
export function portfolio(items,days=20){const known=items.filter(h=>stockMap[h.ticker]);const value=known.reduce((v,h)=>v+h.qty*stockMap[h.ticker].price,0),cost=known.reduce((v,h)=>v+h.qty*h.avg,0);return {value,cost,pnl:value-cost,pct:cost?(value/cost-1)*100:0,missing:items.length-known.length,stale:known.filter(h=>isPriceStale(stockMap[h.ticker])).length,up:value?known.reduce((s,h)=>s+h.qty*stockMap[h.ticker].price*scenario(stockMap[h.ticker],days).up,0)/value:0,down:value?known.reduce((s,h)=>s+h.qty*stockMap[h.ticker].price*scenario(stockMap[h.ticker],days).down,0)/value:0};}
