const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = new Map([
  ['/multi_pages', 'tests/pancake-fixture.html'],
  ['/fixture.js', 'tests/pancake-fixture.js'],
  ['/content.js', 'content.js'],
  ['/product-summary.js', 'product-summary.js'],
  ['/pricing.js', 'pricing.js']
]);
http.createServer((req, res) => {
  const file = files.get(new URL(req.url, 'http://localhost').pathname);
  if (!file) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', file.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(path.join(root, file)).pipe(res);
}).listen(8765, '127.0.0.1', () => console.log('Pancake fixture: http://127.0.0.1:8765/multi_pages'));
