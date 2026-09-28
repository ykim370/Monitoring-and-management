export function planMetrics(p){
 for(const k of ['entry','stop','target','qty'])if(!Number.isFinite(p[k])||p[k]<=0)throw Error('Entry, stop, target and units must be positive.');
 if(!['long','short'].includes(p.side))throw Error('Choose long or short.');
 if(!Number.isFinite(p.cost)||p.cost<0)throw Error('Estimated total costs must be zero or positive.');
 const direction=p.side==='long'?1:-1,risk=(p.entry-p.stop)*direction,reward=(p.target-p.entry)*direction;
 if(risk<=0||reward<=0)throw Error('Long: stop < entry < target. Short: target < entry < stop.');
 const loss=risk*p.qty+p.cost,gain=reward*p.qty-p.cost;
 return {notional:p.entry*p.qty,loss,gain,lossPct:loss/(p.entry*p.qty)*100,gainPct:gain/(p.entry*p.qty)*100,ratio:gain/loss};
}
