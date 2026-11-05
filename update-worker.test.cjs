const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, 'update-worker.js'), 'utf8');
const INSTALLATION_ID = '11111111-1111-4111-8111-111111111111';

function setup({ tabs = [], native, loaded = '0.10.0', query, diskVersion = '0.10.1', marker = INSTALLATION_ID, sharedStorage } = {}) {
  const events = {}, storage = sharedStorage || {}, calls = [];
  let reloads = 0;
  const listener = key => ({ addListener(fn) { events[key] = fn; } });
  const chrome = {
    runtime: { id: 'test', getURL: file => `chrome-extension://test/${file}`, getManifest: () => ({ version: loaded }),
      reload: () => { reloads++; }, sendNativeMessage: async (host, message) => { calls.push({ host, message }); const reply = native ? await native(message) : { ok: true, installedVersion: loaded, available: false }; return { installationId: INSTALLATION_ID, ...reply }; },
      onInstalled: listener('installed'), onStartup: listener('startup'), onMessage: listener('message') },
    storage: { local: { async set(values) { Object.assign(storage, values); }, async get() { return storage; } } },
    tabs: { query: query || (async () => tabs), onRemoved: listener('removed') },
    alarms: { create: async () => {}, get: async () => ({}), onAlarm: listener('alarm') }
  };
  const fetch = async url => ({ ok: true, json: async () => url.endsWith('update-installation.json') ? { installationId: marker } : { version: diskVersion } });
  const context = vm.createContext({ chrome, Date, console, fetch }); vm.runInContext(source, context);
  return { context, events, storage, calls, reloads: () => reloads, run: () => vm.runInContext('checkExtensionUpdate()', context) };
}

test('while work tabs exist, check reports pending and does not apply/reload', async () => {
  const fixture = setup({ tabs: [{ id: 1 }], native: async () => ({ ok: true, installedVersion: '0.10.0', available: true, version: '0.10.1' }) });
  await fixture.run();
  assert.equal(fixture.storage.extensionUpdate.state, 'waiting');
  assert.equal(fixture.storage.extensionUpdate.pending, true);
  assert.equal(fixture.calls.length, 1); assert.equal(fixture.reloads(), 0);
});

test('without work tabs, apply exact checked version then reload', async () => {
  const fixture = setup({ native: async message => message.action === 'check'
    ? { ok: true, installedVersion: '0.10.0', available: true, version: '0.10.1' }
    : { ok: true, installedVersion: '0.10.1' } });
  await fixture.run();
  assert.equal(fixture.calls[1].message.expectedVersion, '0.10.1');
  assert.equal(fixture.reloads(), 1);
});

test('tab opened during apply defers reload; next check reloads already installed version', async () => {
  let queryCount = 0;
  const fixture = setup({ query: async () => ++queryCount === 1 ? [] : [{ id: 2 }], native: async message => message.action === 'check'
    ? { ok: true, installedVersion: '0.10.0', available: true, version: '0.10.1' }
    : { ok: true, installedVersion: '0.10.1' } });
  await fixture.run();
  assert.equal(fixture.reloads(), 0); assert.equal(fixture.storage.extensionUpdate.pending, true);
  const recovered = setup({ native: async () => ({ ok: true, installedVersion: '0.10.1', available: false }) });
  await recovered.run(); assert.equal(recovered.reloads(), 1);
});

test('host missing, bad checksums and apply errors report failure without reload', async () => {
  for (const native of [async () => { throw new Error('Specified native messaging host not found.'); },
    async () => ({ ok: false, error: 'Checksum gói khác với GitHub.' }),
    async message => message.action === 'check' ? { ok: true, installedVersion: '0.10.0', available: true, version: '0.10.1' } : { ok: false, error: 'disk full' }]) {
    const fixture = setup({ native }); await fixture.run();
    assert.equal(fixture.storage.extensionUpdate.state, 'error'); assert.equal(fixture.reloads(), 0);
  }
});

test('parallel triggers share one native call; content scripts cannot request updates', async () => {
  let resolve;
  const fixture = setup({ native: () => new Promise(done => { resolve = done; }) });
  const first = fixture.run(), second = fixture.run();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fixture.calls.length, 1);
  resolve({ ok: true, installedVersion: '0.10.0', available: false });
  await Promise.all([first, second]);
  let responded = false;
  const result = fixture.events.message({ type: 'check-extension-update' }, { id: 'test', url: 'https://pancake.vn/multi_pages' }, () => { responded = true; });
  assert.equal(result, undefined); assert.equal(responded, false); assert.equal(fixture.calls.length, 1);
});

test('alarm and tab-close triggers use the same update path', async () => {
  const fixture = setup();
  fixture.events.alarm({ name: 'unrelated' }); assert.equal(fixture.calls.length, 0);
  fixture.events.alarm({ name: 'pancake-github-update' });
  await fixture.run(); assert.equal(fixture.calls.length, 1);
  fixture.storage.extensionUpdate.pending = true;
  await fixture.events.removed(); await fixture.run(); assert.equal(fixture.calls.length, 2);
});

test('older helper version never schedules downgrade or reload, even with work tabs open', async () => {
  for (const tabs of [[], [{ id: 1 }]]) {
    const fixture = setup({ loaded: '0.10.1', tabs, native: async () => ({ ok: true, installedVersion: '0.10.0', available: false }) });
    await fixture.run(); await fixture.run();
    assert.equal(fixture.reloads(), 0);
    assert.equal(fixture.storage.extensionUpdate.state, 'error');
    assert(!fixture.storage.extensionUpdate.pending);
  }
});

test('wrong folder or old helper protocol cannot apply or reload', async () => {
  const fixtures = [
    setup({ marker: null }),
    setup({ native: async () => ({ ok: true, installedVersion: '0.10.0', available: true, version: '0.10.1', installationId: undefined }) }),
    setup({ native: async () => ({ ok: true, installedVersion: '0.10.0', available: true, version: '0.10.1', installationId: '22222222-2222-4222-8222-222222222222' }) }),
    setup({ diskVersion: '0.10.0', native: async () => ({ ok: true, installedVersion: '0.10.1', available: false }) })
  ];
  for (const fixture of fixtures) {
    await fixture.run();
    assert.equal(fixture.storage.extensionUpdate.state, 'error');
    assert.equal(fixture.reloads(), 0);
    assert(!fixture.calls.some(call => call.message.action === 'apply'));
  }
});

test('reload attempt survives worker restart and prevents repeated reload of unchanged code', async () => {
  const storage = {};
  const options = { sharedStorage: storage, native: async () => ({ ok: true, installedVersion: '0.10.1', available: false }) };
  const first = setup(options); await first.run(); assert.equal(first.reloads(), 1);
  const restarted = setup(options); await restarted.run(); await restarted.run();
  assert.equal(restarted.reloads(), 0);
  assert.equal(storage.extensionUpdate.state, 'error'); assert(!storage.extensionUpdate.pending);
  const updated = setup({ ...options, loaded: '0.10.1' }); await updated.run();
  assert.equal(storage.extensionUpdate.state, 'current'); assert.equal(storage.extensionUpdateReload, null);
});

test('invalid, equal and lower offered versions never apply', async () => {
  for (const version of ['0.9.99', '0.10.0', 'bad', undefined]) {
    const fixture = setup({ native: async () => ({ ok: true, installedVersion: '0.10.0', available: true, version }) });
    await fixture.run();
    assert.equal(fixture.storage.extensionUpdate.state, 'error');
    assert(!fixture.calls.some(call => call.message.action === 'apply')); assert.equal(fixture.reloads(), 0);
  }
});
