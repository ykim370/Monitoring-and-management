// All opportunity modes enforce the same long-term gate. Composite score cannot bypass it.
export function radarLists(stocks,{query='',mode='ready'}={}){
 const q=query.trim().toLowerCase(),all=stocks.filter(s=>`${s.ticker} ${s.name} ${s.sector}`.toLowerCase().includes(q));
 const allowed=all.filter(s=>s.setup?.trendPass&&s.setup?.pullbackPass&&['ready','watch'].includes(s.setup.status));
 const bull=allowed.filter(s=>mode==='watch'||s.setup.status==='ready').sort((a,b)=>(b.setup.status==='ready')-(a.setup.status==='ready')||b.setup.confirmation.filter(t=>t.pass).length-a.setup.confirmation.filter(t=>t.pass).length||a.ticker.localeCompare(b.ticker)).slice(0,10);
 const bear=all.filter(s=>s.setup?.status==='risk').sort((a,b)=>a.setup.trend.filter(t=>t.pass).length-b.setup.trend.filter(t=>t.pass).length||a.score-b.score||a.ticker.localeCompare(b.ticker)).slice(0,10);
 return {bull,bear,waiting:all.filter(s=>s.setup?.status==='waiting'||(s.setup?.status==='watch'&&mode!=='watch')),unknown:all.filter(s=>!s.setup||s.setup.status==='unknown')};
}
