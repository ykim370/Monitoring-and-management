// Filter before ranking: search can find any eligible stock, including a single match.
export function radarLists(stocks,{query='',mode='all'}={}){
 const q=query.trim().toLowerCase();
 const all=stocks.filter(s=>`${s.ticker} ${s.name} ${s.sector}`.toLowerCase().includes(q)).sort((a,b)=>b.score-a.score||a.ticker.localeCompare(b.ticker));
 if(mode==='strong')return {bull:all.filter(s=>s.score>=60).slice(0,10),bear:all.filter(s=>s.score<=40).reverse().slice(0,10)};
 if(mode==='breakout')return {bull:all.filter(s=>s.pattern?.confirmed&&s.pattern.direction>0).slice(0,10),bear:all.filter(s=>s.pattern?.confirmed&&s.pattern.direction<0).reverse().slice(0,10)};
 const count=Math.min(10,Math.ceil(all.length/2));
 return {bull:all.slice(0,count),bear:all.slice(count).reverse().slice(0,10)};
}
