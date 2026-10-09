const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createBridge } = require('./ai-bridge.cjs');

test('Client checks status/models using POST JSON even without a body argument', async () => {
  const calls = [];
  const nodes = new Map();
  const context = vm.createContext({
    document: { getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, { textContent:'', addEventListener(){}, replaceChildren(){}, add(){}, value:'' });
      return nodes.get(id);
    } },
    chrome: { runtime: { id: 'a'.repeat(32) } },
    AbortSignal, Option: function(label,value) { this.text=label; this.value=value; },
    fetch: async (url, options) => {
      calls.push({url,options});
      return { ok: true, json: async () => url.endsWith('/models') ? {models:[]} : {connected:true} };
    },
  });
  vm.runInContext(fs.readFileSync('ai-beta.js','utf8'), context);
  await vm.runInContext('refreshConnection()', context);
  assert.ok(calls.some(c=>c.url.endsWith('/models')));
  for(const {options} of calls) {
    assert.equal(options.method,'POST');
    assert.equal(options.headers['Content-Type'],'application/json');
    assert.equal(options.body,'{}');
  }
});

test('Bridge status POST succeeds, while missing/wrong Origin remains blocked', async () => {
  const id='c'.repeat(32), port=18768;
  const server=createBridge({extensionId:id,hostId:'host',port});
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
  try {
    const base=`http://127.0.0.1:${port}`;
    const headers={Origin:`chrome-extension://${id}`,'Content-Type':'application/json'};
    const status=await fetch(base+'/status',{method:'POST',headers,body:'{}'});
    assert.equal(status.status,200);assert.equal((await status.json()).connected,false);
    const preflight=await fetch(base+'/status',{method:'OPTIONS',headers:{Origin:headers.Origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});
    assert.equal(preflight.status,204);
    assert.equal(preflight.headers.get('access-control-allow-origin'),headers.Origin);
    assert.equal((await fetch(base+'/status')).status,403);
    assert.equal((await fetch(base+'/status',{method:'POST',headers:{Origin:'null'},body:'{}'})).status,403);
    assert.equal((await fetch(base+'/status',{method:'POST',headers:{Origin:`chrome-extension://${'d'.repeat(32)}`},body:'{}'})).status,403);
    assert.equal((await fetch(base+'/models',{method:'POST',headers,body:'{}'})).status,401);
  } finally {await new Promise(resolve=>server.close(resolve));}
});
