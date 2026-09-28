export function alertCondition(rule,stock,{stale=false,complete=false}={}){
 if(rule.type==='stale')return !stock||stale;
 if(!stock||stale)return null;
 if(rule.type==='price_above')return stock.price>=rule.threshold;
 if(rule.type==='price_below')return stock.price<=rule.threshold;
 if(rule.type==='score_above')return complete?stock.score>=rule.threshold:null;
 if(rule.type==='breakout_up')return !!stock.pattern?.confirmed&&stock.pattern.direction===1;
 if(rule.type==='breakout_down')return !!stock.pattern?.confirmed&&stock.pattern.direction===-1;
 return null;
}
