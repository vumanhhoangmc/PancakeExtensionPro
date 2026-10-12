const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { makeAttempt, validateCallback, verifyIdToken, readResponseStream, parseProposal } = require('./ai-protocol.cjs');
const { createBridge } = require('./ai-bridge.cjs');

test('Full OAuth → model → sample analysis contract; no credentials returned to client', async () => {
  const id = 'b'.repeat(32), port = 18767;
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const key = { ...publicKey.export({format:'jwk'}), kid:'test' };
  let nonce, requestBody;
  const proposal = {intent:'confirmed',items:[{product:'miến sâm to',kg:2,evidence:'Khách: lấy 2kg to'}]};
  const server = createBridge({extensionId:id,hostId:'host',port,fetcher:async (url, options) => {
    if(url.endsWith('/oauth/token')) {
      assert.equal(options.body.get('client_id'),'oaiapp_test');
      assert.equal(options.body.get('redirect_uri'),`http://127.0.0.1:${port}/auth/callback`);
      const input=[{alg:'RS256',kid:'test'},{iss:'https://auth.openai.com',aud:'oaiapp_test',sub:'account',nonce,exp:Math.floor(Date.now()/1000)+300}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');
      const token=input+'.'+crypto.sign('RSA-SHA256',Buffer.from(input),privateKey).toString('base64url');
      return Response.json({id_token:token,access_token:'private-test-token',expires_in:300,scope:'chatgpt.tokens.use.direct resource.invoke'});
    }
    if(url.endsWith('/openid-configuration')) return Response.json({issuer:'https://auth.openai.com',jwks_uri:'https://auth.openai.com/.well-known/jwks.json'});
    if(url.endsWith('/jwks.json')) return Response.json({keys:[key]});
    if(url.endsWith('/models')) return Response.json({models:[{visibility:'list',slug:'allowed',display_name:'Allowed'},{visibility:'hidden',slug:'hidden'}]});
    if(url.endsWith('/responses')) {
      requestBody=JSON.parse(options.body);
      return new Response(`data: ${JSON.stringify({type:'response.output_text.delta',delta:JSON.stringify(proposal)})}\n\ndata: {"type":"response.completed"}\n\n`);
    }
    throw new Error('Unexpected URL');
  }});
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
  try {
    const base=`http://127.0.0.1:${port}`, headers={Origin:`chrome-extension://${id}`,'Content-Type':'application/json'};
    const login=await (await fetch(base+'/login',{method:'POST',headers})).json();
    const auth=new URL(login.url); nonce=auth.searchParams.get('nonce');
    const cb=new URL(base+'/auth/callback'); cb.search=new URLSearchParams({state:auth.searchParams.get('state'),client_id:'oaiapp_test',code:'code'});
    assert.equal((await fetch(cb)).status,200);
    const status=await (await fetch(base+'/status',{headers})).json();
    assert.equal(status.connected,true); assert.equal(JSON.stringify(status).includes('private-test-token'),false);
    assert.equal((await (await fetch(base+'/models',{headers})).json()).models.length,1);
    const result=await (await fetch(base+'/analyze',{method:'POST',headers,body:JSON.stringify({model:'allowed',text:'Khách: lấy 2kg to'})})).json();
    assert.deepEqual(result.proposal,proposal); assert.equal(result.draftOnly,true);
    assert.equal(requestBody.store,false);assert.equal(requestBody.stream,true);assert.ok(Array.isArray(requestBody.input));
    assert.equal(requestBody.max_output_tokens,undefined);
    await fetch(base+'/logout',{method:'POST',headers});
    assert.equal((await fetch(base+'/analyze',{method:'POST',headers,body:'{}'})).status,401);
  } finally {await new Promise(resolve=>server.close(resolve));}
});

test('OAuth random state, nonce, PKCE and rejection of invalid/expired callback', () => {
  const attempt = makeAttempt('urn:uuid:test', 'http://127.0.0.1:18765/auth/callback');
  const url = new URL(attempt.url);
  assert.equal(url.searchParams.get('code_challenge'), crypto.createHash('sha256').update(attempt.verifier).digest('base64url'));
  assert.notEqual(attempt.state, makeAttempt('host', attempt.redirectUri).state);
  const callback = new URL(attempt.redirectUri);
  callback.search = new URLSearchParams({ state: attempt.state, code: 'code', client_id: 'oaiapp_test' });
  assert.equal(validateCallback(callback, attempt).clientId, 'oaiapp_test');
  assert.throws(() => validateCallback(callback, { ...attempt, state: 'other' }));
  assert.throws(() => validateCallback(callback, { ...attempt, expires: 0 }));
  callback.searchParams.set('client_id', 'dynamic_agent_client');
  assert.throws(() => validateCallback(callback, attempt));
});

test('ID token signature and identity checks cannot be replaced by decoding JWT', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const key = { ...publicKey.export({ format: 'jwk' }), kid: 'test' };
  const claims = { iss: 'https://auth.openai.com', aud: 'client', sub: 'account', nonce: 'nonce', exp: Math.floor(Date.now()/1000)+300 };
  function sign(c) {
    const input = [JSON.stringify({ alg: 'RS256', kid: 'test' }), JSON.stringify(c)].map(v => Buffer.from(v).toString('base64url')).join('.');
    return input + '.' + crypto.sign('RSA-SHA256', Buffer.from(input), privateKey).toString('base64url');
  }
  assert.equal(verifyIdToken(sign(claims), [key], 'client', 'nonce').sub, 'account');
  for (const change of [{ nonce: 'wrong' }, { aud: 'wrong' }, { iss: 'wrong' }, { exp: 0 }]) assert.throws(() => verifyIdToken(sign({ ...claims, ...change }), [key], 'client', 'nonce'));
  assert.throws(() => verifyIdToken(sign(claims), [], 'client', 'nonce'));
});

