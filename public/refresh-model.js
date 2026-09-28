// Missing data first, then overdue data; within each group, holdings/selection and oldest attempt.
export function refreshOrder(universe,records=[],priority=[],now=Date.now()){
 const key=s=>{
  const rows=['TIME_SERIES_DAILY_ADJUSTED','INCOME_STATEMENT'].map(kind=>records.find(r=>r.ticker===s.ticker&&r.kind===kind));
  return [rows.some(r=>!r?.succeeded_at)?0:rows.some(r=>r.error_code||r.expires<=now)?1:2,priority.includes(s.ticker)?0:1,Math.min(...rows.map(r=>Date.parse(r?.attempted_at||'')||0))];
 };
 return [...universe].sort((a,b)=>{const x=key(a),y=key(b);return x[0]-y[0]||x[1]-y[1]||x[2]-y[2]||a.ticker.localeCompare(b.ticker);});
}
