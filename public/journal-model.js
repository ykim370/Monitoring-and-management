export function journalPnl(p){if(p.exit===null)return null;const direction=p.side==='short'?-1:1,gross=(p.exit-p.entry)*p.qty*direction,net=gross-p.cost;return {gross,net,percent:net/(p.entry*p.qty)*100};}
export function forwardOutcomes(record,bars){
 const p=record,e=p.evidence;if(!e?.available)return [5,10,20].map(sessions=>({sessions,pending:true,reason:'No original market evidence'}));
 const reference=bars.find(b=>b.date===e.asOf);if(!reference)return [5,10,20].map(sessions=>({sessions,pending:true,reason:'Reference session unavailable'}));
 // Exclude every calendar date already observable when the snapshot was captured.
 const future=bars.filter(b=>b.date>e.capturedAt.slice(0,10)).sort((a,b)=>a.date.localeCompare(b.date));
 const original=e.bars?.at(-1)?.close,direction=p.side==='short'?-1:1,costPct=original>0?p.cost/(original*p.qty)*100:null;
 return [5,10,20].map(sessions=>{const end=future[sessions-1];if(!end)return {sessions,pending:true,reason:`${future.length}/${sessions} later sessions available`};const gross=(end.close/reference.close-1)*100*direction;return {sessions,pending:false,date:end.date,gross,net:costPct===null?null:gross-costPct};});
}
