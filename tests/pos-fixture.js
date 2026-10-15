'use strict';
const stage=document.querySelector('#stage'), report=document.querySelector('#report');
const listeners=[];
window.chrome={storage:{local:{get(_,fn){fn({posGroupPrint:true});}},onChanged:{addListener(fn){listeners.push(fn);}}}};
const setEnabled=value=>listeners.forEach(fn=>fn({posGroupPrint:{newValue:value}},'local'));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const until=async(fn,timeout=7000)=>{const end=Date.now()+timeout;while(Date.now()<end){if(fn())return;await pause(20);}throw Error('Hết thời gian chờ');};
let selection=new Set(), orders=[], clicks=0, printClicks=0, hoverDelay=0, afterSelect=null;
function setup(count=24){
  selection=new Set();clicks=0;printClicks=0;hoverDelay=0;afterSelect=null;
  orders=Array.from({length:count},(_,i)=>({key:'r'+i,lines:i%3===0?['1KG Miến Sâm Sợi Nhỏ x 1','2KG Miến Sâm Sợi To x 1']:i%3===1?['2KG Miến Sâm Sợi To x 1']:['1KG Miến Sâm Sợi Nhỏ x 1']}));
  stage.innerHTML='<label class="ant-radio-button-wrapper-checked"><span class="status-title">Mới</span><span class="ant-tag">'+count+'</span></label><p id="selected-count">Đã chọn: 0</p><div class="ant-table-tbody-virtual-holder"><div id="spacer"></div><div id="rows" style="position:absolute;left:0;top:0"></div></div><div class="order-action-list ant-popover-hidden"></div><div class="action-btn-container"><div class="ant-space-compact"><button id="native-print">In mô phỏng<svg><path d="M214.67,72"></path></svg></button></div></div>';
  const holder=stage.querySelector('.ant-table-tbody-virtual-holder');
  document.querySelector('#spacer').style.height=count*42+'px';
  let hoverTimer;
  const render=()=>{
    const first=Math.floor(holder.scrollTop/42), rows=document.querySelector('#rows');
    rows.style.top=first*42+'px';rows.replaceChildren();
    for(const order of orders.slice(first,first+7)){
      const row=document.createElement('div');row.className='ant-table-row';row.dataset.rowKey=order.key;
      for(let i=0;i<10;i++){const cell=document.createElement('div');cell.className='ant-table-cell';row.append(cell);}
      row.children[0].classList.add('ant-table-selection-column');
      const input=document.createElement('input');input.type='checkbox';input.checked=selection.has(order.key);row.children[0].append(input);
      input.onclick=()=>{clicks++;input.checked?selection.add(order.key):selection.delete(order.key);document.querySelector('#selected-count').textContent='Đã chọn: '+selection.size;render();afterSelect?.();};
      row.children[1].innerHTML='<span class="order-id-column"><a>'+order.key+'</a></span>';
      const text=document.createElement('span');text.textContent=order.lines.length>1?'Nhiều sản phẩm':order.lines[0];row.children[9].append(text);
      text.onmouseover=()=>{clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>{const tip=document.querySelector('.order-action-list');tip.replaceChildren();for(const line of order.lines){const e=document.createElement('div');e.className='ant-menu-title-content';e.textContent=line;tip.append(e);}tip.classList.remove('ant-popover-hidden');},hoverDelay);};
      text.onmouseout=()=>{clearTimeout(hoverTimer);document.querySelector('.order-action-list').classList.add('ant-popover-hidden');};
      rows.append(row);
    }
  };
  holder.onscroll=render;render();document.querySelector('#native-print').onclick=()=>printClicks++;
}
const status=()=>document.querySelector('#pap-pos-status')?.textContent||'';
const cards=()=>[...document.querySelectorAll('.pap-pos-group')];
const select=card=>card.querySelector('button');
async function reset(count=24){setEnabled(false);await pause(200);history.replaceState(null,'',location.pathname);setup(count);setEnabled(true);document.querySelector('#pap-pos-launcher').click();}
async function scan(){document.querySelector('#pap-pos-scan').click();await until(()=>status().startsWith('Đã đọc'));}
document.querySelector('#run').onclick=async()=>{
  document.querySelector('#run').disabled=true;report.replaceChildren();let passed=0,total=0;
  const check=async(name,fn)=>{total++;const line=document.createElement('div');try{await fn();line.textContent='PASS '+name;line.className='pass';passed++;}catch(e){line.textContent='FAIL '+name+': '+e.message;line.className='fail';}report.append(line);};
  await check('Quét 24 đơn ảo; tooltip tái sử dụng; đúng 3 nhóm, mỗi nhóm 8 đơn',async()=>{await reset();const start=performance.now();await scan();assert(cards().length===3&&cards().every(c=>c.querySelector('strong').textContent.endsWith('— 8 đơn')),'Sai nhóm');report.dataset.scanMs=Math.round(performance.now()-start);});
  await check('Chọn nhóm → nút xám vẫn bấm lại; React thay hàng checkbox',async()=>{select(cards()[0]).click();await until(()=>status().startsWith('Đã chọn 8'));assert(selection.size===8&&select(cards()[0]).classList.contains('pap-pos-selected')&&!select(cards()[0]).disabled,'Sai trạng thái');select(cards()[0]).click();await pause(100);await until(()=>status().startsWith('Đã chọn 8'));assert(selection.size===8,'Chọn lại sai');});
  await check('Đổi nhóm bỏ hết nhóm cũ; Clear bỏ chọn và xóa kết quả',async()=>{select(cards()[1]).click();await pause(100);await until(()=>status().startsWith('Đã chọn 8'));assert(selection.size===8,'Sai số đơn');document.querySelector('#pap-pos-clear').click();await until(()=>status().startsWith('Đã xóa'));assert(selection.size===0&&cards().length===0,'Clear chưa sạch');});
  await check('Hộp thoại đã ẩn không chặn quét',async()=>{await reset(3);const m=document.createElement('div');m.className='ant-modal';m.role='dialog';m.style.display='none';stage.append(m);await scan();assert(cards().length===3,'Modal ẩn chặn');});
  await check('Tooltip tải 1 giây vẫn đọc đủ sản phẩm',async()=>{await reset(1);hoverDelay=1000;await scan();assert(cards().length===1&&status().includes('0 đơn cần xem lại'),'Bỏ sót tooltip chậm');});
  await check('Tắt tính năng khi đang chọn: không click thêm checkbox',async()=>{await reset();await scan();let countAtStop;afterSelect=()=>{afterSelect=null;setEnabled(false);countAtStop=clicks;};select(cards()[0]).click();await until(()=>countAtStop!==undefined);await pause(800);assert(clicks===countAtStop,'Vẫn chọn đơn sau khi tắt');});
  await check('Tắt/bật nhanh giữa quét: kết quả cũ không xuất hiện lại',async()=>{await reset();hoverDelay=500;document.querySelector('#pap-pos-scan').click();await pause(100);setEnabled(false);setEnabled(true);await pause(800);assert(cards().length===0,'Kết quả cũ sống lại');});
  await check('Đổi URL giữa chọn: dừng trước checkbox tiếp theo',async()=>{await reset();await scan();let countAtStop;afterSelect=()=>{afterSelect=null;history.replaceState(null,'','?filter=changed');countAtStop=clicks;};select(cards()[0]).click();await until(()=>countAtStop!==undefined);await pause(800);assert(clicks===countAtStop,'Vẫn chọn sau đổi bộ lọc');history.replaceState(null,'',location.pathname);});
  await check('Đổi trạng thái lọc cùng URL: dừng chọn nhóm cũ',async()=>{await reset();await scan();let countAtStop;afterSelect=()=>{afterSelect=null;document.querySelector('.status-title').textContent='Đã gửi';countAtStop=clicks;};select(cards()[0]).click();await until(()=>countAtStop!==undefined);await pause(800);assert(clicks===countAtStop,'Vẫn chọn nhóm của trạng thái cũ');});
  await check('Chặn in trong khi chọn lại nhóm; chỉ mở in khi đã xong',async()=>{await reset();await scan();const card=cards()[0];select(card).click();await until(()=>status().startsWith('Đã chọn 8'));select(card).click();card.querySelectorAll('button')[1].click();assert(printClicks===0,'Mở in khi còn đang chọn');await pause(100);await until(()=>status().startsWith('Đã chọn 8'));card.querySelectorAll('button')[1].click();assert(printClicks===1,'Không mở in sau hoàn tất');});
  await check('Chọn thiếu: chặn in và Clear bỏ được phần đã chọn',async()=>{await reset();await scan();const missing=cards()[0].querySelector('small').textContent.match(/r\d+/)[0];orders=orders.filter(o=>o.key!==missing);select(cards()[0]).click();await until(()=>status().includes('chưa đủ'));cards()[0].querySelectorAll('button')[1].click();assert(printClicks===0,'Cho in thiếu');document.querySelector('#pap-pos-clear').click();await until(()=>status().startsWith('Đã xóa'));assert(selection.size===0&&cards().length===0,'Không clear được phần chọn thiếu');});
  const end=document.createElement('strong');end.textContent=`${passed}/${total} đạt — quét 24 đơn: ${report.dataset.scanMs} ms (mô phỏng)`;report.append(end);document.querySelector('#run').disabled=false;
};
setup();
