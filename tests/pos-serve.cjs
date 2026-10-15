const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const files = {'/shop/test/order':'tests/pos-fixture.html','/pos-fixture.js':'tests/pos-fixture.js','/pos-content.js':'pos-content.js','/pos-content.css':'pos-content.css','/pos-groups.js':'pos-groups.js'};
http.createServer((req,res)=>{
  const file=files[new URL(req.url,'http://localhost').pathname];
  if(!file){res.writeHead(404);return res.end();}
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css':'text/javascript; charset=utf-8');
  fs.createReadStream(path.resolve(__dirname,'..',file)).pipe(res);
}).listen(8769,'127.0.0.1',()=>console.log('POS fixture: http://127.0.0.1:8769/shop/test/order'));
