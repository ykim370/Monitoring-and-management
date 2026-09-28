import test from 'node:test';import assert from 'node:assert/strict';
import {localDatabase} from '../src/local-db.js';import {providerBudget,withProviderBudget} from '../src/provider-budget.js';import {handleApi,resetApiState} from '../src/api.js';import {priceFixture} from './fixtures/market.js';import {refreshOrder} from '../public/refresh-model.js';
test('shared rolling budget admits at most 70 slots and spaces starts across clients',async()=>{
 const db=localDatabase(':memory:');try{const a=providerBudget(db),b=providerBudget(db),base=100000;
 const concurrent=await Promise.all(Array.from({length:20},(_,i)=>(i%2?a:b).reserve('stock'+i,base)));assert.equal(concurrent.filter(Boolean).length,1);
 for(let i=1;i<70;i++)assert.equal(await b.reserve('stock'+i,base+i*850),true);
 assert.equal(await a.reserve('blocked',base+59500),false);assert.equal((await a.status(base+59500)).used,70);
 assert.equal(await b.reserve('next-window',base+60000),true);
 }finally{db.close();}
});
test('per-source leases coalesce across clients; failures back off and provider cooldown is shared',async()=>{
 const db=localDatabase(':memory:');try{const a=providerBudget(db),b=providerBudget(db),now=100000;
 const token=await a.claim('prices:NVDA',now);assert.ok(token);assert.equal(await b.claim('prices:NVDA',now),null);
 await a.reserve('prices:NVDA',now);await a.finish('prices:NVDA',token,{code:'RATE_LIMIT'},now);
 assert.equal(await b.reserve('calendar',now+1000),false);assert.equal(await b.claim('prices:NVDA',now+59000),null);
 const next=await b.claim('prices:NVDA',now+60000);assert.ok(next);await b.finish('prices:NVDA',next,{code:'UPSTREAM_HTTP'},now+60000);
 assert.equal(await a.claim('prices:NVDA',now+120000),null);assert.ok(await a.claim('prices:NVDA',now+180000));
 }finally{db.close();}
});
test('expired lease recovers after a crashed instance and storage failures fail closed',async()=>{
 const db=localDatabase(':memory:');try{const b=providerBudget(db);await b.claim('x',1);assert.equal(await b.claim('x',90000),null);assert.ok(await b.claim('x',90001));}finally{db.close();}
 let called=false;await assert.rejects(withProviderBudget({prepare(){throw Error('offline');}},'x',async()=>{called=true;}),e=>e.code==='BUDGET_UNAVAILABLE');assert.equal(called,false);
});
test('persisted prices survive memory reset without another paid request',async()=>{
 const DB=localDatabase(':memory:');let calls=0;const context={fetcher:async()=>{calls++;return new Response(JSON.stringify(priceFixture()));}},env={DB,ALPHAVANTAGE_API_KEY:'TEST_ONLY'};
 try{resetApiState();assert.equal((await handleApi(new Request('http://test/api/prices?symbol=NVDA'),env,context)).status,200);resetApiState();const data=await (await handleApi(new Request('http://test/api/prices?symbol=NVDA'),env,context)).json();assert.equal(data.cacheHit,true);assert.equal(calls,1);
 }finally{DB.close();}
});
test('rotation prioritises missing then due then fresh; oldest attempts rotate fairly',()=>{
 const universe=['FRESH','OLD','MISSING','DUE'].map(ticker=>({ticker}));const records=['FRESH','OLD','DUE'].flatMap((ticker,i)=>['TIME_SERIES_DAILY_ADJUSTED','INCOME_STATEMENT'].map(kind=>({ticker,kind,succeeded_at:'yes',attempted_at:new Date(i+1).toISOString(),expires:ticker==='FRESH'?100:0})));
 assert.deepEqual(refreshOrder(universe,records,[],50).map(x=>x.ticker),['MISSING','OLD','DUE','FRESH']);
});
