export function marketStore(db){
 if(!db)return null;
 return {
  async get(key){return db.prepare('SELECT * FROM market_cache WHERE key = ?').bind(key).first();},
  async all(){return (await db.prepare("SELECT key,ticker,kind,expires,attempted_at,succeeded_at,error_code,error_message,json_extract(payload, '$.value.asOf') AS as_of FROM market_cache ORDER BY ticker,kind").all()).results;},
  async success(key,ticker,kind,result,expires){return db.prepare('INSERT INTO market_cache (key,ticker,kind,payload,expires,attempted_at,succeeded_at,error_code,error_message) VALUES (?,?,?,?,?,?,?,NULL,NULL) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,expires=excluded.expires,attempted_at=excluded.attempted_at,succeeded_at=excluded.succeeded_at,error_code=NULL,error_message=NULL').bind(key,ticker,kind,JSON.stringify(result),expires,result.fetchedAt,result.fetchedAt).run();},
  async failure(key,ticker,kind,error){return db.prepare('INSERT INTO market_cache (key,ticker,kind,attempted_at,error_code,error_message) VALUES (?,?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET attempted_at=excluded.attempted_at,error_code=excluded.error_code,error_message=excluded.error_message').bind(key,ticker,kind,new Date().toISOString(),error.code,error.message).run();},
 };
}
