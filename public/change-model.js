export function compareSnapshots(previous,current){
 if(!previous)return {baseline:false,changes:[],membership:[],comparable:false};
 const older=new Map(previous.map(s=>[s.ticker,s]));const changes=current.filter(s=>older.has(s.ticker)).map(s=>{const p=older.get(s.ticker);return {ticker:s.ticker,before:p.score,after:s.score,delta:s.score-p.score,reasons:Object.keys(s.parts).filter(k=>s.parts[k]!=null&&p.parts[k]!=null&&Math.abs(s.parts[k]-p.parts[k])>.01).map(k=>({factor:k,before:p.parts[k],after:s.parts[k]}))};}).filter(s=>s.delta||s.reasons.length).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
 const comparable=previous.length===current.length&&current.length>=20&&current.every(s=>older.has(s.ticker));
 const membership=[];if(comparable){const rank=rows=>[...rows].sort((a,b)=>b.score-a.score||a.ticker.localeCompare(b.ticker));for(const side of ['bullish','bearish']){const select=rows=>{const all=rank(rows);return new Set((side==='bullish'?all.slice(0,10):all.slice(-10)).map(s=>s.ticker));};const before=select(previous),after=select(current);for(const ticker of after)if(!before.has(ticker))membership.push({ticker,side,change:'entered'});for(const ticker of before)if(!after.has(ticker))membership.push({ticker,side,change:'left'});}}
 return {baseline:true,changes,membership,comparable};
}
