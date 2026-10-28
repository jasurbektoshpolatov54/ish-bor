// Dizayn rasmlarini HTML’dan qayta chizadi: node design/render.cjs
// Natija: design/screens/<to‘plam>/<variant>/<oyna>.png (390 px, 2x)
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const SETS=[['app.html','namuna'],['app0.html','bosh-holat'],['extra.html','qoshimcha'],['admin.html','nazorat']];
const VAR=[['qorongi',false,false],['yorug',true,false],['qorongi-kirill',false,true],['yorug-kirill',true,true]];
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:430,height:900},deviceScaleFactor:2});
const cyr=fs.readFileSync(path.join(__dirname,'html/cyr.js'),'utf8');
for(const [file,set] of SETS){for(const [v,light,c] of VAR){
 await p.goto('file://'+path.join(__dirname,'html',file));await p.evaluate(()=>document.fonts.ready);
 const ids=await p.evaluate(()=>window.IDS);
 if(c){await p.addScriptTag({content:cyr});await p.evaluate(()=>window.toCyr());}
 await p.evaluate(l=>document.body.className=l?'light':'',light);
 const dir=path.join(__dirname,'screens',set,v);fs.mkdirSync(dir,{recursive:true});
 for(const id of ids)await p.locator('#s'+id).screenshot({path:path.join(dir,id+'.png')});
}}
await b.close();})();
