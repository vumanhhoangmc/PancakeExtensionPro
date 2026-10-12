const {test} = require('node:test');
const assert = require('node:assert/strict');
const {validateDelivery, validateDraft, chooseSku, matchRegion, productKind} = require('./ai-order-plan.js');
const delivery = {detail:'UBND',province:'Hải Phòng',district:'Ngô Quyền',commune:'Đông Khê',system:'old',evidence:'về UBND phường Đông Khê Ngô Quyền Hải Phòng cũ'};
const transcript = 'Khách: 1 to 1 nhỏ về UBND phường Đông Khê Ngô Quyền Hải Phòng cũ';
const proposal = {intent:'confirmed',delivery,items:[{product:'miến sâm nhỏ',kg:1,evidence:'1 nhỏ'}]};
test('Required administrative levels, evidence and known address system',()=>{
  assert.equal(validateDraft(proposal,transcript).delivery.detail,'UBND');
  for(const bad of [null,{...delivery,province:null},{...delivery,commune:null},{...delivery,system:null},{...delivery,district:null},{...delivery,evidence:'ở Hà Nội'}]) assert.throws(()=>validateDraft({...proposal,delivery:bad},transcript));
  for(const intent of ['inquiry','unclear','cancelled']) assert.throws(()=>validateDraft({...proposal,intent},transcript));
  assert.throws(()=>validateDelivery({...delivery,province:34}));
  assert.throws(()=>validateDraft({...proposal,delivery:{...delivery,detail:'Số nhà 123 UBND'}},transcript));
  assert.equal(validateDelivery(null),null);
});
test('New address can omit district; district is never inferred',()=>{
  const result=validateDraft({...proposal,delivery:{...delivery,system:'new',district:null}},transcript);
  assert.equal(result.delivery.district,null);
});
test('Screenshot address with tphcm is complete even though AI expands administrative names',()=>{
  const evidence='Khách: 105 châu thị hoá, phường chánh hưng( quận 8 cũ), tphcm';
  const chat='Khách: Lấy mình 5kg\n'+evidence;
  const draft=validateDraft({intent:'confirmed',items:[{product:'Cam rốn lồi',kg:5,evidence:'Khách: Lấy mình 5kg'}],delivery:{system:'old',detail:'105 Châu Thị Hoá',province:'Thành phố Hồ Chí Minh',district:'Quận 8',commune:'Phường Chánh Hưng',evidence}},chat);
  assert.equal(draft.delivery.province,'Thành phố Hồ Chí Minh');
  assert.equal(draft.delivery.district,'Quận 8');
});
test('Old requires province/district/commune; new requires province/commune; detail optional',()=>{
  assert.equal(validateDraft({...proposal,delivery:{...delivery,detail:null}},transcript).delivery.detail,'');
  const newAddress=validateDraft({...proposal,delivery:{...delivery,system:'new',detail:null}},transcript).delivery;
  assert.equal(newAddress.detail,'');
  assert.equal(newAddress.district,null);
  for(const system of ['old','new']) for(const key of ['province','commune']) {
    assert.throws(()=>validateDraft({...proposal,delivery:{...delivery,system,[key]:null}},transcript));
  }
  assert.throws(()=>validateDraft({...proposal,delivery:{...delivery,district:null}},transcript));
});
test('Exact region match handles accents/prefix, but refuses ambiguous or substring match',()=>{
  assert.equal(matchRegion('dong khe',['Phường Đông Khê','Phường Đông Hải']),'Phường Đông Khê');
  assert.throws(()=>matchRegion('Phú',['Xã Phú Xuân','Xã Phú Hòa']));
  assert.throws(()=>matchRegion('Phú Xuân',['Xã Phú Xuân','Phường Phú Xuân']));
});
test('SKU pack size determines quantity, exact pack or one kg fallback',()=>{
  const catalog=[{name:'(2026) 1KG Miến Sâm Sợi To',code:'TO1'},{name:'(2026) 2KG Miến Sâm Sợi To',code:'TO2'},{name:'(2026) 1KG Miến Sâm Sợi Nhỏ',code:'NHO1'}];
  assert.equal(chooseSku({product:'miến sâm to',kg:2},catalog).code,'TO2');
  assert.equal(chooseSku({product:'miến sâm to',kg:4},catalog).quantity,4);
  assert.equal(chooseSku({product:'miến sâm nhỏ',kg:2},catalog).quantity,2);
  assert.throws(()=>chooseSku({product:'miến sâm to',kg:1.5},catalog));
  assert.throws(()=>chooseSku({product:'miến sâm to',kg:1},[...catalog,{name:'(2026) 1KG Miến Sâm Sợi To',code:'OTHER'}]));
});
test('User mappings for cam and khoai; keep different product types separate',()=>{
  assert.equal(productKind('cam'),'cam rốn lồi');
  assert.equal(productKind('(2026) 3KG Khoai Sọ Mán'),'khoai sọ mán');
  assert.equal(productKind('1KG Miến Sâm Đất Sợi Nhỏ'),'miến sâm nhỏ');
  assert.equal(productKind('1KG Miến Đậu Xanh'),null);
  assert.equal(chooseSku({product:'cam',kg:6},[{name:'3KG Cam Rốn Lồi',code:'CAM3'}]).quantity,2);
  assert.equal(chooseSku({product:'khoai sọ',kg:5},[{name:'5KG Khoai Sọ Mán',code:'KHOAI5'}]).quantity,1);
});
test('Live Khoai Sọ Mán Mộc Châu catalog selects KH1/KH2 with correct quantities',()=>{
  const catalog=[{name:'3Kg Khoai Sọ Mán Mộc Châu',code:'KH1'},{name:'5Kg Khoai Sọ Mán Mộc Châu',code:'KH2'}];
  assert.equal(productKind('Khoai Sọ Mán Mộc Châu'),'khoai sọ mán');
  for(const [kg,code,quantity] of [[3,'KH1',1],[5,'KH2',1],[6,'KH1',2],[10,'KH2',2]]) {
    const selected=chooseSku({product:'khoai sọ',kg},catalog);
    assert.equal(selected.code,code);
    assert.equal(selected.quantity,quantity);
  }
  const draft=validateDraft({...proposal,items:[{product:'Khoai Sọ Mán Mộc Châu',kg:5,evidence:'5kg khoai sọ mán Mộc Châu'}]},transcript+' 5kg khoai sọ mán Mộc Châu');
  assert.equal(draft.items[0].kg,5);
  assert.throws(()=>chooseSku({product:'khoai sọ',kg:4},catalog));
  assert.equal(productKind('5Kg Khoai Sọ Mán Mộc Châu + Cam rốn lồi'),null);
  assert.equal(productKind('3Kg Khoai Sọ Trắng Mộc Châu'),null);
});
test('Full product names supplied by shop map to exact packs and separate noodle sizes',()=>{
  const catalog=[
    {name:'3Kg Cam Rốn Lồi Không Hạt Mộc Châu',code:'CAM1'},
    {name:'5Kg Cam Rốn Lồi Không Hạt Mộc Châu',code:'CAM2'},
    {name:'(2026) 2Kg Miến Sợi Nhỏ',code:'MSS08'},
    {name:'(2026) 2kg Miến Sâm Sợi To',code:'MSS02'},
    {name:'(2026) 1Kg Miến Sâm Sợi To',code:'MSS01'},
    {name:'(2026) 3kg Miến Sâm Sợi To',code:'MSS03'},
    {name:'(2026) 1Kg Miến Sâm Sợi Nhỏ',code:'MSS04'}
  ];
  for(const [product,kg,code,quantity] of [['cam',3,'CAM1',1],['cam',5,'CAM2',1],['Cam Rốn Lồi Không Hạt Mộc Châu',6,'CAM1',2],['miến sâm nhỏ',2,'MSS08',1],['miến sâm nhỏ',4,'MSS04',4],['miến sâm to',2,'MSS02',1],['miến sâm to',3,'MSS03',1],['miến sâm to',5,'MSS01',5]]) {
    const selected=chooseSku({product,kg},catalog);
    assert.equal(selected.code,code);
    assert.equal(selected.quantity,quantity);
  }
  assert.equal(chooseSku({product:'miến sâm nhỏ',kg:2},[{name:'(2026 ) 2Kg Miến Sâm Sợi Nhỏ',code:'MSS08'}]).code,'MSS08');
  assert.equal(productKind('3Kg Cam Rốn Lồi Không Hạt Mộc Châu + Khoai sọ'),null);
  assert.equal(productKind('(2026) 1Kg Miến Dong Sợi Nhỏ'),null);
});
