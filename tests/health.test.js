import test from 'node:test';import assert from 'node:assert/strict';
import {localDatabase} from '../src/local-db.js';
import {handleApi,resetApiState} from '../src/api.js';
import {priceFixture} from './fixtures/market.js';
const request=path=>new Request('http://localhost'+path);
test('durable last-known data survives process cache reset; failed refresh preserves success time and records error',async()=>{
 const db=localDatabase(':memory:'),env={DB:db,ALPHAVANTAGE_API_KEY:'fixture-key'};resetApiState();
 try{
 const first=await (await handleApi(request('/api/prices?symbol=AVGO'),env,{fetcher:async()=>new Response(JSON.stringify(priceFixture()))})).json();assert.equal(first.stale,false);
 await db.prepare('UPDATE market_cache SET expires=0').run();resetApiState();
 const second=await (await handleApi(request('/api/prices?symbol=AVGO'),env,{fetcher:async()=>{throw Error('offline');}})).json();
 assert.equal(second.stale,true);assert.deepEqual(second.value,first.value);assert.equal(second.fetchedAt,first.fetchedAt);assert.equal(second.warning.code,'UPSTREAM_UNREACHABLE');
 const health=await (await handleApi(request('/api/health'),env)).json();assert.equal(health.records.length,1);assert.equal(health.records[0].succeeded_at,first.fetchedAt);assert.equal(health.records[0].error_code,'UPSTREAM_UNREACHABLE');assert.ok(!JSON.stringify(health).includes('fixture-key'));
 }finally{db.close();resetApiState();}
});
test('first failure remains missing, with no invented last-known data',async()=>{const db=localDatabase(':memory:');try{const r=await handleApi(request('/api/prices?symbol=AVGO'),{DB:db});assert.equal(r.status,503);const h=await(await handleApi(request('/api/health'),{DB:db})).json();assert.equal(h.records[0].succeeded_at,null);}finally{db.close();}});
