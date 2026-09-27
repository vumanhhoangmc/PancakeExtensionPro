const { test } = require('node:test');
const assert = require('node:assert/strict');
const { summarizeProducts } = require('./product-summary');

test('nhân quy cách theo số lượng và cộng cùng loại', () => {
  assert.equal(summarizeProducts([
    { name: '(2026) 1KG Miến Sâm Sợi Nhỏ', quantity: '1' },
    { name: '1Kg Miến Sâm Sợi To', quantity: '2' },
    { name: '(2026) 2KG Miến Sâm Sợi To', quantity: '2' }
  ]), '1kg miến sâm nhỏ + 6kg miến sâm to');
});

test('giữ lại sản phẩm không có quy cách và không ghi chú thiếu số lượng', () => {
  assert.equal(summarizeProducts([{ name: 'Măng khô', quantity: '2' }]), '2 x măng khô');
  assert.equal(summarizeProducts([{ name: '1KG Miến Sâm', quantity: '' }]), null);
});

test('bỏ tiền tố năm có khoảng trắng trước dấu đóng', () => {
  assert.equal(summarizeProducts([{ name: '(2026 ) 2Kg Miến Sợi Nhỏ', quantity: 1 }]),
    '2kg miến sợi nhỏ');
});
