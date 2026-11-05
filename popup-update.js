(() => {
  const status = document.getElementById('update-status');
  const button = document.getElementById('check-update');
  document.getElementById('update-extension-id').textContent = chrome.runtime.id || 'Chỉ có khi cài extension vào Chrome';
  function render(value = {}) {
    const version = chrome.runtime.getManifest?.().version;
    status.textContent = `${version ? `Bản ${version}. ` : ''}${value.message || 'Chưa kết nối trình cập nhật. Mở hướng dẫn cài bên dưới.'}`;
  }
  chrome.storage.local.get({ extensionUpdate: {} }, ({ extensionUpdate }) => render(extensionUpdate));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.extensionUpdate) render(changes.extensionUpdate.newValue);
  });
  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = 'Đang kiểm tra GitHub…';
    try {
      if (!chrome.runtime.sendMessage) throw new Error('Chỉ kiểm tra được trong extension đã cài.');
      render(await chrome.runtime.sendMessage({ type: 'check-extension-update' }));
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  });
})();
