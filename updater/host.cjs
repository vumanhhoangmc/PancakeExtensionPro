'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { handleUpdate } = require('./core.cjs');

function readNativeMessage(input) {
  return new Promise((resolve, reject) => {
    let pending = Buffer.alloc(0), length;
    const timer = setTimeout(() => finish(new Error('Hết thời gian nhận yêu cầu.')), 10000);
    function finish(error, value) {
      clearTimeout(timer); input.removeListener('data', data); input.removeListener('end', end); input.removeListener('error', fail);
      input.pause(); error ? reject(error) : resolve(value);
    }
    function fail(error) { finish(error); }
    function end() { finish(new Error('Yêu cầu chưa đủ dữ liệu.')); }
    function data(chunk) {
      pending = Buffer.concat([pending, chunk]);
      if (length === undefined && pending.length >= 4) {
        length = pending.readUInt32LE(0);
        if (length < 2 || length > 4096) return finish(new Error('Yêu cầu quá lớn hoặc không hợp lệ.'));
      }
      if (length !== undefined && pending.length >= length + 4) {
        try { finish(null, JSON.parse(pending.subarray(4, length + 4).toString('utf8'))); }
        catch (error) { finish(error); }
      }
    }
    input.on('data', data); input.once('end', end); input.once('error', fail);
  });
}
function encodeNativeMessage(value) {
  const body = Buffer.from(JSON.stringify(value), 'utf8');
  const header = Buffer.alloc(4); header.writeUInt32LE(body.length);
  return Buffer.concat([header, body]);
}
async function readToken(root) {
  const secret = path.join(root, 'github-token.xml');
  try { await fs.access(secret); } catch (error) { if (error.code === 'ENOENT') return ''; throw error; }
  // DPAPI decrypts only for the Windows account that ran the installer.
  const script = "$ErrorActionPreference='Stop'; $credential=Import-Clixml -LiteralPath (Join-Path $env:PANCAKE_UPDATE_ROOT 'github-token.xml'); [Console]::Out.Write($credential.GetNetworkCredential().Password)";
  const { stdout } = await promisify(execFile)('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script],
    { windowsHide: true, timeout: 10000, maxBuffer: 8192, env: { ...process.env, PANCAKE_UPDATE_ROOT: root } });
  return stdout.trim();
}
async function main() {
  let response;
  try {
    const config = JSON.parse(await fs.readFile(path.join(__dirname, 'config.json'), 'utf8'));
    if (!/^[a-p]{32}$/.test(config.extensionId) || process.argv[2] !== `chrome-extension://${config.extensionId}/`) throw new Error('ID extension chưa được đăng ký.');
    const root = path.resolve(__dirname, '..');
    const message = await readNativeMessage(process.stdin);
    const token = await readToken(root);
    response = await handleUpdate(root, message, { token });
  } catch (error) {
    // Never echo child-process errors: they can include command output/secrets.
    response = { ok: false, error: error.cmd ? 'Không đọc được token GitHub đã mã hóa. Chạy lại trình cài bằng đúng tài khoản Windows.' : error.message };
  }
  await new Promise((resolve, reject) => process.stdout.write(encodeNativeMessage(response), error => error ? reject(error) : resolve()));
}
if (require.main === module) main().then(() => process.exit(0), () => process.exit(1));
module.exports = { readNativeMessage, encodeNativeMessage };
