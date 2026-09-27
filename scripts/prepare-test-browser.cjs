// Portable CI fallback. Production never uses this binary or these flags.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),zlib=require('node:zlib'),cp=require('node:child_process');
if(process.platform!=='linux'){console.log('For macOS/Windows: npx playwright install chromium');process.exit(0);}
const root=path.resolve(path.dirname(require.resolve('@sparticuz/chromium')),'..','bin');
const dest=path.join(os.tmpdir(),'swing-browser');fs.mkdirSync(dest,{recursive:true});
for(const name of ['chromium','swiftshader.tar']){const bytes=zlib.brotliDecompressSync(fs.readFileSync(path.join(root,name+'.br')));fs.writeFileSync(path.join(dest,name),bytes);}
fs.chmodSync(path.join(dest,'chromium'),0o755);cp.execFileSync('tar',['--no-same-owner','-xf',path.join(dest,'swiftshader.tar'),'-C',dest]);
console.log('Prepared test Chromium at '+path.join(dest,'chromium'));
