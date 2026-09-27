import {stocks as synthetic} from './synthetic-v1.js';
// Explicit test fixtures only. This directory is never deployed as browser assets.
export function priceFixture(ticker='AVGO'){
 const s=synthetic.find(s=>s.ticker===ticker)||synthetic[0];return {'Meta Data':{'5. Time Zone':'US/Eastern'},'Time Series (Daily)':Object.fromEntries(s.bars.map(b=>[b.date,{'1. open':String(b.open),'2. high':String(b.high),'3. low':String(b.low),'4. close':String(b.close),'5. adjusted close':String(b.close),'6. volume':String(b.volume),'7. dividend amount':'0','8. split coefficient':'1'}]).reverse())};
}
export function revenueFixture(){return {symbol:'AVGO',quarterlyReports:['2026-06-30','2026-03-31','2025-12-31','2025-09-30','2025-06-30','2025-03-31','2024-12-31','2024-09-30'].map((fiscalDateEnding,i)=>({fiscalDateEnding,reportedCurrency:'USD',totalRevenue:String((8-i)*1e9)}))};}
export function estimatesFixture(){return {symbol:'AVGO',estimates:[{date:'2026-12-31',horizon:'fiscal year',revenue_estimate_average:'20000000000',revenue_estimate_low:'18000000000',revenue_estimate_high:'22000000000',revenue_estimate_analyst_count:'12',eps_estimate_average:'3.1'},{date:'2027-12-31',horizon:'fiscal year',revenue_estimate_average:'23000000000'}]};}
