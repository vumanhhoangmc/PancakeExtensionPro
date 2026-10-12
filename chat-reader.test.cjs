const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildTranscript, collectMessages } = require('./chat-reader.js');

test('Preserves order and customer/shop roles for changed order and acceptance', () => {
  const result = buildTranscript([
    {role:'customer',text:'Lấy 3kg đi ạ'},
    {role:'customer',text:'Lấy phân nửa to phân nửa nhỏ'},
    {role:'shop',text:'Em gửi 2kg to + 1kg nhỏ nha'},
    {role:'customer',text:'Dạ'},
  ]);
  assert.equal(result.text,'Khách: Lấy 3kg đi ạ\nKhách: Lấy phân nửa to phân nửa nhỏ\nShop: Em gửi 2kg to + 1kg nhỏ nha\nKhách: Dạ');
  assert.equal(result.count,4);
});
test('Filters contact/address/link and distinguishes media and unknown roles', () => {
  const result = buildTranscript([
    {role:'customer',text:'Sđt 0977139813 / +84 977 139 813'},
    {role:'customer',text:'xã Phú Xuân, huyện Phú Tân'},
    {role:'shop',text:'Gọi 0777.778.531 hoặc abc@example.com https://example.com'},
    {role:'shop',text:'Đã đặt giai đoạn của khách hàng thành Đủ tiêu chuẩn'},
    {role:'customer',text:'',media:true},
    {role:'unknown',text:'Lấy 100kg'},
  ]);
  for(const secret of ['0977139813','977 139','Phú Xuân','0777.778.531','abc@example.com','https://','100kg']) assert.equal(result.text.includes(secret),false);
  assert.equal(result.media,1); assert.equal(result.unknown,1); assert.equal(result.filtered,2);
});
test('Rejects missing DOM or empty text rather than analyzing another region', () => {
  assert.throws(()=>collectMessages({querySelector(){return null;}}));
  assert.throws(()=>collectMessages({querySelector(){return {querySelectorAll(){return [];}};}}));
});
test('Address mode preserves customer address while phones remain filtered',()=>{
  const result=buildTranscript([{role:'customer',text:'UBND phường Đông Khê quận Ngô Quyền Hải Phòng cũ\n0915028970'}],{includeAddress:true});
  assert.ok(result.text.includes('Đông Khê'));
  assert.ok(result.text.includes('[SĐT đã ẩn]'));
  assert.equal(result.text.includes('0915028970'),false);
});
test('Latest customer phone is local only, detects two recipient numbers',()=>{
  const doc = texts => ({querySelector(){return {querySelectorAll(){return texts.map(text=>({id:'',classList:{contains(role){return role==='media-current-customer';}},querySelectorAll(){return [{innerText:text}];},querySelector(){return null;}}));}};}});
  const one=collectMessages(doc(['0900000000','SĐT mới +84 900 000 001']),{includeAddress:true});
  assert.equal(one.contactPhone,'0900000001');assert.equal(one.phoneConflict,false);
  assert.equal(one.text.includes('900 000'),false);
  const two=collectMessages(doc(['0900000000','0900000001 hoặc 0900000002']),{includeAddress:true});
  assert.equal(two.contactPhone,null);assert.equal(two.phoneConflict,true);
});
