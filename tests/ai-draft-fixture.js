'use strict';
const stage = document.getElementById('stage');
const report = document.getElementById('report');
let catalog, mode, level, selected, created = 0, freeClicked = 0;
let searchDelay = 0, searchGeneration = 0, newOnlyCommune = false, duplicateCommune = false;
const sku = (name,code) => ({name,code});
const originalCatalog = [sku('(2026) 1Kg Miến Sâm Sợi To','MSS01'),{...sku('(2026) 2kg Miến Sâm Sợi To','MSS02'),productCode:'MSS 02'},sku('(2026) 1Kg Miến Sâm Sợi Nhỏ','MSS04'),sku('(2026) 2Kg Miến Sợi Nhỏ','MSS08'),sku('(2026) 3kg Miến Sâm Sợi To','MSS03'),sku('3Kg Cam Rốn Lồi Không Hạt Mộc Châu','CAM1'),sku('5Kg Cam Rốn Lồi Không Hạt Mộc Châu','CAM2'),sku('3Kg Khoai Sọ Mán Mộc Châu','KH1'),sku('5Kg Khoai Sọ Mán Mộc Châu','KH2')];
function reset() {
  catalog = [...originalCatalog]; mode='old';level='province';selected={};created=0;freeClicked=0;
  searchDelay=0;searchGeneration++;newOnlyCommune=false;duplicateCommune=false;
  stage.innerHTML = `<div class="crm-platform"><div class="tab-label-item">Tạo mới</div><div class="view-order"><input placeholder="Họ tên" value="Khách thử"><input placeholder="Số điện thoại" value="0900000000"><div class="customer-address"><input placeholder="Địa chỉ"></div><div class="customer-province"><div class="ant-select"><input><span class="ant-select-selection-item"></span></div></div><div id="products"></div><input placeholder="Tìm kiếm sản phẩm"><label><input type="checkbox" id="free">Miễn phí giao hàng</label></div><div class="box-footer"><button>Tạo đơn</button></div></div><div class="ul-result-product ant-select-dropdown" style="display:none"></div><div class="popup-select-address ant-select-dropdown" style="display:none"></div>`;
  const search = stage.querySelector('[placeholder="Tìm kiếm sản phẩm"]');
  search.onclick=()=>renderCatalog(search.value);
  search.oninput=()=>renderCatalog(search.value);
  // Match React changing aria-valuenow after the native input setter/event.
  stage.querySelector('.customer-province input').onclick=()=>{stage.querySelector('.popup-select-address').style.display='block';renderRegions();};
  stage.querySelector('.box-footer button').onclick=()=>created++;
  stage.querySelector('#free').onclick=()=>freeClicked++;
}
function renderCatalog(term) {
  const generation=++searchGeneration;
  const popup=stage.querySelector('.ul-result-product');popup.style.display='block';
  popup.replaceChildren();
  const render=()=>{
  if(generation!==searchGeneration)return;
  for(const item of catalog.filter(s=>PancakeAIOrderPlan.normalize(s.name+' '+s.code).includes(PancakeAIOrderPlan.normalize(term)))) {
    const node=document.createElement('div');node.className='li-variation';
    node.innerHTML='<div class="product-name"><span class="div-name"></span></div><div class="variation-id"></div>';
    node.querySelector('.div-name').textContent=item.name;
    const labels=node.querySelector('.variation-id');
    if(item.productCode) {const productCode=document.createElement('span');productCode.className='ant-tag';productCode.textContent=item.productCode;labels.append(productCode);}
    const code=document.createElement('span');code.className='ant-tag tag-custom-id-variation';code.textContent=item.code;labels.append(code);
    node.onclick=()=>{addRow(item);popup.style.display='none';};popup.append(node);
  }
  };
  if(searchDelay) setTimeout(render,searchDelay); else render();
}
function addRow(item) {
  const row=document.createElement('div');row.className='row-table-product';
  row.innerHTML='<div class="table-product"><div class="col-product-name"><div class="info-order-item"><span class="font-weight-500"></span></div></div><div class="ant-col-4"><input class="ant-input-number-input" value="1" aria-valuenow="1"></div></div>';
  row.querySelector('.font-weight-500').textContent=item.name;
  const input=row.querySelector('input');input.oninput=()=>input.setAttribute('aria-valuenow',input.value);
  stage.querySelector('#products').append(row);
}
function renderRegions() {
  const popup=stage.querySelector('.popup-select-address');popup.replaceChildren();
  for(const system of ['old','new']) {
    const input=document.createElement('input');input.type='radio';input.value=system;input.checked=mode===system;
    input.onclick=()=>{mode=system;level='province';selected={};renderRegions();};popup.append(input);
  }
  const levels=mode==='old'?['province','district','commune']:['province','commune'];
  for(const key of levels) {
    const wrap=document.createElement('div');wrap.setAttribute('data-node-key',key);
    const tab=document.createElement('button');tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(key===level));tab.textContent=key;
    tab.onclick=()=>{level=key;renderRegions();};wrap.append(tab);popup.append(wrap);
  }
  const pane=document.createElement('div');pane.className='ant-tabs-tabpane-active';popup.append(pane);
  const names=level==='province'?['Hải Phòng','Hà Nội']:level==='district'?['Quận Ngô Quyền']:newOnlyCommune&&mode==='old'?['Phường Đông Hải']:duplicateCommune?['Phường Đông Khê','Phường Đông Khê']:['Phường Đông Khê','Phường Đông Hải'];
  for(const name of names) {
    const option=document.createElement('div');option.className='ant-select-item-option';option.textContent=name;
    option.onclick=()=>{
      selected[level]=name;
      if(level==='commune') { stage.querySelector('.ant-select-selection-item').textContent=levels.map(k=>selected[k]).join(', ');popup.style.display='none'; }
      else {level=levels[levels.indexOf(level)+1];renderRegions();}
    };pane.append(option);
  }
}
const delivery={system:'old',detail:'UBND',province:'Hải Phòng',district:'Ngô Quyền',commune:'Đông Khê',evidence:'về UBND phường Đông Khê quận Ngô Quyền Hải Phòng cũ'};
const transcript='Khách: lấy 4kg to + 2kg nhỏ về UBND phường Đông Khê quận Ngô Quyền Hải Phòng cũ';
const proposal={intent:'confirmed',delivery,items:[{product:'miến sâm to',kg:4,evidence:'4kg to'},{product:'miến sâm nhỏ',kg:2,evidence:'2kg nhỏ'}]};
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
document.getElementById('run').onclick=async()=>{
  document.getElementById('run').disabled=true;const results=[];
  const check=async(name,fn)=>{try{await fn();results.push('PASS '+name);}catch(e){results.push('FAIL '+name+': '+e.message);}report.textContent=results.join('\n');};
  const apply=(p=proposal,current=()=>{})=>PancakeAIOrderDOM.applyDraft(p,transcript+'\nKhách: 6kg cam + 5kg khoai',current,'0900000001');
  await check('Địa chỉ cũ + 4kg to/2kg nhỏ → đúng SKU và số lượng; không tạo đơn/tích free',async()=>{
    reset();const result=await apply();assert(result.products[0].code==='MSS01'&&result.products[0].quantity===4&&result.products[1].code==='MSS08'&&result.products[1].quantity===1,'Sai SKU/số lượng');
    assert(stage.querySelector('[placeholder="Địa chỉ"]').value==='UBND','Sai chi tiết');
    assert(stage.querySelector('[placeholder="Số điện thoại"]').value==='0900000001','SĐT local chưa điền');
    assert(created===0&&freeClicked===0,'Đã tạo đơn hoặc tích free');
  });
  await check('Địa chỉ mới chỉ chọn tỉnh/xã',async()=>{reset();await apply({...proposal,delivery:{...delivery,system:'new',district:null}});assert(!stage.querySelector('.ant-select-selection-item').textContent.includes('Ngô Quyền'),'Đã điền huyện cho địa chỉ mới');});
  await check('Cam rốn lồi và khoai sọ mán theo quy cách kg',async()=>{reset();const result=await apply({...proposal,items:[{product:'cam',kg:6,evidence:'6kg cam'},{product:'khoai sọ',kg:5,evidence:'5kg khoai'}]});assert(result.products[0].quantity===2&&result.products[1].quantity===1,'Sai cam/khoai');});
  await check('2kg miến to: đọc riêng MSS02 khi có thêm nhãn MSS 02',async()=>{reset();const result=await apply({...proposal,items:[{product:'miến sâm to',kg:2,evidence:'to'}]});assert(result.products[0].code==='MSS02'&&result.products[0].quantity===1,'Sai mã mẫu mã');assert(created===0&&freeClicked===0,'Đã tạo đơn hoặc tích free');});
  await check('Miến nhỏ có tiền tố (2026 ) vẫn chọn đúng gói 2kg',async()=>{reset();catalog=catalog.map(item=>item.code==='MSS08'?{...item,name:'(2026 ) 2Kg Miến Sâm Sợi Nhỏ'}:item);const result=await apply({...proposal,items:[{product:'miến sâm nhỏ',kg:2,evidence:'2kg nhỏ'}]});assert(result.products[0].code==='MSS08'&&result.products[0].quantity===1,'Sai miến nhỏ');});
  await check('Catalog/SKU tải chậm 1,2 giây: chờ đúng sản phẩm rồi thêm',async()=>{reset();searchDelay=1200;const result=await apply({...proposal,items:[{product:'miến sâm to',kg:2,evidence:'to'}]});assert(result.products[0].code==='MSS02'&&result.products[0].quantity===1,'Sai SKU khi mạng chậm');});
  await check('AI nhầm hệ cũ: chỉ dùng hệ mới khi tỉnh/xã khớp danh mục',async()=>{reset();newOnlyCommune=true;const result=await apply();assert(result.addressSystem==='new','Không xác định hệ mới từ catalog');assert(!result.address.includes('Ngô Quyền'),'Giữ huyện cũ trong địa chỉ mới');});
  await check('Địa danh trùng: dừng, không chuyển hệ để đoán',async()=>{reset();duplicateCommune=true;let rejected=false;try{await apply();}catch(e){rejected=e.code==='REGION_AMBIGUOUS';}assert(rejected&&mode==='old'&&stage.querySelectorAll('.row-table-product').length===0,'Đã đoán khi trùng địa danh');});
  await check('Không có số nhà/đường: điền tỉnh/xã và không chèn chữ null',async()=>{reset();const result=await apply({...proposal,delivery:{...delivery,system:'new',district:null,detail:null}});assert(stage.querySelector('[placeholder="Địa chỉ"]').value==='','Đã điền null');assert(!result.address.startsWith(','),'Địa chỉ có dấu phẩy thừa');});
  await check('SKU trùng: dừng trước khi thêm sản phẩm',async()=>{reset();catalog.push(sku('(2026) 1KG Miến Sâm Sợi To','TOOTHER'));let rejected=false;try{await apply();}catch{rejected=true;}assert(rejected&&stage.querySelectorAll('.row-table-product').length===0,'Không chặn SKU trùng');});
  await check('Form có sản phẩm: giữ nguyên, không thêm trùng',async()=>{reset();addRow(originalCatalog[0]);let rejected=false;try{await apply();}catch{rejected=true;}assert(rejected&&stage.querySelectorAll('.row-table-product').length===1,'Đã thay đổi đơn cũ');});
  await check('Đổi hội thoại giữa lúc chờ: dừng trước khi thêm',async()=>{reset();const begin=Date.now();let rejected=false;try{await apply(proposal,()=>{if(Date.now()-begin>100)throw new Error('đã đổi hội thoại');});}catch{rejected=true;}assert(rejected&&stage.querySelectorAll('.row-table-product').length===0,'Không hủy');});
  report.textContent=results.join('\n')+`\n${results.filter(r=>r.startsWith('PASS')).length}/${results.length} đạt`;document.getElementById('run').disabled=false;
};
