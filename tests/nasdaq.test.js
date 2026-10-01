import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDirectory,searchSymbols,symbolMetadata,resetDirectoryState} from '../src/nasdaq.js';
import {handleApi,resetApiState} from '../src/api.js';
import {priceFixture} from './fixtures/market.js';
const offline={directoryFetcher:async()=>{throw Error('offline');}};
const req=p=>new Request('http://test.local'+p);
test('directory parser excludes test symbols and requires a complete file',()=>{
 const text='Symbol|Security Name|Test Issue|ETF\nTSLA|Tesla, Inc. - Common Stock|N|N\nTEST|Test security|Y|N\nFile Creation Time: 0930202618:01||||';
 assert.deepEqual(parseDirectory(text),{asOf:'0930202618:01',items:[{ticker:'TSLA',name:'Tesla, Inc. - Common Stock',sector:'NASDAQ',etf:false}]});
 assert.throws(()=>parseDirectory('Symbol|Security Name|Test Issue\nTSLA|Tesla|N'));
});
test('full Nasdaq snapshot supports ticker/name search during upstream failure',async()=>{
 resetDirectoryState();const result=await searchSymbols(' tesla ',offline);
 assert.equal(result.items[0].ticker,'TSLA');assert.ok(result.total>0);assert.equal(result.stale,true);assert.ok(result.asOf);
 assert.equal((await searchSymbols('tsla',offline)).items[0].ticker,'TSLA');
 assert.equal((await searchSymbols('a',offline)).items.length,30);
 assert.equal((await searchSymbols('zzzzzzzzzz',offline)).total,0);
 assert.equal((await symbolMetadata('AAPL',offline)).ticker,'AAPL');
 await assert.rejects(()=>symbolMetadata('../TSLA',offline));
 await assert.rejects(()=>symbolMetadata('FAKEFAKE',offline));
});
test('search does not require a provider key; Nasdaq symbols can load price data',async()=>{
 resetApiState();resetDirectoryState();let calls=0;
 const context={...offline,fetcher:async url=>{calls++;assert.equal(url.searchParams.get('symbol'),'TSLA');return Response.json(priceFixture());}};
 const search=await handleApi(req('/api/symbols?q=tesla'),{},context);assert.equal(search.status,200);assert.equal((await search.json()).items[0].ticker,'TSLA');assert.equal(calls,0);
 const price=await handleApi(req('/api/prices?symbol=tsla'),{ALPHAVANTAGE_API_KEY:'test'},context);assert.equal(price.status,200);assert.equal((await price.json()).ticker,'TSLA');assert.equal(calls,1);
 const bad=await handleApi(req('/api/prices?symbol=FAKEFAKE'),{ALPHAVANTAGE_API_KEY:'test'},context);assert.equal(bad.status,400);assert.equal(calls,1);
});
