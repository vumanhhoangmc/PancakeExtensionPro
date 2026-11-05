(() => {
  'use strict';

  const prices = new Map([
    [1, 90000], [2, 140000], [3, 199000], [4, 260000],
    [5, 325000], [6, 390000], [10, 600000]
  ]);
  const taroPrices = new Map([[6, 240000], [10, 380000]]);

  function calculateDiscount(products, orderTotal) {
    if (!Array.isArray(products) || products.length === 0 ||
        !Number.isSafeInteger(orderTotal) || orderTotal < 0) return null;

    let grams = 0;
    let priceTable = null;
    for (const product of products) {
      const name = String(product.name || '').replace(/^\(\s*\d{4}\s*\)\s*/, '').trim();
      const quantity = Number(String(product.quantity).replace(',', '.'));
      const size = name.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*(kg|g)(?=\s|$)/i);
      if (!name || !size || !Number.isSafeInteger(quantity) || quantity <= 0) return null;
      const type = name.replace(size[0], ' ').replace(/\s+/g, ' ').trim();
      // Pancake also has a "Miến Sợi Nhỏ/To" variant whose name omits "Sâm".
      const table = /^miến\s+sâm(?:\s+sợi\s+(?:nhỏ|to))?$/i.test(type) ||
        /^miến\s+sợi\s+(?:nhỏ|to)$/i.test(type) ? prices :
        /^khoai sọ mán mộc châu$/i.test(type) ? taroPrices : null;
      if (!table || (priceTable && table !== priceTable)) return null;
      priceTable = table;
      const amount = Number(size[1].replace(',', '.'));
      if (!Number.isFinite(amount) || amount <= 0) return null;
      grams += amount * (size[2].toLowerCase() === 'kg' ? 1000 : 1) * quantity;
    }

    const kilograms = grams / 1000;
    const targetTotal = priceTable.get(kilograms);
    if (targetTotal === undefined) return null;
    return { kilograms, targetTotal, discount: Math.max(0, orderTotal - targetTotal) };
  }

  globalThis.PancakePricing = { calculateDiscount };
  if (typeof module !== 'undefined' && module.exports) module.exports = { calculateDiscount };
})();
