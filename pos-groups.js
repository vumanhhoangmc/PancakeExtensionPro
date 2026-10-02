(() => {
  'use strict';

  const format = (n) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(n);

  function normalizeName(raw) {
    return String(raw || '').replace(/^\(\s*\d{4}\s*\)\s*/, '')
      .replace(/\s+/g, ' ').trim().toLocaleLowerCase('vi-VN');
  }

  function parseListProduct(text) {
    const match = String(text || '').trim().match(/^(.+?)\s+x\s+(\d+)$/i);
    return match ? [{ name: match[1], quantity: Number(match[2]) }] : null;
  }

  function composition(products) {
    if (!Array.isArray(products) || !products.length) return null;
    const parts = new Map();
    for (const product of products) {
      const name = normalizeName(product.name);
      const quantity = Number(String(product.quantity ?? '').replace(',', '.'));
      if (!name || !Number.isSafeInteger(quantity) || quantity <= 0) return null;
      const size = name.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*(kg|g)(?=\s|$)/i);
      if (size) {
        const amount = Number(size[1].replace(',', '.'));
        if (!Number.isFinite(amount) || amount <= 0) return null;
        let label = name.replace(size[0], ' ').replace(/\s+/g, ' ').trim()
          .replace(/^miến\s+(?:sâm\s+)?sợi\s+(nhỏ|to)$/i, 'miến sâm $1');
        if (!label) return null;
        const key = `kg:${label}`;
        parts.set(key, (parts.get(key) || 0) +
          amount * (size[2].toLowerCase() === 'g' ? 0.001 : 1) * quantity);
      } else {
        const key = `item:${name}`;
        parts.set(key, (parts.get(key) || 0) + quantity);
      }
    }
    const entries = [...parts].sort(([a], [b]) => a.localeCompare(b, 'vi'));
    const key = JSON.stringify(entries.map(([name, amount]) => [name, Math.round(amount * 1000) / 1000]));
    const label = entries.map(([name, amount]) => name.startsWith('kg:')
      ? `${format(amount)}kg ${name.slice(3)}` : `${format(amount)} x ${name.slice(5)}`).join(' + ');
    return { key, label };
  }

  function groupOrders(orders) {
    const groups = new Map();
    const unclassified = [];
    for (const order of orders) {
      const result = composition(order.products);
      if (!result || !order.rowKey || !order.id) {
        unclassified.push(order);
        continue;
      }
      if (!groups.has(result.key)) groups.set(result.key, { ...result, orders: [] });
      groups.get(result.key).orders.push(order);
    }
    return { groups: [...groups.values()].sort((a, b) =>
      b.orders.length - a.orders.length || a.label.localeCompare(b.label, 'vi')), unclassified };
  }

  globalThis.PancakePosGroups = { parseListProduct, composition, groupOrders };
  if (typeof module !== 'undefined' && module.exports) module.exports = { parseListProduct, composition, groupOrders };
})();