test('SSE split UTF8 text succeeds only after completed; quota/incomplete streams fail', async () => {
  async function* body(text) { const bytes = Buffer.from(text); for (let i=0;i<bytes.length;i+=3) yield bytes.subarray(i,i+3); }
  const event = data => `data: ${JSON.stringify(data)}\n\n`;
  const text = event({ type: 'response.output_text.delta', delta: 'miến sâm' });
  assert.equal(await readResponseStream(body(text + event({ type: 'response.completed' }))), 'miến sâm');
  await assert.rejects(readResponseStream(body(text)));
  await assert.rejects(readResponseStream(body(text + event({ type: 'response.failed' }))));
  await assert.rejects(readResponseStream(body(text + event({ type: 'response.incomplete' }))));
});

test('AI output must have valid intent and positive kg', () => {
  const proposal = { intent: 'confirmed', items: [{ product: 'miến sâm to', kg: 2, evidence: 'lấy 2kg to' }] };
  assert.deepEqual(parseProposal(JSON.stringify(proposal)), proposal);
  assert.throws(() => parseProposal(JSON.stringify({ ...proposal, intent: 'run_script' })));
  assert.throws(() => parseProposal(JSON.stringify({ ...proposal, items: [{ ...proposal.items[0], kg: -1 }] })));
});
test('Address output is preserved and validated; legacy helper output cannot fill draft',()=>{
  const delivery={system:'old',detail:'UBND',province:'Hải Phòng',district:'Ngô Quyền',commune:'Đông Khê',evidence:'về UBND'};
  const proposal={intent:'confirmed',items:[],delivery};
  assert.deepEqual(parseProposal(JSON.stringify(proposal)).delivery,delivery);
  assert.equal(parseProposal(JSON.stringify({...proposal,delivery:null})).delivery,null);
  assert.throws(()=>parseProposal(JSON.stringify({...proposal,delivery:{...delivery,system:'guess'}})));
});

test('Bridge accepts only configured extension origin and never exchanges invalid callbacks', async () => {
  let calls = 0;
  const id = 'a'.repeat(32);
  const server = createBridge({ extensionId: id, hostId: 'host', port: 18766, fetcher: async () => { calls++; throw new Error('Unexpected network'); } });
  await new Promise(resolve => server.listen(18766, '127.0.0.1', resolve));
  try {
    const base = 'http://127.0.0.1:18766';
    assert.equal((await fetch(base+'/status')).status,403);
    assert.equal((await fetch(base+'/login', {method:'POST', headers:{Origin:'https://pancake.vn'}})).status,403);
    const headers = {Origin:`chrome-extension://${id}`};
    const status = await (await fetch(base+'/status',{headers})).json();
    assert.equal(status.connected,false);
    assert.equal(JSON.stringify(status).includes('access_token'),false);
    const login = await (await fetch(base+'/login',{method:'POST',headers})).json();
    assert.equal(new URL(login.url).origin,'https://auth.openai.com');
    assert.equal((await fetch(base+'/auth/callback?state=bad&code=test&client_id=test')).status,400);
    assert.equal(calls,0);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
