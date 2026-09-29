import test from 'node:test';import assert from 'node:assert/strict';
import {pullbackSetup,sma,wilderRsi} from '../public/pullback-model.js';
import {setupBars} from './fixtures/pullback.js';
import {radarLists} from '../public/radar-model.js';
test('SMA requires a full window and Wilder RSI matches a published worked sequence',()=>{
 assert.deepEqual(sma([1,2,3,4],3),[null,null,2,3]);
 const closes=[44.34,44.09,44.15,43.61,44.33,44.83,45.10,45.42,45.84,46.08,45.89,46.03,45.61,46.28,46.28,46];
 assert.ok(Math.abs(wilderRsi(closes)[14]-70.464135)<.00001);assert.ok(Math.abs(wilderRsi(closes)[15]-66.249619)<.00001);
 assert.equal(wilderRsi(Array(20).fill(10)).at(-1),50);assert.equal(wilderRsi(Array.from({length:20},(_,i)=>i+1)).at(-1),100);
});
test('all long-term and pullback checks precede confirmation',()=>{const s=pullbackSetup(setupBars());assert.equal(s.status,'ready');assert.equal(s.eligible,true);assert.equal(s.trend.length,5);assert.ok([...s.trend,...s.timing,...s.confirmation].every(c=>c.pass));assert.equal(s.horizon,21);assert.equal(pullbackSetup(setupBars('watch')).status,'watch');assert.equal(pullbackSetup(setupBars('waiting')).status,'waiting');});
test('a short-term rally in a downtrend is never an opportunity, even with a high legacy score',()=>{const bars=setupBars('risk'),setup=pullbackSetup(bars);assert.ok(bars.at(-1).close>bars.at(-5).close);assert.equal(setup.trendPass,false);assert.equal(setup.eligible,false);for(const mode of ['ready','watch','all','strong','breakout'])assert.equal(radarLists([{ticker:'DOWN',name:'Down',sector:'Test',score:100,setup}],{mode}).bull.length,0);});
test('insufficient, duplicate and invalid histories stay unknown',()=>{const bars=setupBars();assert.equal(pullbackSetup(bars.slice(-220)).status,'unknown');assert.notEqual(pullbackSetup(bars.slice(-221)).status,'unknown');bars.at(-1).date=bars.at(-2).date;assert.equal(pullbackSetup(bars).status,'unknown');const invalid=setupBars();invalid.at(-1).volume=NaN;assert.equal(pullbackSetup(invalid).status,'unknown');});
test('calculations use only supplied history and 20 previous volume bars',()=>{const bars=setupBars(),before=pullbackSetup(bars),prefix=JSON.stringify(before);const extended=[...bars,{...bars.at(-1),date:'2026-09-21',close:190,high:191,low:189}];pullbackSetup(extended);assert.equal(JSON.stringify(pullbackSetup(bars)),prefix);assert.equal(before.metrics.volumeRatio,1.5);});
