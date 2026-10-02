const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseListProduct, composition, groupOrders } = require('./pos-groups');

test('đọc đúng sản phẩm đơn từ ô danh sách POS', () => {
  assert.deepEqual(parseListProduct('(2026) 2KG Miến Sâm Sợi To  x 1'),
    [{ name: '(2026) 2KG Miến Sâm Sợi To', quantity: 1 }]);
  assert.equal(parseListProduct('Nhiều sản phẩm'), null);
});

test('đọc đủ các dòng của bảng nổi Nhiều sản phẩm', () => {
  const lines = [
    '2KG MIẾN SÂM ĐẤT SỢI TO  x 1',
    '1KG MIẾN SÂM SỢI NHỎ  x 1'
  ];
  const products = lines.flatMap((line) => parseListProduct(line) || []);
  assert.equal(products.length, lines.length);
  assert.equal(composition(products).label,
    '2kg miến sâm đất sợi to + 1kg miến sâm nhỏ');
});

test('gom cùng thành phần dù quy cách và thứ tự dòng khác nhau', () => {
  const a = composition([
    { name: '(2026) 2KG Miến Sâm Sợi To', quantity: 1 },
    { name: '(2026 ) 1KG Miến Sợi Nhỏ', quantity: 1 }
  ]);
  const b = composition([
    { name: '1KG Miến Sâm Sợi Nhỏ', quantity: 1 },
    { name: '1KG Miến Sâm Sợi To', quantity: 2 }
  ]);
  assert.deepEqual(a, b);
  assert.equal(a.label, '1kg miến sâm nhỏ + 2kg miến sâm to');
});

test('tách nhóm theo loại, khối lượng và sản phẩm khác', () => {
  const orders = [
    { id: '1', rowKey: 'a', products: [{ name: '1KG Miến Sâm Sợi Nhỏ', quantity: 1 }] },
    { id: '2', rowKey: 'b', products: [{ name: '1KG Miến Sâm Sợi To', quantity: 1 }] },
    { id: '3', rowKey: 'c', products: [{ name: '1KG Miến Sâm Sợi Nhỏ', quantity: 2 }] },
    { id: '4', rowKey: 'd', products: [{ name: '1KG Miến Sâm Sợi Nhỏ', quantity: 1 }] },
    { id: '5', rowKey: 'e', products: [{ name: 'Măng khô', quantity: 2 }] }
  ];
  const { groups } = groupOrders(orders);
  assert.equal(groups.length, 4);
  assert.deepEqual(groups[0].orders.map(x => x.id), ['1', '4']);
  assert.equal(groups.find(x => x.label === '2 x măng khô').orders.length, 1);
});

test('không phân nhóm đơn thiếu tên hoặc số lượng', () => {
  const { groups, unclassified } = groupOrders([
    { id: '1', rowKey: 'a', products: [{ name: 'Miến Sâm', quantity: '' }] },
    { id: '2', rowKey: 'b', products: [{ name: '1KG Miến Sâm', quantity: 1 }] }
  ]);
  assert.equal(groups.length, 1);
  assert.deepEqual(unclassified.map(x => x.id), ['1']);
});
