const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateDiscount } = require('./pricing');

test('Khoai Sọ Mán Mộc Châu: 3kg x 2 giảm 20k, 5kg x 2 giảm 20k', () => {
  assert.deepEqual(calculateDiscount([{ name: '3Kg Khoai Sọ Mán Mộc Châu', quantity: '2' }], 260000),
    { kilograms: 6, targetTotal: 240000, discount: 20000 });
  assert.deepEqual(calculateDiscount([{ name: '5Kg Khoai Sọ Mán Mộc Châu', quantity: 2 }], 400000),
    { kilograms: 10, targetTotal: 380000, discount: 20000 });
  assert.deepEqual(calculateDiscount([
    { name: '3Kg Khoai Sọ Mán Mộc Châu', quantity: 1 },
    { name: '3Kg Khoai Sọ Mán Mộc Châu', quantity: 1 }
  ], 260000), { kilograms: 6, targetTotal: 240000, discount: 20000 });
});

test('Khoai chỉ giảm ở mốc được cung cấp và không tăng giá hay áp cho đơn lẫn loại', () => {
  const taro = (kg, quantity = 1) => ({ name: `${kg}KG Khoai Sọ Mán Mộc Châu`, quantity });
  for (const total of [230000, 240000]) assert.equal(calculateDiscount([taro(3, 2)], total).discount, 0);
  for (const kg of [3, 5, 8, 9, 12]) assert.equal(calculateDiscount([taro(kg)], 500000), null);
  assert.equal(calculateDiscount([taro(5), { name: '1KG Miến Sâm Sợi To', quantity: 1 }], 500000), null);
  assert.equal(calculateDiscount([{ name: '1KG Miến Sâm Sợi To', quantity: 1 }, taro(5)], 500000), null);
  assert.equal(calculateDiscount([{ name: '3Kg Khoai Sọ', quantity: 2 }], 260000), null);
  assert.equal(calculateDiscount([{ name: '3Kg Khoai Sọ Mán Mộc Châu loại khác', quantity: 2 }], 260000), null);
});

test('áp dụng đúng từng mốc giá', () => {
  const prices = new Map([[1, 90000], [2, 140000], [3, 199000], [4, 260000],
    [5, 325000], [6, 390000], [10, 600000]]);
  for (const [kg, target] of prices) {
    assert.deepEqual(calculateDiscount([{ name: '(2026) 1KG Miến Sâm Sợi To', quantity: kg }], target + 20000),
      { kilograms: kg, targetTotal: target, discount: 20000 });
    for (const total of [target, target - 1000]) {
      assert.equal(calculateDiscount([{ name: `${kg}KG Miến Sâm Sợi Nhỏ`, quantity: 1 }], total).discount, 0);
    }
  }
});

test('cộng số kg của các loại miến sâm và nhân số lượng', () => {
  assert.deepEqual(calculateDiscount([
    { name: '(2026 ) 2Kg Miến Sợi Nhỏ', quantity: '1' },
    { name: '1KG Miến Sâm Sợi To', quantity: '1' }
  ], 240000), { kilograms: 3, targetTotal: 199000, discount: 41000 });
});

test('không giảm khi tổng tiền bằng hoặc dưới giá mốc', () => {
  const products = [{ name: '2KG Miến Sâm Sợi To', quantity: 1 }];
  assert.equal(calculateDiscount(products, 140000).discount, 0);
  assert.equal(calculateDiscount(products, 130000).discount, 0);
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
