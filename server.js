import http from 'node:http';
import {localDatabase} from './src/local-db.js';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {handleApi} from './src/api.js';
async function readBody(req){let body='';for await(const chunk of req){body+=chunk;if(body.length>80000)throw Error('Request too large');}return body;}
export function createServer(env=process.env,apiContext={}){
  const root=path.resolve('public');
  return http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://'+(req.headers.host||'localhost'));
      if(url.pathname.startsWith('/api/')){const response=await handleApi(new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:await readBody(req)}:{})}),env,{...apiContext,localUserId:'local-owner'});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;}
      if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
      let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
      if((!file.startsWith(root+path.sep)&&file!==root)||url.pathname.split('/').some(p=>p.startsWith('.'))){res.writeHead(403).end();return;}
      if(file===root||file.endsWith(path.sep))file=path.join(file,'index.html');
      const buf=await fs.promises.readFile(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.setHeader('X-Content-Type-Options','nosniff');res.end(req.method==='HEAD'?undefined:buf);
    }catch{res.writeHead(404).end('Not found');}
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const port=Number(process.env.PORT)||3000;createServer({...process.env,DB:localDatabase()}).listen(port,'127.0.0.1',()=>console.log('Swing Desk: http://localhost:'+port));}
