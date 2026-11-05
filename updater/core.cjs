'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const REPO = 'vumanhhoangmc/PancakeExtensionPro';
const API = `https://api.github.com/repos/${REPO}`;
const ASSET = 'pancake-update.json';
const MAX_BUNDLE = 16 * 1024 * 1024;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function versionParts(version) {
  if (typeof version !== 'string' || !/^(0|[1-9]\d*)(\.(0|[1-9]\d*)){0,3}$/.test(version)) throw new Error('Phiên bản không hợp lệ.');
  const parts = version.split('.').map(Number);
  if (parts.some(n => n > 65535) || parts.every(n => n === 0)) throw new Error('Phiên bản ngoài giới hạn Chrome.');
  return [...parts, ...Array(4 - parts.length).fill(0)];
}
function compareVersions(left, right) {
  const a = versionParts(left), b = versionParts(right);
  for (let i = 0; i < 4; i++) if (a[i] !== b[i]) return Math.sign(a[i] - b[i]);
  return 0;
}
function safeName(name) {
  return typeof name === 'string' && name.length <= 120 &&
    !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])\./i.test(name) &&
    (/^[a-z][a-z0-9-]*\.(js|cjs|css|html)$/.test(name) || name === 'manifest.json');
}
function validateBundle(bundle, expectedVersion) {
  if (bundle?.format !== 1 || bundle.version !== expectedVersion || !Array.isArray(bundle.files) ||
      bundle.files.length < 2 || bundle.files.length > 100) throw new Error('Gói cập nhật không hợp lệ.');
  versionParts(bundle.version);
  const files = new Map();
  let size = 0;
  for (const item of bundle.files) {
    if (!safeName(item.path) || files.has(item.path) || typeof item.data !== 'string' ||
        !/^[a-f0-9]{64}$/.test(item.sha256)) throw new Error('Tên file hoặc checksum không hợp lệ.');
    const bytes = Buffer.from(item.data, 'base64');
    size += bytes.length;
    if (size > MAX_BUNDLE || bytes.toString('base64') !== item.data || hash(bytes) !== item.sha256) throw new Error('Nội dung gói không khớp checksum.');
    files.set(item.path, bytes);
  }
  const manifest = JSON.parse(files.get('manifest.json')?.toString() || 'null');
  if (manifest?.manifest_version !== 3 || manifest.name !== 'Pancake Assistant Pro' || manifest.version !== bundle.version ||
      !manifest.permissions?.includes('nativeMessaging') || !manifest.permissions?.includes('alarms')) throw new Error('Manifest không đúng ứng dụng/phiên bản.');
  const required = [manifest.action?.default_popup, manifest.background?.service_worker,
    ...(manifest.content_scripts || []).flatMap(script => [...(script.js || []), ...(script.css || [])])];
  if (required.some(name => !files.has(name))) throw new Error('Gói thiếu file được khai báo trong manifest.');
  for (const [name, bytes] of files) {
    if (!name.endsWith('.html')) continue;
    const references = [...bytes.toString().matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)].map(match => match[1]);
    if (references.some(ref => !/^(https?:|#)/.test(ref) && !files.has(ref))) throw new Error(`Gói thiếu file cho ${name}.`);
  }
  return files;
}

async function readLimited(response, limit) {
  if (!response.ok) throw new Error(`GitHub trả HTTP ${response.status}. Kiểm tra mạng và quyền đọc Releases của token.`);
  let size = 0;
  const chunks = [];
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > limit) throw new Error('Phản hồi GitHub quá lớn.');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function githubRequest(url, { token = '', fetcher = fetch, binary = false, limit = MAX_BUNDLE } = {}) {
  const target = new URL(url);
  if (target.origin !== 'https://api.github.com' || !target.pathname.startsWith(`/repos/${REPO}/`)) throw new Error('Nguồn cập nhật không được phép.');
  const headers = { 'User-Agent': 'PancakeAssistantPro-Updater', Accept: binary ? 'application/octet-stream' : 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let response = await fetcher(target.href, { headers, redirect: 'manual', signal: AbortSignal.timeout(20000) });
  // Asset redirects use a signed URL. Never forward the GitHub token to that host.
  if (binary && [301, 302, 303, 307, 308].includes(response.status)) {
    const location = new URL(response.headers.get('location'));
    if (location.protocol !== 'https:' || !['release-assets.githubusercontent.com', 'objects.githubusercontent.com'].includes(location.hostname) || location.username || location.password) throw new Error('Chuyển hướng tải file không được phép.');
    await response.body?.cancel();
    response = await fetcher(location.href, { redirect: 'error', signal: AbortSignal.timeout(20000) });
  }
  if (!binary && response.status === 404) return null;
  return readLimited(response, limit);
}

async function latestRelease(options = {}) {
  const bytes = await githubRequest(`${API}/releases/latest`, { ...options, limit: 1024 * 1024 });
  if (!bytes) throw new Error('Không đọc được Releases: repo riêng tư cần token có quyền Contents: read; hoặc repo chưa có bản phát hành.');
  const release = JSON.parse(bytes);
  if (release.draft || release.prerelease) throw new Error('Không dùng bản nháp hoặc bản thử nghiệm.');
  const version = String(release.tag_name || '').replace(/^v/, '');
  versionParts(version);
  const asset = release.assets?.find(item => item.name === ASSET);
  if (!asset || !Number.isSafeInteger(asset.id) || asset.id <= 0 || !/^sha256:[a-f0-9]{64}$/.test(asset.digest) ||
      !Number.isSafeInteger(asset.size) || asset.size <= 0 || asset.size > MAX_BUNDLE) throw new Error('Release thiếu pancake-update.json hoặc SHA-256 của GitHub.');
  return { version, asset };
}

async function exists(file) { return fs.lstat(file).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; }); }
async function assertDirectory(directory) {
  const info = await fs.lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Thư mục cập nhật không được là liên kết.');
  if (path.resolve(await fs.realpath(directory)).toLowerCase() !== path.resolve(directory).toLowerCase()) throw new Error('Đường dẫn cập nhật đi qua liên kết.');
}
async function durableJson(file, value) {
  const handle = await fs.open(file, 'w');
  try { await handle.writeFile(JSON.stringify(value)); await handle.sync(); }
  finally { await handle.close(); }
}

async function recoverUpdate(root) {
  const journal = path.join(root, 'update-journal.json');
  if (!await exists(journal)) return;
  const extension = path.join(root, 'extension'), backup = path.join(root, 'update-backup'), stage = path.join(root, 'update-stage');
  if (await exists(backup)) {
    await assertDirectory(backup);
    if (await exists(extension)) { await assertDirectory(extension); await fs.rm(extension, { recursive: true }); }
    await fs.rename(backup, extension);
  }
  await assertDirectory(extension);
  if (await exists(stage)) { await assertDirectory(stage); await fs.rm(stage, { recursive: true }); }
  await fs.unlink(journal);
}

async function applyBundle(root, files, { afterSwap } = {}) {
  const extension = path.join(root, 'extension'), backup = path.join(root, 'update-backup'), stage = path.join(root, 'update-stage');
  await assertDirectory(root);
  await assertDirectory(extension);
  if (await exists(path.join(extension, '.git'))) throw new Error('Không tự ghi đè checkout phát triển. Hãy dùng thư mục cài riêng.');
  for (const folder of [backup, stage]) if (await exists(folder)) { await assertDirectory(folder); await fs.rm(folder, { recursive: true }); }
  await fs.mkdir(stage);
  for (const [name, bytes] of files) {
    if (!safeName(name)) throw new Error('Đường dẫn file không an toàn.');
    const file = await fs.open(path.join(stage, name), 'wx');
    try { await file.writeFile(bytes); await file.sync(); } finally { await file.close(); }
  }
  await durableJson(path.join(root, 'update-journal.json'), { format: 1 });
  try {
    await fs.rename(extension, backup);
    await fs.rename(stage, extension);
    if (afterSwap) await afterSwap();
    // Removing the journal is the commit point. A crash before this rolls back.
    await fs.unlink(path.join(root, 'update-journal.json'));
  } catch (error) {
    await recoverUpdate(root);
    throw error;
  }
  // Keep one known-good backup until the next successful update attempt.
}

async function withWindowsMutex(root, action) {
  if (process.platform !== 'win32') return action();
  // Serialize stale-lock recovery too, including across Chrome profiles.
  // The helper process releases the OS mutex when stdin closes after a crash.
  const script = `$ErrorActionPreference='Stop'; $mutex=[Threading.Mutex]::new($false,$env:PANCAKE_UPDATE_MUTEX); $owned=$false
    try {
      try { $owned=$mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $owned=$true }
      if (-not $owned) { exit 2 }
      [Console]::Out.WriteLine('LOCKED'); [Console]::Out.Flush()
      [void][Console]::In.ReadLine()
    } finally { if ($owned) { $mutex.ReleaseMutex() }; $mutex.Dispose() }`;
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    windowsHide: true, env: { ...process.env, PANCAKE_UPDATE_MUTEX: `Global\\PancakeAssistantUpdater_${hash(path.resolve(root).toLowerCase())}` }
  });
  child.stdin.on('error', () => {});
  child.stderr.resume();
  const closed = new Promise(resolve => child.once('close', resolve));
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('Không mở được khóa cập nhật Windows.')); }, 10000);
    let output = '';
    child.stdout.on('data', bytes => {
      output += bytes.toString();
      if (output.includes('LOCKED')) { clearTimeout(timer); resolve(); }
    });
    child.once('error', () => { clearTimeout(timer); reject(new Error('Không chạy được PowerShell để khóa cập nhật.')); });
    child.once('close', () => { clearTimeout(timer); reject(new Error('Một trình cập nhật khác đang chạy hoặc khóa Windows không khả dụng.')); });
  });
  try { return await action(); }
  finally { child.stdin.end(); await closed; }
}

