const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { PassThrough } = require('node:stream');
const { spawn } = require('node:child_process');
const { hash, compareVersions, validateBundle, githubRequest, handleUpdate, recoverUpdate } = require('./core.cjs');
const { buildRelease } = require('./build-release.cjs');
const { readNativeMessage, encodeNativeMessage } = require('./host.cjs');
const source = path.resolve(__dirname, '..');

async function temporary(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pancake-update-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
function bundle(version = '0.10.1') {
  const manifest = { name: 'Pancake Assistant Pro', manifest_version: 3, version,
    permissions: ['nativeMessaging', 'alarms'], action: { default_popup: 'popup.html' }, background: { service_worker: 'update-worker.js' } };
  return { format: 1, version, files: Object.entries({ 'manifest.json': JSON.stringify(manifest), 'popup.html': '<h1>Test</h1>', 'update-worker.js': '// test' })
    .map(([name, data]) => ({ path: name, data: Buffer.from(data).toString('base64'), sha256: hash(data) })) };
}
async function installation(t) {
  const root = await temporary(t);
  await fs.mkdir(path.join(root, 'extension'));
  await fs.writeFile(path.join(root, 'extension', 'manifest.json'), JSON.stringify({ version: '0.10.0' }));
  await fs.writeFile(path.join(root, 'extension', 'old.js'), '// old');
  return root;
}
function remote(payload = bundle(), change = {}) {
  const bytes = Buffer.from(JSON.stringify(payload));
  const release = { tag_name: `v${payload.version}`, assets: [{ name: 'pancake-update.json', id: 123, size: bytes.length, digest: `sha256:${hash(bytes)}`, ...change }] };
  return async url => url.endsWith('/releases/latest') ? new Response(JSON.stringify(release)) : new Response(bytes);
}

test('Chrome versions compare numerically, validate bounds, and reject prereleases', () => {
  assert.equal(compareVersions('0.10.0', '0.9.99'), 1);
  assert.equal(compareVersions('1', '1.0.0.0'), 0);
  assert.equal(compareVersions('1.2', '1.3'), -1);
  for (const version of ['0', '01.2', '1.2-beta', '65536', '1.2.3.4.5']) assert.throws(() => compareVersions(version, '1'));
});

test('real release builds with all manifest/HTML dependencies and excludes secrets/tests', async t => {
  const output = await temporary(t);
  const result = await buildRelease(source, output, 'v0.10.0');
  assert.equal(result.version, '0.10.0');
  const payload = JSON.parse(await fs.readFile(path.join(output, 'pancake-update.json')));
  const files = validateBundle(payload, '0.10.0');
  assert(files.has('pricing.js') && files.has('popup-update.js') && files.has('ai-protocol.cjs'));
  assert(![...files.keys()].some(name => /test|token|config|install/.test(name)));
  await assert.rejects(buildRelease(source, output, 'v0.9.11'), /Tag/);
});

test('reject corrupt payloads, traversal, reserved names, duplicates and missing dependencies', () => {
  for (const badPath of ['../evil.js', 'C:\\evil.js', 'evil.cmd', 'folder/x.js', 'CON.js', 'con.js', 'nul.js', 'com1.js', '__proto__.js']) {
    const data = bundle(); data.files[1].path = badPath;
    assert.throws(() => validateBundle(data, data.version));
  }
  const corrupt = bundle(); corrupt.files[1].data = Buffer.from('corrupt').toString('base64');
  assert.throws(() => validateBundle(corrupt, corrupt.version), /checksum/);
  const duplicate = bundle(); duplicate.files.push(duplicate.files[1]);
  assert.throws(() => validateBundle(duplicate, duplicate.version));
  const missing = bundle(); missing.files.pop();
  assert.throws(() => validateBundle(missing, missing.version), /thiếu/);
  assert.throws(() => validateBundle(bundle(), '0.10.2'));
});

test('check is read-only, apply replaces complete directory, and downgrade is ignored', async t => {
  const root = await installation(t);
  const options = { fetcher: remote() };
  const check = await handleUpdate(root, { action: 'check' }, options);
  assert.equal(check.version, '0.10.1');
  assert.equal(JSON.parse(await fs.readFile(path.join(root, 'extension/manifest.json'))).version, '0.10.0');
  const applied = await handleUpdate(root, { action: 'apply', expectedVersion: check.version }, options);
  assert.equal(applied.installedVersion, '0.10.1');
  await assert.rejects(fs.access(path.join(root, 'extension/old.js')));
  assert.equal(await fs.readFile(path.join(root, 'update-backup/old.js'), 'utf8'), '// old');
  const older = await handleUpdate(root, { action: 'apply', expectedVersion: '0.9.11' }, { fetcher: remote(bundle('0.9.11')) });
  assert.equal(older.available, false);
  assert.equal(older.installedVersion, '0.10.1');
});

test('download digest mismatch and release changing between check/apply leave installed version intact', async t => {
  const root = await installation(t);
  await assert.rejects(handleUpdate(root, { action: 'apply', expectedVersion: '0.10.1' }, { fetcher: remote(bundle(), { digest: `sha256:${'0'.repeat(64)}` }) }), /Checksum/);
  await assert.rejects(handleUpdate(root, { action: 'apply', expectedVersion: '0.10.2' }, { fetcher: remote() }), /Release đã đổi/);
  assert.equal(JSON.parse(await fs.readFile(path.join(root, 'extension/manifest.json'))).version, '0.10.0');
});

test('failure after folder swap rolls back, and next call can retry successfully', async t => {
  const root = await installation(t);
  await assert.rejects(handleUpdate(root, { action: 'apply', expectedVersion: '0.10.1' }, {
    fetcher: remote(), afterSwap: () => { throw new Error('simulated crash'); }
  }), /simulated crash/);
  assert.equal(await fs.readFile(path.join(root, 'extension/old.js'), 'utf8'), '// old');
  const applied = await handleUpdate(root, { action: 'apply', expectedVersion: '0.10.1' }, { fetcher: remote() });
  assert.equal(applied.installedVersion, '0.10.1');
});

test('persistent journal recovers an interruption between directory renames', async t => {
  const root = await installation(t);
  await fs.rename(path.join(root, 'extension'), path.join(root, 'update-backup'));
  await fs.mkdir(path.join(root, 'update-stage'));
  await fs.writeFile(path.join(root, 'update-journal.json'), '{}');
  await recoverUpdate(root);
  assert.equal(await fs.readFile(path.join(root, 'extension/old.js'), 'utf8'), '// old');
  await assert.rejects(fs.access(path.join(root, 'update-stage')));
});

test('never overwrite a development checkout or use unsupported actions', async t => {
  const root = await installation(t);
  await fs.mkdir(path.join(root, 'extension/.git'));
  await assert.rejects(handleUpdate(root, { action: 'apply', expectedVersion: '0.10.1' }, { fetcher: remote() }), /checkout/);
  await assert.rejects(handleUpdate(root, { action: 'exec', command: 'evil' }), /Thao tác/);
});

test('lock serializes processes, stale PID can recover, network errors unlock without applying', async t => {
  const root = await installation(t);
  await fs.writeFile(path.join(root, 'update.lock'), String(process.pid));
  await assert.rejects(handleUpdate(root, { action: 'check' }, { fetcher: remote() }), /khác đang chạy/);
  await fs.unlink(path.join(root, 'update.lock'));
  await assert.rejects(handleUpdate(root, { action: 'check' }, { fetcher: () => { throw new Error('offline'); } }), /offline/);
  await assert.rejects(fs.access(path.join(root, 'update.lock')));
});

test('private GitHub token is only sent to the repository API, never CDN redirects', async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    return calls.length === 1 ? new Response(null, { status: 302, headers: { location: 'https://release-assets.githubusercontent.com/asset?signature=test' } }) : new Response('payload');
  };
  const bytes = await githubRequest('https://api.github.com/repos/vumanhhoangmc/PancakeExtensionPro/releases/assets/123', { token: 'TEST-SECRET', binary: true, fetcher });
  assert.equal(bytes.toString(), 'payload');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer TEST-SECRET');
  assert.equal(calls[1].options.headers, undefined);
  await assert.rejects(githubRequest('https://evil.invalid/payload', { fetcher }), /Nguồn/);
  await assert.rejects(githubRequest('https://api.github.com/repos/vumanhhoangmc/PancakeExtensionPro/releases/assets/123', {
    binary: true, fetcher: async () => new Response(null, { status: 302, headers: { location: 'https://evil.invalid/payload' } })
  }), /Chuyển hướng/);
});

