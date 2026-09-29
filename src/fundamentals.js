import {DataError,validateProviderResponse} from './provider.js';
const num=x=>x===null||x===undefined||String(x).trim()===''||!Number.isFinite(Number(x))?null:Number(x);
export function normalizeFundamentals(payload,kind){
 validateProviderResponse(payload);
 if(kind==='OVERVIEW'){
  if(typeof payload.Symbol!=='string'||!payload.Symbol)throw new DataError('NO_FUNDAMENTALS','Company overview is unavailable.');
  const value={};for(const k of ['Symbol','Name','Description','Exchange','Currency','Country','Sector','Industry','LatestQuarter'])value[k]=String(payload[k]||'').slice(0,k==='Description'?5000:200);
  for(const k of ['PERatio','ForwardPE','PEGRatio','PriceToBookRatio','EVToEBITDA','ProfitMargin','ReturnOnEquityTTM','QuarterlyRevenueGrowthYOY','QuarterlyEarningsGrowthYOY','DividendYield','DividendPerShare','EPS','MarketCapitalization'])value[k]=num(payload[k]);
  return value;
 }
 const fields=kind==='BALANCE_SHEET'?['totalCurrentAssets','totalCurrentLiabilities','totalAssets','totalLiabilities','totalShareholderEquity']:['operatingCashflow','capitalExpenditures','dividendPayoutCommonStock'];
 if(!Array.isArray(payload.annualReports))throw new DataError('NO_FUNDAMENTALS','Annual financial statements are unavailable.');
 const report=[...payload.annualReports].filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.fiscalDateEnding)).sort((a,b)=>b.fiscalDateEnding.localeCompare(a.fiscalDateEnding))[0];
 if(!report)throw new DataError('NO_FUNDAMENTALS','No dated annual financial statement is available.');
 return {date:report.fiscalDateEnding,currency:/^[A-Z]{3}$/.test(report.reportedCurrency)?report.reportedCurrency:null,...Object.fromEntries(fields.map(k=>[k,num(report[k])]))};
}
