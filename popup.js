const toggle = document.getElementById('auto-order');
const noteToggle = document.getElementById('auto-print-note');
const priceToggle = document.getElementById('auto-mien-sam-price');
const submitToggle = document.getElementById('auto-submit-order');
const tagsToggle = document.getElementById('auto-order-tags');
const status = document.getElementById('site-status');
const recordButton = document.getElementById('record-ui');
const copyButton = document.getElementById('copy-ui');
const recordStatus = document.getElementById('record-status');

function updateRecordStatus({ uiRecording = false, uiEvents = [] }) {
  recordButton.textContent = uiRecording ? 'Dừng ghi nhận' : 'Bắt đầu ghi nhận';
  copyButton.disabled = uiEvents.length === 0;
  recordStatus.textContent = uiRecording
    ? `Đã ghi nhận ${uiEvents.length}/4 thao tác.`
    : uiEvents.length ? `Đã có ${uiEvents.length} thao tác để sao chép.` : '';
}

chrome.storage.local.get({ autoOrder: true, autoPrintNote: true, autoMienSamPrice: false,
  autoSubmitOrder: false, autoOrderTags: false },
  ({ autoOrder, autoPrintNote, autoMienSamPrice, autoSubmitOrder, autoOrderTags }) => {
  toggle.checked = autoOrder;
  noteToggle.checked = autoPrintNote;
  priceToggle.checked = autoMienSamPrice;
  submitToggle.checked = autoSubmitOrder;
  tagsToggle.checked = autoOrderTags;
});
chrome.storage.local.get({ uiRecording: false, uiEvents: [] }, updateRecordStatus);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.autoOrder) toggle.checked = changes.autoOrder.newValue;
  if (changes.autoPrintNote) noteToggle.checked = changes.autoPrintNote.newValue;
  if (changes.autoMienSamPrice) priceToggle.checked = changes.autoMienSamPrice.newValue;
  if (changes.autoSubmitOrder) submitToggle.checked = changes.autoSubmitOrder.newValue;
  if (changes.autoOrderTags) tagsToggle.checked = changes.autoOrderTags.newValue;
  if (changes.uiRecording || changes.uiEvents) {
    chrome.storage.local.get({ uiRecording: false, uiEvents: [] }, updateRecordStatus);
  }
});

toggle.addEventListener('change', () => {
  chrome.storage.local.set({ autoOrder: toggle.checked });
});

noteToggle.addEventListener('change', () => {
  chrome.storage.local.set({ autoPrintNote: noteToggle.checked });
});

priceToggle.addEventListener('change', () => {
  chrome.storage.local.set({ autoMienSamPrice: priceToggle.checked });
});

submitToggle.addEventListener('change', () => {
  chrome.storage.local.set({ autoSubmitOrder: submitToggle.checked });
});

tagsToggle.addEventListener('change', () => {
  chrome.storage.local.set({ autoOrderTags: tagsToggle.checked });
});

recordButton.addEventListener('click', () => {
  chrome.storage.local.get({ uiRecording: false }, ({ uiRecording }) => {
    if (uiRecording) {
      chrome.storage.local.set({ uiRecording: false });
    } else {
      chrome.storage.local.set({ autoOrder: false, uiRecording: true, uiEvents: [] });
    }
  });
});

copyButton.addEventListener('click', async () => {
  const { uiEvents = [] } = await chrome.storage.local.get({ uiEvents: [] });
  await navigator.clipboard.writeText(JSON.stringify(uiEvents, null, 2));
  recordStatus.textContent = 'Đã sao chép. Bạn có thể dán kết quả vào cuộc trò chuyện này.';
});

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  const isPancake = /^https:\/\/(?:[^/]+\.)?pancake\.vn\/multi_pages(?:[/?#]|$)/.test(tab?.url || '');
  status.textContent = isPancake
    ? 'Đang hoạt động trên trang Hội thoại.'
    : 'Mở trang Hội thoại của Pancake để sử dụng.';
});
