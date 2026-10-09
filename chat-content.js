(() => {
  'use strict';
  let snapshot = null;
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id || !['pap-read-chat', 'pap-check-chat'].includes(message?.type)) return;
    chrome.storage.local.get({ aiAutoOrderBeta: false }, ({ aiAutoOrderBeta }) => {
      try {
        if (!aiAutoOrderBeta) throw new Error('Bật AI Beta trong popup trước khi đọc hội thoại.');
        if (!/^\/multi_pages(?:[/?#]|$)/.test(location.pathname)) throw new Error('Chỉ đọc hội thoại trên trang Pancake.');
        const row = document.querySelector('.conversation-list-item.selected');
        if (!row) throw new Error('Chọn một hội thoại rồi chờ tải xong trước.');
        const data = PancakeChatReader.collectMessages(document);
        if (message.type === 'pap-check-chat') {
          if (!snapshot || snapshot.key !== message.key || snapshot.row !== row || snapshot.signature !== data.signature) throw new Error('Hội thoại/tin nhắn đã thay đổi. Đọc lại trước khi phân tích.');
          return sendResponse({ ok: true });
        }
        snapshot = { key: crypto.randomUUID(), row, signature: data.signature };
        const { signature, ...preview } = data;
        sendResponse({ ok: true, key: snapshot.key, ...preview });
      } catch (error) { snapshot = null; sendResponse({ ok: false, error: error.message }); }
    });
    return true;
  });
})();