test('404/private repository and invalid release never report current', async t => {
  const root = await installation(t);
  await assert.rejects(handleUpdate(root, { action: 'check' }, { fetcher: async () => new Response('', { status: 404 }) }), /token/);
  const prerelease = { tag_name: 'v0.10.1', prerelease: true };
  await assert.rejects(handleUpdate(root, { action: 'check' }, { fetcher: async () => new Response(JSON.stringify(prerelease)) }), /bản thử nghiệm/);
});

test('native framing accepts fragmented UTF-8 messages and rejects oversized/truncated messages', async () => {
  const input = new PassThrough();
  const result = readNativeMessage(input);
  const bytes = encodeNativeMessage({ action: 'check', note: 'Miến Sâm' });
  input.write(bytes.subarray(0, 2)); input.write(bytes.subarray(2, 7)); input.write(bytes.subarray(7));
  assert.deepEqual(await result, { action: 'check', note: 'Miến Sâm' });
  const tooLarge = new PassThrough(), invalid = readNativeMessage(tooLarge);
  const header = Buffer.alloc(4); header.writeUInt32LE(4097); tooLarge.end(header);
  await assert.rejects(invalid, /quá lớn/);
  const truncated = new PassThrough(), incomplete = readNativeMessage(truncated); truncated.end(Buffer.from([3]));
  await assert.rejects(incomplete, /chưa đủ/);
});

