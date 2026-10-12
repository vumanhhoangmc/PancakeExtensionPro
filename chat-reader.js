(function(root) {
  'use strict';
  function buildTranscript(records, { includeAddress = false } = {}) {
    let filtered = 0, media = 0, unknown = 0;
    const lines = [];
    for (const record of records) {
      if (!['customer', 'shop'].includes(record.role)) { unknown++; continue; }
      let text = String(record.text || '').trim();
      if (!text) { if(record.media) media++; continue; }
      if (/^(?:\[POS Reply\]|Đã đặt giai đoạn của khách hàng|Đơn hàng PKE)/i.test(text)) { filtered++; continue; }
      // Conservative first pass, not a guarantee that all personal data is removed.
      text = text.split('\n').map(line => {
        if (!includeAddress && /(?:địa chỉ|đc\s*:|\b(?:xã|huyện|phường|quận|thôn|xóm)\s+\S)/iu.test(line)) { filtered++; return '[Đã ẩn dòng địa chỉ]'; }
        return line.replace(/(?:\+?84|0)[\s.()-]*\d(?:[\s.()-]*\d){7,10}/g, '[SĐT đã ẩn]').replace(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g,'[Email đã ẩn]').replace(/https?:\/\/\S+/g,'[Link đã ẩn]');
      }).join('\n');
      lines.push(`${record.role === 'customer' ? 'Khách' : 'Shop'}: ${text}`);
      if (record.media) media++;
    }
    return { text: lines.join('\n'), count: lines.length, filtered, media, unknown };
  }
  function collectMessages(doc, options) {
    const list = doc.querySelector('.message-list.media-list-conversation');
    if (!list) throw new Error('Không thấy danh sách tin nhắn. Mở một hội thoại Pancake trước.');
    const records = [...list.querySelectorAll('.inbox-message-ele')].map(node => ({
      id: node.id,
      role: node.classList.contains('media-current-customer') ? 'customer' : node.classList.contains('media-current-user') ? 'shop' : 'unknown',
      text: [...node.querySelectorAll('.media-body .message-text-ele')].map(e => e.innerText || e.textContent || '').join('\n'),
      media: Boolean(node.querySelector('.media-body img, .media-body video, .media-body audio')),
    }));
    if (!records.length) throw new Error('Tin nhắn chưa tải. Chờ hội thoại tải xong rồi đọc lại.');
    const transcript = buildTranscript(records, options);
    if (!transcript.count) throw new Error('Không có tin nhắn văn bản có vai trò rõ ràng để phân tích.');
    if (transcript.text.length > 8000) throw new Error('Phần chat đã tải dài hơn 8.000 ký tự. Chọn đoạn mua hàng ngắn hơn ở chế độ mẫu; không tự cắt mất ngữ cảnh.');
    let contactPhone = null, phoneConflict = false;
    for (const record of records.filter(r => r.role === 'customer')) {
      const phones = [...new Set((record.text.match(/(?:\+?84|0)(?:[ .()-]*\d){9}\b/g) || [])
        .map(p => p.replace(/\D/g, '').replace(/^84/, '0')).filter(p => /^0\d{9}$/.test(p)))];
      if (phones.length) { contactPhone = phones.length === 1 ? phones[0] : null; phoneConflict = phones.length > 1; }
    }
    return { ...transcript, contactPhone, phoneConflict, signature: JSON.stringify(records) };
  }
  const api = { buildTranscript, collectMessages };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PancakeChatReader = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
