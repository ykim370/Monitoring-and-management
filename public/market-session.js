// US equity session dates, in New York time. Regular scheduled holidays;
// exceptional exchange closures are not inferred from provider timestamps.
const day=86400000,iso=d=>new Date(d).toISOString().slice(0,10);
function holidays(y){
 const result=new Set(),add=(m,d)=>result.add(iso(Date.UTC(y,m-1,d)));
 const nth=(m,w,n)=>1+(w-new Date(Date.UTC(y,m-1,1)).getUTCDay()+7)%7+7*(n-1);
 const observed=(year,m,d)=>{const t=Date.UTC(year,m-1,d),w=new Date(t).getUTCDay();result.add(iso(t+(w===6?-day:w===0?day:0)));};
 observed(y,1,1); // NYSE does not observe a Saturday New Year on Friday.
 if(new Date(Date.UTC(y,0,1)).getUTCDay()===6)result.delete(iso(Date.UTC(y,0,0)));
 add(1,nth(1,1,3));add(2,nth(2,1,3));add(5,new Date(Date.UTC(y,5,0)).getUTCDate()-(new Date(Date.UTC(y,5,0)).getUTCDay()+6)%7);
 if(y>=2022)observed(y,6,19);observed(y,7,4);add(9,nth(9,1,1));add(11,nth(11,4,4));observed(y,12,25);
 const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),date=(h+l-7*m+114)%31+1;
 result.add(iso(Date.UTC(y,month-1,date)-2*day));return result;
}
export function latestCompletedSession(now=Date.now()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(now)).map(p=>[p.type,p.value]));
 let t=Date.UTC(+parts.year,+parts.month-1,+parts.day);if(+parts.hour<16)t-=day;
 while([0,6].includes(new Date(t).getUTCDay())||holidays(new Date(t).getUTCFullYear()).has(iso(t)))t-=day;
 return iso(t);
}
export function priceBehind(asOf,now=Date.now()){return !asOf||asOf<latestCompletedSession(now);}
export function priceCacheExpiry(packet,now=Date.now()){
 return Date.parse(packet.fetchedAt)+(priceBehind(packet.value?.asOf,now)?300:3600)*1000;
}
