const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateDiscount } = require('./pricing');

test('áp dụng đúng từng mốc giá', () => {
  const prices = new Map([[1, 95000], [2, 160000], [3, 220000], [4, 280000],
    [5, 350000], [6, 420000], [10, 600000]]);
  for (const [kg, target] of prices) {
    assert.deepEqual(calculateDiscount([{ name: '(2026) 1KG Miến Sâm Sợi To', quantity: kg }], target + 20000),
      { kilograms: kg, targetTotal: target, discount: 20000 });
  }
});

test('cộng số kg của các loại miến sâm và nhân số lượng', () => {
  assert.deepEqual(calculateDiscount([
    { name: '(2026 ) 2Kg Miến Sợi Nhỏ', quantity: '1' },
    { name: '1KG Miến Sâm Sợi To', quantity: '1' }
  ], 240000), { kilograms: 3, targetTotal: 220000, discount: 20000 });
});

test('không giảm khi tổng tiền bằng hoặc dưới giá mốc', () => {
  const products = [{ name: '2KG Miến Sâm Sợi To', quantity: 1 }];
  assert.equal(calculateDiscount(products, 160000).discount, 0);
  assert.equal(calculateDiscount(products, 150000).discount, 0);
});

test('bỏ qua mốc chưa có giá, sản phẩm khác và dữ liệu không hợp lệ', () => {
  for (const kg of [7, 8, 9, 11, 1.5]) {
    assert.equal(calculateDiscount([{ name: `${kg}KG Miến Sâm Sợi To`, quantity: 1 }], 1000000), null);
  }
  assert.equal(calculateDiscount([{ name: '1KG Miến Sâm', quantity: 1 },
    { name: '1KG Miến Dong', quantity: 1 }], 200000), null);
  assert.equal(calculateDiscount([{ name: '1KG Miến Sợi Nhỏ', quantity: 1 },
    { name: '1KG Miến Khoai', quantity: 1 }], 200000), null);
  assert.equal(calculateDiscount([{ name: 'Miến Sâm Sợi To', quantity: 1 }], 200000), null);
  assert.equal(calculateDiscount([{ name: '1KG Miến Sâm', quantity: '' }], 200000), null);
});
