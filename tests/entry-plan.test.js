import test from 'node:test';import assert from 'node:assert/strict';
import {entryPlan,entryPlanView} from '../public/entry-plan.js';import {analyzeStock} from '../public/engine.js';import {setupBars} from './fixtures/pullback.js';
const now=Date.parse('2026-09-21T00:00:00Z');
function stock(kind='ready'){const bars=setupBars(kind);return analyzeStock({bars,asOf:bars.at(-1).date});}
test('failing long trend never generates a buy entry, regardless of a rebound',()=>{const p=entryPlan(stock('risk'),21,now);assert.equal(p.status,'wait');assert.equal(p.levels.length,0);});
test('low reward vs risk explicitly blocks entry instead of stretching target',()=>{const p=entryPlan(stock(),21,now);assert.equal(p.status,'avoid');assert.ok(p.rr<1.5);assert.ok(p.stop<p.trigger);assert.equal(p.levels[2].value,177.5);});
test('qualified conditional plan uses recent candle, pullback low and historical high',()=>{const s=stock();s.bars.at(-10).high=190;const p=entryPlan(s,10,now);assert.equal(p.status,'conditional');assert.ok(p.rr>=1.5);assert.equal(p.levels[2].value,190);assert.ok(entryPlanView(s,10,now).includes('10거래일'));});
test('unconfirmed bounce, stale prices and missing history suppress entry',()=>{const s=stock();s.bars.at(-10).high=190;s.setup.confirmed=false;assert.equal(entryPlan(s,21,now).status,'pending');s.priceTransportStale=true;assert.equal(entryPlan(s,21,now).levels.length,0);s.priceTransportStale=false;assert.equal(entryPlan(s,21,Date.parse('2026-10-02')).levels.length,0);s.setup.status='unknown';assert.equal(entryPlan(s,21,now).levels.length,0);});
