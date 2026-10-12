const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const files=new Map([['/','tests/ai-draft-fixture.html'],['/ai-draft-fixture.js','tests/ai-draft-fixture.js'],['/ai-order-plan.js','ai-order-plan.js'],['/ai-order-dom.js','ai-order-dom.js']]);
http.createServer((req,res)=>{
  const file=files.get(new URL(req.url,'http://127.0.0.1').pathname);
  if(!file){res.writeHead(404);return res.end();}
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8');
  fs.createReadStream(path.join(root,file)).pipe(res);
}).listen(8766,'127.0.0.1',()=>console.log('AI draft fixture: http://127.0.0.1:8766'));
