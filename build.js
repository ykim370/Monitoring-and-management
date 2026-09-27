import './scripts/prepare-fonts.js';
import fs from 'node:fs';
import {build} from 'esbuild';
fs.rmSync('dist',{recursive:true,force:true});
fs.cpSync('public','dist/client',{recursive:true});
await build({entryPoints:['src/worker.js'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'neutral',target:'es2022'});
fs.writeFileSync('dist/server/wrangler.json',JSON.stringify({name:'swing-desk',main:'index.js',compatibility_date:'2026-09-01',d1_databases:[{binding:'DB',database_name:'site-creator-d1',database_id:'00000000-0000-4000-8000-000000000000'}],assets:{directory:'../client',binding:'ASSETS',run_worker_first:['/api/*']}} ,null,2));
console.log('Built Worker and static assets in dist/');
