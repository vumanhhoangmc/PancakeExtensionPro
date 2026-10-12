(function(root) {
  'use strict';
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim();
  function validateDelivery(value) {
    if (value === null) return null;
    if (!value || typeof value !== 'object' || !['old', 'new', null].includes(value.system)) throw new Error('Địa chỉ AI không đúng cấu trúc.');
    const result = { system: value.system };
    for (const key of ['detail', 'province', 'district', 'commune', 'evidence']) {
      if (value[key] !== null && (typeof value[key] !== 'string' || value[key].length > 600 || /[\u0000-\u0008]/.test(value[key]))) throw new Error('Trường địa chỉ AI không hợp lệ.');
      result[key] = typeof value[key] === 'string' ? value[key].trim() : null;
    }
    return result;
  }
  function validateDraft(proposal, transcript) {
    if (proposal?.intent !== 'confirmed' || !Array.isArray(proposal.items) || !proposal.items.length || proposal.items.length > 20) throw new Error('Khách chưa chốt một đơn có sản phẩm rõ ràng.');
    const delivery = validateDelivery(proposal.delivery);
    if (!delivery?.province || !delivery.commune || !delivery.system || (delivery.system === 'old' && !delivery.district)) throw new Error('Địa chỉ chưa đủ cấp hành chính: địa chỉ cũ cần tỉnh/huyện/xã; địa chỉ mới cần tỉnh/xã.');
    delivery.detail = delivery.detail || '';
    if (delivery.system === 'new') delivery.district = null;
    if (!delivery.evidence || !normalize(transcript).includes(normalize(delivery.evidence))) throw new Error('Không đối chiếu được lời khách cung cấp địa chỉ. Đọc và phân tích lại.');
    const evidence = ` ${normalize(delivery.evidence).replace(/[^a-z0-9]+/g, ' ')} `;
    // AI may expand abbreviations (tphcm, q8...) into catalog names. Completeness
    // depends on administrative levels; selectAddress still checks the POS catalog.
    if ((delivery.detail.match(/\d+/g) || []).some(number => !evidence.includes(` ${number} `))) throw new Error('Số nhà/đường chưa có bằng chứng trong chat.');
    if (/\[.*(?:ẩn|hidden).*\]/i.test(delivery.detail)) throw new Error('Địa chỉ chi tiết vẫn bị ẩn.');
    const items = proposal.items.map(item => {
      if (typeof item.product !== 'string' || item.product.length > 160 || !Number.isFinite(item.kg) || item.kg <= 0 || item.kg > 1000 || typeof item.evidence !== 'string' || !item.evidence.trim() || item.evidence.length > 600) throw new Error('Sản phẩm/khối lượng chưa đủ rõ để điền đơn.');
      if (!normalize(transcript).includes(normalize(item.evidence))) throw new Error('Không đối chiếu được lời chốt sản phẩm trong chat. Phân tích lại trước khi điền.');
      if (!productKind(item.product)) throw new Error('Beta điền đơn hỗ trợ Miến Sâm to/nhỏ, Cam rốn lồi và Khoai sọ mán. Sản phẩm khác cần lên đơn thủ công.');
      return { product: item.product, kg: item.kg, evidence: item.evidence };
    });
    const merged = new Map();
    for (const item of items) {
      const kind = productKind(item.product);
      const prior = merged.get(kind);
      merged.set(kind, { ...item, kg: (prior?.kg || 0) + item.kg });
    }
    return { delivery, items: [...merged.values()] };
  }
  function productKind(name) {
    const text = normalize(name).replace(/^\(\s*\d{4}\s*\)\s*/, '').replace(/\d+(?:[.,]\d+)?\s*(?:kg|g)\b/g, '').replace(/\s+/g, ' ').trim();
    if (['cam', 'cam ron loi', 'cam ron loi khong hat', 'cam ron loi khong hat moc chau'].includes(text)) return 'cam rốn lồi';
    // Shop catalog appends the origin to this product's name; keep explicit aliases
    // so another potato variety or a mixed combo cannot match by substring.
    if (['khoai so', 'khoai so man', 'khoai so man moc chau'].includes(text)) return 'khoai sọ mán';
    const match = text.match(/^mien (?:sam(?: dat)?\s+)?(?:soi\s+)?(to|nho)$/);
    return match ? `miến sâm ${match[1] === 'nho' ? 'nhỏ' : 'to'}` : null;
  }
  function packKg(name) {
    const match = normalize(name).match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*(kg|g)\b/);
    return match ? Number(match[1].replace(',', '.')) / (match[2] === 'g' ? 1000 : 1) : null;
  }
  function chooseSku(item, catalog) {
    const kind = productKind(item.product);
    const candidates = catalog.filter(sku => kind && productKind(sku.name) === kind && packKg(sku.name) > 0)
      .map(sku => ({ ...sku, pack: packKg(sku.name), quantity: item.kg / packKg(sku.name) }))
      .filter(sku => Number.isInteger(sku.quantity) && sku.quantity > 0 && sku.quantity <= 1000);
    const exact = candidates.filter(sku => sku.pack === item.kg);
    const one = candidates.filter(sku => sku.pack === 1);
    const pool = exact.length ? exact : one.length ? one : candidates.filter(sku => sku.pack === Math.max(...candidates.map(sku => sku.pack)));
    if (pool.length !== 1) throw new Error(pool.length ? `Có nhiều SKU phù hợp cho ${item.kg}kg ${kind}: ${pool.map(s => `${s.name} [${s.code}]`).join('; ')}. Chọn sản phẩm thủ công.` : `Không có quy cách SKU phù hợp cho ${item.kg}kg ${kind}.`);
    return pool[0];
  }
  function matchRegion(wanted, options) {
    const strip = text => normalize(text).replace(/^(?:tinh|thanh pho|tp\.?|huyen|quan|thi xa|xa|phuong|thi tran)\s+/, '');
    const exact = options.filter(option => normalize(option) === normalize(wanted));
    const matches = exact.length ? exact : options.filter(option => strip(option) === strip(wanted));
    if (matches.length !== 1) {
      const error = new Error(`Không tìm được duy nhất địa chỉ “${wanted}” trong danh mục Pancake.`);
      error.code = matches.length ? 'REGION_AMBIGUOUS' : 'REGION_NOT_FOUND';
      throw error;
    }
    return matches[0];
  }
  const api = { normalize, validateDelivery, validateDraft, productKind, packKg, chooseSku, matchRegion };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PancakeAIOrderPlan = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
