// Read-only validation of the authenticated, deployed API; no provider key needed.
import fs from 'node:fs';
import {universe,installStock,stocks,rankStocks} from '../public/engine.js';
const base=process.env.SITE_URL;
if(!base||!process.env.SITE_AUTH_TOKEN)throw new Error('Set SITE_URL and SITE_AUTH_TOKEN.');
async function get(path){const r=await fetch(new URL(path,base),{headers:{'OAI-Sites-Authorization':'Bearer '+process.env.SITE_AUTH_TOKEN},redirect:'manual',signal:AbortSignal.timeout(35000)});const j=await r.json();if(!r.ok)throw Error(j.error?.code||String(r.status));return j;}
const results=[];let next=0;
await Promise.all(Array.from({length:3},async()=>{while(next<universe.length){const meta=universe[next++];const result={ticker:meta.ticker};try{const price=await get('/api/prices?symbol='+meta.ticker);const input={...meta,...price.value,revenue:[]};result.price=price.value.bars.at(-1).close;result.asOf=price.value.asOf;try{input.revenue=(await get('/api/revenue?symbol='+meta.ticker)).value;}catch(e){result.revenueError=e.message;}installStock(input);}catch(e){result.priceError=e.message;}results.push(result);console.log(JSON.stringify(result));}}));
const report={checkedAt:new Date().toISOString(),prices:stocks.length,up:rankStocks(1).length,down:rankStocks(-1).length,results};fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/production-api-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({prices:report.prices,up:report.up,down:report.down}));if(report.prices!==24||report.up!==10||report.down!==10)process.exitCode=1;
