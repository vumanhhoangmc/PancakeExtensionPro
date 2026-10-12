(() => {
  'use strict';
  let snapshot = null, applying = false, cancelled = false;
  chrome.storage.onChanged?.addListener((changes, area) => {
    if (area === 'local' && ((changes.aiAutoOrderBeta && !changes.aiAutoOrderBeta.newValue) || changes.uiRecording?.newValue)) cancelled = true;
  });
  document.addEventListener?.('click', event => { if (applying && event.isTrusted) cancelled = true; }, true);
  document.addEventListener?.('input', event => { if (applying && event.isTrusted) cancelled = true; }, true);
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id || !['pap-read-chat', 'pap-check-chat', 'pap-apply-draft'].includes(message?.type)) return;
    chrome.storage.local.get({ aiAutoOrderBeta: false, uiRecording: false }, async ({ aiAutoOrderBeta, uiRecording }) => {
      try {
        if (!aiAutoOrderBeta || uiRecording) throw new Error('Bật AI Beta và dừng ghi nhận giao diện trước.');
        if (!/^\/multi_pages(?:[/?#]|$)/.test(location.pathname)) throw new Error('Chỉ đọc hội thoại trên trang Pancake.');
        if (applying) throw new Error('Đang điền đơn nháp. Chờ hoàn tất trước.');
        const row = document.querySelector('.conversation-list-item.selected');
        if (!row) throw new Error('Chọn một hội thoại rồi chờ tải xong trước.');
        const data = PancakeChatReader.collectMessages(document, { includeAddress: message.includeAddress === true });
        if (message.type !== 'pap-read-chat') {
          if (!snapshot || snapshot.key !== message.key || snapshot.row !== row || snapshot.signature !== data.signature || snapshot.used) throw new Error('Hội thoại/tin nhắn đã thay đổi hoặc đã dùng kết quả này. Đọc lại trước khi phân tích.');
          if (message.type === 'pap-check-chat') return sendResponse({ ok: true });
          if (!snapshot.includeAddress) throw new Error('Đọc lại hội thoại có địa chỉ trước khi điền đơn.');
          if (snapshot.phoneConflict) throw new Error('Tin khách gần nhất chứa nhiều SĐT. Chọn thông tin nhận hàng và lên đơn thủ công để tránh dùng nhầm số.');
          PancakeAIOrderPlan.validateDraft(message.proposal, message.transcript);
          snapshot.used = true; applying = true; cancelled = false;
          const currentSnapshot = snapshot;
          const current = () => {
            if (cancelled || snapshot !== currentSnapshot || document.querySelector('.conversation-list-item.selected') !== row || PancakeChatReader.collectMessages(document).signature !== currentSnapshot.signature || !/^\/multi_pages(?:[/?#]|$)/.test(location.pathname)) throw new Error('Hội thoại/Beta đã thay đổi hoặc bạn vừa thao tác. Đã dừng; xem lại đơn nháp trước khi thử tiếp.');
          };
          try {
            const draft = await PancakeAIOrderDOM.applyDraft(message.proposal, message.transcript, current, currentSnapshot.contactPhone);
            return sendResponse({ ok: true, draft });
          } finally { applying = false; }
        }
        snapshot = { key: crypto.randomUUID(), row, signature: data.signature, contactPhone: data.contactPhone, phoneConflict: data.phoneConflict, includeAddress: message.includeAddress === true, used: false };
        const { signature, contactPhone, phoneConflict, ...preview } = data;
        sendResponse({ ok: true, key: snapshot.key, ...preview });
      } catch (error) { if (!applying) snapshot = null; sendResponse({ ok: false, error: error.message }); }
    });
    return true;
  });
})();
