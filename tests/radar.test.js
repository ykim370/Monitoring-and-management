import test from 'node:test';
import assert from 'node:assert/strict';
import {radarLists} from '../public/radar-model.js';
const stocks=Array.from({length:24},(_,i)=>({ticker:`S${String(i).padStart(2,'0')}`,name:'Company',sector:'Tech',score:95-i*4,pattern:{confirmed:i%3===0,direction:i<12?1:-1}}));
test('radar ranks at most ten per side without overlap',()=>{const {bull,bear}=radarLists(stocks);assert.equal(bull.length,10);assert.equal(bear.length,10);assert.equal(new Set([...bull,...bear].map(s=>s.ticker)).size,20);assert.equal(bear[0].ticker,'S23');});
test('search finds a single eligible stock before ranking',()=>{const r=radarLists(stocks,{query:'S12'});assert.deepEqual([...r.bull,...r.bear].map(s=>s.ticker),['S12']);});
test('strong and breakout modes require directional evidence',()=>{const strong=radarLists(stocks,{mode:'strong'});assert.ok(strong.bull.every(s=>s.score>=60));assert.ok(strong.bear.every(s=>s.score<=40));const r=radarLists(stocks,{mode:'breakout'});assert.ok(r.bull.every(s=>s.pattern.confirmed&&s.pattern.direction>0));assert.ok(r.bear.every(s=>s.pattern.confirmed&&s.pattern.direction<0));assert.deepEqual(radarLists([]),{bull:[],bear:[]});});
