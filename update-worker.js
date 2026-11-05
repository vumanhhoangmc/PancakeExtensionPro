'use strict';
const UPDATE_HOST = 'com.pancakeassistant.updater';
const UPDATE_ALARM = 'pancake-github-update';
const WORK_URLS = ['https://pancake.vn/*', 'https://*.pancake.vn/*'];
let checking;

function compareUpdateVersions(left, right) {
  const parse = value => {
    if (typeof value !== 'string' || !/^(0|[1-9]\d*)(\.(0|[1-9]\d*)){0,3}$/.test(value)) throw new Error('Trình cập nhật trả phiên bản không hợp lệ.');
    const parts = value.split('.').map(Number);
    if (parts.some(n => n > 65535) || parts.every(n => n === 0)) throw new Error('Phiên bản ngoài giới hạn Chrome.');
    return [...parts, ...Array(4 - parts.length).fill(0)];
  };
  const a = parse(left), b = parse(right);
  for (let i = 0; i < 4; i++) if (a[i] !== b[i]) return Math.sign(a[i] - b[i]);
  return 0;
}

async function readUpdateInstallation() {
  try {
    const response = await fetch(chrome.runtime.getURL('update-installation.json'), { cache: 'no-store' });
    const marker = response.ok && await response.json();
    if (!/^[a-f0-9-]{36}$/.test(marker?.installationId)) throw new Error();
    return marker.installationId;
  } catch {
    throw new Error('Bản đang mở chưa nằm trong thư mục tự cập nhật. Chạy gói cài mới, rồi Load unpacked từ %LOCALAPPDATA%\\PancakeAssistantPro\\extension và đăng ký đúng ID.');
  }
}

async function reloadCommittedUpdate(version, loaded) {
  if (compareUpdateVersions(version, loaded) <= 0) throw new Error('Helper đang đọc bản cũ hoặc khác thư mục. Không nạp lại. Chạy lại gói cài mới và chọn đúng thư mục extension.');
  const response = await fetch(chrome.runtime.getURL('manifest.json'), { cache: 'no-store' });
  const ownDisk = response.ok && await response.json();
  if (compareUpdateVersions(ownDisk?.version, version) !== 0) throw new Error('Helper đã cập nhật thư mục khác với extension đang mở. Không nạp lại; hãy cài lại đúng thư mục.');
  const { extensionUpdateReload } = await chrome.storage.local.get('extensionUpdateReload');
  if (extensionUpdateReload?.from === loaded && extensionUpdateReload?.to === version) throw new Error('Đã thử nạp bản mới nhưng phiên bản không đổi. Đã dừng tự nạp lại; hãy kiểm tra thư mục cài.');
  if ((await chrome.tabs.query({ url: WORK_URLS })).length) return saveUpdateStatus('waiting', `Bản ${version} đã sẵn sàng. Đóng các tab Pancake/POS để nạp lại.`, { pending: true });
  await chrome.storage.local.set({ extensionUpdateReload: { from: loaded, to: version } });
  await saveUpdateStatus('reloading', `Đang nạp bản ${version}…`);
  chrome.runtime.reload();
  return { message: 'Đang nạp lại extension…' };
}

async function saveUpdateStatus(state, message, extra = {}) {
  const result = { state, message, checkedAt: Date.now(), ...extra };
  await chrome.storage.local.set({ extensionUpdate: result });
  return result;
}

async function runUpdateCheck() {
  try {
    const loaded = chrome.runtime.getManifest().version;
    const installationId = await readUpdateInstallation();
    const request = { loadedVersion: loaded, installationId };
    const result = await chrome.runtime.sendNativeMessage(UPDATE_HOST, { action: 'check', ...request });
    if (!result?.ok) throw new Error(result?.error || 'Trình cập nhật không trả lời hợp lệ.');
    if (result.installationId !== installationId) throw new Error('Helper chưa khớp thư mục cài. Chạy lại install-update.cmd bản mới và đăng ký đúng ID extension.');
    // Disk may already contain a committed update if Chrome stopped before reload.
    const diskDifference = compareUpdateVersions(result.installedVersion, loaded);
    if (diskDifference !== 0) return await reloadCommittedUpdate(result.installedVersion, loaded);
    if (!result.available) {
      await chrome.storage.local.set({ extensionUpdateReload: null });
      return saveUpdateStatus('current', 'Đang dùng bản mới nhất.');
    }
    if (compareUpdateVersions(result.version, loaded) <= 0) throw new Error('Bản được đề nghị không mới hơn bản đang chạy. Đã bỏ qua cập nhật.');
    const tabs = await chrome.tabs.query({ url: WORK_URLS });
    if (tabs.length) return saveUpdateStatus('waiting', `Có bản ${result.version}. Đóng các tab Pancake/POS để tự cập nhật.`, { pending: true });
    // Check again after the native request; never reload a tab opened meanwhile.
    const applied = await chrome.runtime.sendNativeMessage(UPDATE_HOST, { action: 'apply', expectedVersion: result.version, ...request });
    if (!applied?.ok) throw new Error(applied?.error || 'Không áp dụng được bản mới.');
    if (applied.installationId !== installationId) throw new Error('Helper đã đổi thư mục cài trong lúc cập nhật. Đã dừng nạp lại.');
    return await reloadCommittedUpdate(applied.installedVersion, loaded);
  } catch (error) {
    const missing = /host.*not found|host.*forbidden|native messaging.*not|specified native/i.test(error.message);
    return saveUpdateStatus('error', missing
      ? 'Chưa kết nối trình cập nhật. Chạy install-update.cmd và đăng ký đúng ID extension.'
      : `Chưa cập nhật được: ${error.message}`);
  }
}

function checkExtensionUpdate() {
  if (!checking) checking = runUpdateCheck().finally(() => { checking = null; });
  return checking;
}

async function scheduleUpdateChecks() {
  await chrome.alarms.create(UPDATE_ALARM, { delayInMinutes: 1, periodInMinutes: 60 });
}
chrome.runtime.onInstalled.addListener(() => { void scheduleUpdateChecks(); void checkExtensionUpdate(); });
chrome.runtime.onStartup.addListener(() => { void scheduleUpdateChecks(); void checkExtensionUpdate(); });
chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === UPDATE_ALARM) void checkExtensionUpdate(); });
chrome.tabs.onRemoved.addListener(async () => {
  const { extensionUpdate } = await chrome.storage.local.get('extensionUpdate');
  if (extensionUpdate?.pending && !(await chrome.tabs.query({ url: WORK_URLS })).length) void checkExtensionUpdate();
});
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('popup.html') ||
      message?.type !== 'check-extension-update') return;
  checkExtensionUpdate().then(respond);
  return true;
});
// Alarms may be cleared by the browser; restore one on each worker start.
void chrome.alarms.get(UPDATE_ALARM).then(alarm => { if (!alarm) return scheduleUpdateChecks(); });
