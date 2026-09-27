import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
export function localDatabase(filename='.data/swing-desk.sqlite'){
 if(filename!==':memory:')fs.mkdirSync('.data',{recursive:true});
 const db=new DatabaseSync(filename);db.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
 for(const name of fs.readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())if(!db.prepare('SELECT name FROM local_migrations WHERE name=?').get(name)){
  db.exec('BEGIN');try{db.exec(fs.readFileSync('drizzle/'+name,'utf8'));db.prepare('INSERT INTO local_migrations VALUES (?)').run(name);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
 }
 return {prepare(sql){const stmt=db.prepare(sql);const build=args=>({bind:(...a)=>build(a),first:async()=>stmt.get(...args)||null,all:async()=>({results:stmt.all(...args)}),run:async()=>stmt.run(...args)});return build([]);},close:()=>db.close()};
}
