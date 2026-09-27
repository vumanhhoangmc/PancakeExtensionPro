(() => {
  'use strict';

  function summarizeProducts(products) {
    if (!Array.isArray(products) || products.length === 0) return null;
    const groups = new Map();

    for (const product of products) {
      const quantity = Number(String(product.quantity).replace(',', '.'));
      const rawName = String(product.name || '').trim();
      if (!rawName || !Number.isFinite(quantity) || quantity <= 0) return null;

      const name = rawName.replace(/^\(\s*\d{4}\s*\)\s*/, '').trim();
      const size = name.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*(kg|g)(?=\s|$)/i);
      if (size) {
        const amount = Number(size[1].replace(',', '.'));
        if (!Number.isFinite(amount) || amount <= 0) return null;
        const kg = (size[2].toLowerCase() === 'g' ? amount / 1000 : amount) * quantity;
        const label = name.replace(size[0], ' ').replace(/\s+/g, ' ').trim()
          .replace(/\bmiến\s+sâm\s+sợi\b/gi, 'miến sâm').toLowerCase();
        if (!label) return null;
        const key = `kg:${label}`;
        const old = groups.get(key);
        groups.set(key, { label, kg: (old?.kg || 0) + kg });
      } else {
        const label = name.toLowerCase();
        const key = `item:${label}`;
        const old = groups.get(key);
        groups.set(key, { label, quantity: (old?.quantity || 0) + quantity });
      }
    }

    const format = (number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(number);
    return [...groups.values()].map((item) => item.kg !== undefined
      ? `${format(item.kg)}kg ${item.label}`
      : `${format(item.quantity)} x ${item.label}`).join(' + ');
  }

  globalThis.PancakeProductSummary = { summarizeProducts };
  if (typeof module !== 'undefined' && module.exports) module.exports = { summarizeProducts };
})();