test('native executable refuses an unregistered caller and writes one correctly framed error', async t => {
  const root = await temporary(t);
  await fs.copyFile(path.join(__dirname, 'host.cjs'), path.join(root, 'host.cjs'));
  await fs.copyFile(path.join(__dirname, 'core.cjs'), path.join(root, 'core.cjs'));
  await fs.writeFile(path.join(root, 'config.json'), JSON.stringify({ extensionId: 'a'.repeat(32) }));
  const child = spawn(process.execPath, [path.join(root, 'host.cjs'), `chrome-extension://${'b'.repeat(32)}/`], { windowsHide: true });
  const chunks = []; child.stdout.on('data', bytes => chunks.push(bytes));
  const exit = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
  assert.equal(exit, 0);
  const bytes = Buffer.concat(chunks);
  assert.equal(bytes.readUInt32LE(0), bytes.length - 4);
  assert.deepEqual(JSON.parse(bytes.subarray(4)), { ok: false, error: 'ID extension chưa được đăng ký.' });
});

test('committed disk update reloads offline without needing another GitHub request', async t => {
  const root = await installation(t);
  const result = await handleUpdate(root, { action: 'check', loadedVersion: '0.9.11' }, {
    fetcher: () => { throw new Error('must not fetch'); }
  });
  assert.equal(result.installedVersion, '0.10.0');
  assert.equal(result.available, false);
});

test('dead host lock and journal restore previous installation after process exit', async t => {
  const root = await installation(t);
  const child = spawn(process.execPath, ['-e', 'process.exit(0)'], { windowsHide: true });
  await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
  await fs.writeFile(path.join(root, 'update.lock'), String(child.pid));
  await fs.rename(path.join(root, 'extension'), path.join(root, 'update-backup'));
  await fs.mkdir(path.join(root, 'extension'));
  await fs.writeFile(path.join(root, 'extension/manifest.json'), JSON.stringify({ version: '0.10.1' }));
  await fs.writeFile(path.join(root, 'update-journal.json'), '{}');
  const result = await handleUpdate(root, { action: 'check' }, { fetcher: remote() });
  assert.equal(result.installedVersion, '0.10.0');
  assert.equal(await fs.readFile(path.join(root, 'extension/old.js'), 'utf8'), '// old');
});

