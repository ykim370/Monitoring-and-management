import fs from 'node:fs';
const source='node_modules/@fontsource-variable/noto-sans-kr/';
fs.mkdirSync('public/fonts/files',{recursive:true});
for(const name of fs.readdirSync(source+'files'))if(name.endsWith('-wght-normal.woff2'))fs.copyFileSync(source+'files/'+name,'public/fonts/files/'+name);
fs.copyFileSync(source+'index.css','public/fonts/font.css');