async function withUpdateLock(root, action) {
  return withWindowsMutex(root, async () => {
  const lockPath = path.join(root, 'update.lock');
  let lock;
  try { lock = await fs.open(lockPath, 'wx'); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const pid = Number(await fs.readFile(lockPath, 'utf8'));
    if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error('Khóa cập nhật chưa sẵn sàng. Thử lại sau.');
    try { process.kill(pid, 0); throw new Error('Một trình cập nhật khác đang chạy.'); }
    catch (check) { if (check.code !== 'ESRCH') throw check; }
    // Windows mutex serializes this recovery across all native processes.
    await fs.unlink(lockPath);
    lock = await fs.open(lockPath, 'wx');
  }
  try { await lock.writeFile(String(process.pid)); await lock.sync(); return await action(); }
  finally { await lock.close(); await fs.unlink(lockPath); }
  });
}

async function handleUpdate(root, message, options = {}) {
  if (!['check', 'apply'].includes(message?.action)) throw new Error('Thao tác không được hỗ trợ.');
  await assertDirectory(root);
  return withUpdateLock(root, async () => {
    await recoverUpdate(root);
    const installed = JSON.parse(await fs.readFile(path.join(root, 'extension', 'manifest.json'), 'utf8')).version;
    versionParts(installed);
    if (message.action === 'check' && message.loadedVersion && compareVersions(installed, message.loadedVersion) !== 0) {
      return { ok: true, available: false, installedVersion: installed };
    }
    const release = await latestRelease(options);
    if (compareVersions(release.version, installed) <= 0) return { ok: true, available: false, installedVersion: installed };
    if (message.action === 'check') return { ok: true, available: true, installedVersion: installed, version: release.version };
    if (message.expectedVersion !== release.version) throw new Error('Release đã đổi trong lúc kiểm tra. Sẽ thử lại lần sau.');
    const bytes = await githubRequest(`${API}/releases/assets/${release.asset.id}`, { ...options, binary: true });
    if (bytes.length !== release.asset.size || `sha256:${hash(bytes)}` !== release.asset.digest) throw new Error('Checksum gói khác với GitHub.');
    const files = validateBundle(JSON.parse(bytes), release.version);
    await applyBundle(root, files, options);
    return { ok: true, available: false, installedVersion: release.version };
  });
}
module.exports = { REPO, ASSET, MAX_BUNDLE, hash, compareVersions, safeName, validateBundle, githubRequest, latestRelease, applyBundle, recoverUpdate, handleUpdate };
