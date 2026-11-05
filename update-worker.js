'use strict';
const UPDATE_HOST = 'com.pancakeassistant.updater';
const UPDATE_ALARM = 'pancake-github-update';
const WORK_URLS = ['https://pancake.vn/*', 'https://*.pancake.vn/*'];
let checking;

async function saveUpdateStatus(state, message, extra = {}) {
  const result = { state, message, checkedAt: Date.now(), ...extra };
  await chrome.storage.local.set({ extensionUpdate: result });
  return result;
}

async function runUpdateCheck() {
  try {
    const result = await chrome.runtime.sendNativeMessage(UPDATE_HOST, { action: 'check', loadedVersion: chrome.runtime.getManifest().version });
    if (!result?.ok) throw new Error(result?.error || 'Trình cập nhật không trả lời hợp lệ.');
    // Disk may already contain a committed update if Chrome stopped before reload.
    const loaded = chrome.runtime.getManifest().version;
    if (result.installedVersion !== loaded) {
      const tabs = await chrome.tabs.query({ url: WORK_URLS });
      if (tabs.length) return saveUpdateStatus('waiting', `Bản ${result.installedVersion} đã sẵn sàng. Đóng các tab Pancake/POS để nạp lại.`, { pending: true });
      await saveUpdateStatus('reloading', `Đang nạp bản ${result.installedVersion}…`);
      chrome.runtime.reload();
      return { message: 'Đang nạp lại extension…' };
    }
    if (!result.available) return saveUpdateStatus('current', result.noRelease ? 'GitHub chưa có bản phát hành ổn định.' : 'Đang dùng bản mới nhất.');
    const tabs = await chrome.tabs.query({ url: WORK_URLS });
    if (tabs.length) return saveUpdateStatus('waiting', `Có bản ${result.version}. Đóng các tab Pancake/POS để tự cập nhật.`, { pending: true });
    // Check again after the native request; never reload a tab opened meanwhile.
    const applied = await chrome.runtime.sendNativeMessage(UPDATE_HOST, { action: 'apply', expectedVersion: result.version });
    if (!applied?.ok) throw new Error(applied?.error || 'Không áp dụng được bản mới.');
    if (applied.installedVersion === loaded) return saveUpdateStatus('current', 'Đang dùng bản mới nhất.');
    if ((await chrome.tabs.query({ url: WORK_URLS })).length) {
      return saveUpdateStatus('waiting', `Bản ${applied.installedVersion} đã sẵn sàng. Đóng các tab Pancake/POS để nạp lại.`, { pending: true });
    }
    await saveUpdateStatus('reloading', `Đang nạp bản ${applied.installedVersion}…`);
    chrome.runtime.reload();
    return { message: 'Đang nạp lại extension…' };
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
