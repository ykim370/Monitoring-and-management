// Deterministic synthetic OHLCV for tests only; never deployed.
export function setupBars(kind='ready'){
 const dates=[];let d=new Date('2026-09-18T00:00:00Z');while(dates.length<260){if(d.getUTCDay()!==0&&d.getUTCDay()!==6)dates.unshift(d.toISOString().slice(0,10));d.setUTCDate(d.getUTCDate()-1);}
 const closes=Array.from({length:260},(_,i)=>kind==='risk'?230-i*.3:100+i*.3);
 const tail=kind==='risk'?[151,153,155,157,159]:kind==='waiting'?[177,178,179,180,181]:[177,175,173,171,173];tail.forEach((v,i)=>closes[260-tail.length+i]=v);
 return closes.map((close,i)=>({date:dates[i],open:close-.2,high:close+.5,low:close-.5,close,volume:i===259?(kind==='watch'?500:1500):1000}));
}
export function setupPriceFixture(kind){return {'Time Series (Daily)':Object.fromEntries(setupBars(kind).map(b=>[b.date,{'1. open':String(b.open),'2. high':String(b.high),'3. low':String(b.low),'4. close':String(b.close),'5. adjusted close':String(b.close),'6. volume':String(b.volume),'7. dividend amount':'0','8. split coefficient':'1'}]))};}