test('symlink/junction installation is rejected without touching target files', async t => {
  const root = await temporary(t), destination = await installation(t);
  const link = path.join(root, 'linked-install');
  await fs.symlink(destination, link, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(handleUpdate(link, { action: 'check' }, { fetcher: remote() }), /liên kết/);
  assert.equal(await fs.readFile(path.join(destination, 'extension/old.js'), 'utf8'), '// old');
});

test('Windows installer copies managed files and binds ID without admin (registry mocked)', { skip: process.platform !== 'win32' }, async t => {
  const output = await temporary(t);
  const { packageRoot } = await buildRelease(source, output);
  const script = path.join(output, 'installer-test.ps1');
  const installedRoot = path.join(output, 'local-app-data');
  await fs.mkdir(installedRoot);
  // Only the two registry mutations are mocked. File copies and host/config
  // generation run through the real Windows PowerShell 5 installer.
  await fs.writeFile(script, `
    $ErrorActionPreference='Stop'
    function Read-Host { param($Prompt, [switch]$AsSecureString); return [System.Security.SecureString]::new() }
    function New-Item { param($Path, $ItemType, [switch]$Force)
      if ($Path -like 'HKCU:*') { return }
      Microsoft.PowerShell.Management\\New-Item -Path $Path -ItemType $ItemType -Force:$Force
    }
    function Set-Item { param($LiteralPath, $Value)
      if ($LiteralPath -notlike 'HKCU:*' -or -not (Test-Path -LiteralPath $Value)) { throw 'Unexpected registry write' }
    }
    & (Join-Path $env:PANCAKE_TEST_PACKAGE 'updater/install.ps1') -ExtensionId ('a' * 32)
  `);
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script], {
    windowsHide: true, env: { ...process.env, LOCALAPPDATA: installedRoot, PANCAKE_TEST_PACKAGE: packageRoot }
  });
  const errors = []; child.stderr.on('data', bytes => errors.push(bytes)); child.stdout.resume();
  const exit = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
  assert.equal(exit, 0, Buffer.concat(errors).toString());
  const installed = path.join(installedRoot, 'PancakeAssistantPro');
  const config = JSON.parse(await fs.readFile(path.join(installed, 'updater/config.json'), 'utf8'));
  const registration = JSON.parse(await fs.readFile(path.join(installed, 'updater/native-host.json'), 'utf8'));
  assert.equal(config.extensionId, 'a'.repeat(32));
  assert.deepEqual(registration.allowed_origins, [`chrome-extension://${'a'.repeat(32)}/`]);
  assert.equal(JSON.parse(await fs.readFile(path.join(installed, 'extension/manifest.json'))).version, '0.10.0');
  assert.equal(registration.path, path.join(installed, 'updater/host.cmd'));
  await assert.rejects(fs.access(path.join(installed, 'github-token.xml')));
});

test('Windows OS mutex prevents parallel native hosts and releases on host crash', { skip: process.platform !== 'win32' }, async t => {
  const root = await installation(t);
  const childScript = `const {handleUpdate}=require(process.env.PANCAKE_TEST_CORE);
    handleUpdate(process.env.PANCAKE_TEST_ROOT,{action:'check'},{fetcher:()=>{
      process.stdout.write('HOLDING'); return new Promise(()=>{});
    }}).catch(()=>process.exit(1));`;
  const child = spawn(process.execPath, ['-e', childScript], { windowsHide: true,
    env: { ...process.env, PANCAKE_TEST_ROOT: root, PANCAKE_TEST_CORE: path.join(__dirname, 'core.cjs') } });
  t.after(() => { if (child.exitCode === null) child.kill(); });
  const exited = new Promise(resolve => child.on('exit', resolve));
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('test host did not acquire mutex')), 10000);
    child.on('error', reject);
    child.stdout.on('data', bytes => { if (bytes.toString().includes('HOLDING')) { clearTimeout(timer); resolve(); } });
  });
  await assert.rejects(handleUpdate(root, { action: 'check' }, { fetcher: remote() }), /khác đang chạy/);
  child.kill(); await exited;
  const recovered = await handleUpdate(root, { action: 'check' }, { fetcher: remote() });
  assert.equal(recovered.installedVersion, '0.10.0');
});
