'use strict';
// This fixture contains no Pancake account data and never contacts Pancake.
const settings = { autoOrder: true, autoPrintNote: true, autoMienSamPrice: true, autoSubmitOrder: false, autoOrderTags: true, uiRecording: false, uiEvents: [] };
const storageListeners = [];
chrome.storage = {
  local: {
    get(defaults, callback) { callback({ ...defaults, ...settings }); },
    set(values) {
      const changes = {};
      for (const [key, value] of Object.entries(values)) {
        changes[key] = { oldValue: settings[key], newValue: value };
        settings[key] = value;
      }
      for (const listener of storageListeners) listener(changes, 'local');
    }
  },
  onChanged: { addListener(listener) { storageListeners.push(listener); } }
};
const originalObserver = MutationObserver;
let activeObservers = 0;
window.MutationObserver = class extends originalObserver {
  constructor(callback) { super(callback); this.extensionObserver = new Error().stack.includes('/content.js'); }
  observe(...args) { if (this.extensionObserver && !this.counted) { activeObservers++; this.counted = true; } super.observe(...args); }
  disconnect() { if (this.counted) { activeObservers--; this.counted = false; } super.disconnect(); }
};
const rows = [...document.querySelectorAll('.conversation-list-item')];
const tabs = [...document.querySelectorAll('.tab-label-item')];
const panel = document.querySelector('#panel');
// The native Pancake sidebar has no .crm-platform wrapper.
const orderPane = panel.closest('.crm-platform');
if (location.hash === '#native') {
  orderPane.id = 'customerCol';
  orderPane.classList.remove('crm-platform');
  orderPane.style.width = '500px';
  tabs[1].textContent = 'Tạo đơn';
}
let generation = 0;
let state;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw Error(message); };
async function until(test, timeout = 2000) {
  const end = performance.now() + timeout;
  while (!test() && performance.now() < end) await delay(5);
  assert(test(), 'Không đạt trạng thái mong đợi');
}
function later(action, ms) {
  const token = generation;
  setTimeout(() => { if (token === generation) action(); }, ms);
}
function reset(options = {}) {
  generation++;
  chrome.storage.local.set({ autoOrder: false, autoPrintNote: true, autoMienSamPrice: true, autoSubmitOrder: false, autoOrderTags: false, uiRecording: false, uiEvents: [] });
  state = { selected: 0, products: [], total: 0, discount: 0, savedNote: '', created: 0, tabClicks: 0, addressPicks: [], noteDelay: 25, saveDelay: 25, priceDelay: 20, suggestionDelay: 20, revertDelay: 0, failCreate: false, noSuggestions: false, ...options };
  rows.forEach((row, i) => row.classList.toggle('selected', i === 0));
  document.querySelector('.recent-orders').replaceChildren();
  document.querySelector('#tags').innerHTML = ['Đã Lên Đơn', 'Đã Gửi', 'Báo Giá', 'Miến Sâm'].map(name => `<button class="btn-tag-item">${['Báo Giá', 'Miến Sâm'].includes(name) ? '<span class="ellipse"></span>' : ''}${name}</button>`).join('');
  showInfo();
}
function showInfo() {
  document.querySelector('#suggestions')?.remove();
  tabs.forEach((tab, i) => tab.classList.toggle('active', i === 0));
  panel.innerHTML = '<p>Thông tin khách mô phỏng</p>';
}
function showForm() {
  tabs.forEach((tab, i) => tab.classList.toggle('active', i === 1));
  panel.innerHTML = `<div class="view-order"><div class="customer-address"><input placeholder="Địa chỉ" role="combobox" aria-controls="suggestions"></div><div id="products"></div><div class="content-order-payment"><label><input type="checkbox">Miễn phí giao hàng</label><div class="row-content-payment"><span>Tổng giá trị đơn hàng</span><span id="total"></span></div><div class="row-content-payment"><span>Giảm giá</span><input class="ant-input-number-input" value="${state.discount}"></div></div><div class="note-print-order"><span>Ghi chú in</span><button class="add-note">Thêm ghi chú</button></div></div><div class="box-footer"><span class="text-final-price"></span><button class="btn-save-order">Tạo đơn</button></div>`;
  renderProducts();
  panel.querySelector('.customer-address input').addEventListener('click', event => {
    const input = event.target;
    const customer = state.selected;
    later(() => {
      if (!input.isConnected || state.noSuggestions) return;
      document.querySelector('#suggestions')?.remove();
      const list = document.createElement('div');
      list.id = 'suggestions'; list.setAttribute('role', 'listbox');
      const rect = input.getBoundingClientRect();
      list.style.left = `${rect.left + scrollX}px`; list.style.top = `${rect.bottom + scrollY}px`;
      list.innerHTML = Array.from({ length: 100 }, (_, i) => `<div role="option">Địa chỉ ${customer + 1} — gợi ý ${i + 1}</div>`).join('');
      list.addEventListener('click', event => {
        const option = event.target.closest('[role=option]');
        if (!option) return;
        input.value = option.textContent;
        state.addressPicks.push(customer);
        list.remove();
      });
      document.body.append(list);
    }, state.suggestionDelay);
  });
  panel.querySelector('.add-note').addEventListener('click', () => later(() => {
    const section = panel.querySelector('.note-print-order');
    if (!section) return;
    section.innerHTML = '<span>Ghi chú in</span><textarea></textarea><button class="btn-cancel-note">Lưu</button>';
    section.querySelector('textarea').addEventListener('input', event => { state.receivedNote = event.target.value; });
    section.querySelector('button').addEventListener('click', () => {
      const value = state.receivedNote;
      later(() => { state.savedNote = value; section.innerHTML = '<span>Ghi chú in</span><div class="note-text"></div>'; section.querySelector('.note-text').textContent = value; }, state.saveDelay);
    });
  }, state.noteDelay));
  const discount = panel.querySelector('.row-content-payment input');
  discount.addEventListener('input', () => later(() => { state.discount = Number(discount.value); renderMoney(); }, state.priceDelay));
  panel.querySelector('.btn-save-order').addEventListener('click', () => {
    if (state.failCreate) return;
    state.created++;
    later(() => {
      const card = document.createElement('div');
      card.className = 'ant-collapse-header'; card.textContent = String(9000 + state.created);
      document.querySelector('.recent-orders').append(card);
    }, 20);
  });
}
function renderMoney() {
  if (!panel.querySelector('#total')) return;
  panel.querySelector('#total').textContent = `${state.total.toLocaleString('vi-VN')} đ`;
  panel.querySelector('.text-final-price').textContent = `${(state.total - state.discount).toLocaleString('vi-VN')} đ`;
}
function renderProducts() {
  panel.querySelector('#products').innerHTML = state.products.map(product => `<div class="row-table-product"><div class="col-product-name"><div class="info-order-item"><span class="font-weight-500">${product.name}</span></div></div><div class="table-product"><div class="ant-col-4"><input class="ant-input-number-input" value="${product.quantity}"></div></div></div>`).join('');
  renderMoney();
}
function draft(products, total, settingsOverride = {}, options = {}) {
  reset({ products, total, ...options });
  showForm();
  chrome.storage.local.set(settingsOverride);
}
function tick() { panel.querySelector('input[type=checkbox]').click(); }
function selectedTags() { return [...document.querySelectorAll('.btn-tag-item')].filter(tag => tag.querySelector('.ellipse')).map(tag => tag.textContent); }
rows.forEach((row, i) => row.addEventListener('click', () => {
  state.selected = i;
  rows.forEach((r, index) => r.classList.toggle('selected', index === i));
  showInfo();
  if (state.revertDelay) later(showInfo, state.revertDelay);
}));
tabs[0].addEventListener('click', showInfo);
tabs[1].addEventListener('click', () => { state.tabClicks++; showForm(); });
document.querySelector('#tags').addEventListener('click', event => {
  const tag = event.target.closest('.btn-tag-item');
  if (!tag) return;
  if (tag.querySelector('.ellipse')) tag.querySelector('.ellipse').remove();
  else { const dot = document.createElement('span'); dot.className = 'ellipse'; tag.prepend(dot); }
});
reset();
const small = quantity => ({ name: '(2026) 1KG Miến Sâm Sợi Nhỏ', quantity });
const large = quantity => ({ name: '(2026) 2KG Miến Sâm Sợi To', quantity });
const tests = [
  ['Sáu tag mặc định: chỉ giữ Mua hàng và Đã gửi sau tạo đơn', async () => {
    draft([small(1)], 95000, { autoOrderTags: true });
    const names = ['Kiểm hàng', 'Câu hỏi', 'Mua hàng', 'Đã gửi', 'Hết hàng', 'Trả hàng'];
    document.querySelector('#tags').innerHTML = names.map(name =>
      `<button class="btn-tag-item">${name === 'Kiểm hàng' || name === 'Trả hàng' ? '<span class="ellipse"></span>' : ''}${name}</button>`).join('');
    panel.querySelector('.btn-save-order').click();
    await until(() => selectedTags().join(',') === 'Mua hàng,Đã gửi');
  }],
  ['Sáu tag đổi vị trí: vẫn chọn đúng tên Mua hàng và Đã gửi', async () => {
    draft([small(1)], 95000, { autoOrderTags: true });
    const names = ['Đã gửi', 'Hết hàng', 'Kiểm hàng', 'Trả hàng', 'Câu hỏi', 'Mua hàng'];
    document.querySelector('#tags').innerHTML = names.map(name =>
      `<button class="btn-tag-item">${name === 'Hết hàng' ? '<span class="ellipse"></span>' : ''}${name}</button>`).join('');
    panel.querySelector('.btn-save-order').click();
    await until(() => selectedTags().join(',') === 'Đã gửi,Mua hàng');
  }],
  ['Đơn mới trong order-list: chỉ đổi tag sau ID mới', async () => {
    draft([small(1)], 95000, { autoOrderTags: true });
    const recent = document.querySelector('.recent-orders');
    const container = document.createElement('div'); container.className = 'order-list';
    recent.replaceWith(container); document.body.append(recent);
    try {
      panel.querySelector('.btn-save-order').click();
      const card = document.createElement('div'); card.className = 'ant-collapse-header'; card.textContent = '0000554';
      container.append(card);
      await until(() => selectedTags().join(',') === 'Đã Lên Đơn,Đã Gửi');
      await delay(50);
    } finally { container.replaceWith(recent); }
  }],
  ['Trang mới thiếu một tag đích: giữ nguyên các tag đang tích', async () => {
    draft([small(1)], 95000, { autoOrderTags: true });
    [...document.querySelectorAll('.btn-tag-item')].find(e => e.textContent === 'Đã Gửi').remove();
    panel.querySelector('.btn-save-order').click(); await delay(350);
    assert(selectedTags().join(',') === 'Báo Giá,Miến Sâm', 'Đổi tag một phần khi chưa cấu hình đủ');
  }],
  ['Cột số lượng thu gọn: ghi chú, giảm giá và tạo đúng một đơn', async () => {
    draft([small(3)], 240000, { autoSubmitOrder: true });
    const table = panel.querySelector('.table-product');
    table.querySelector('.ant-col-4').className = 'ant-col-7';
    const price = document.createElement('div'); price.className = 'ant-col-8';
    price.innerHTML = '<input class="ant-input-number-input" value="80000">';
    table.append(price);
    tick();
    await until(() => state.created === 1);
    assert(state.discount === 41000 && state.savedNote === '3kg miến sâm nhỏ', 'Nhầm số lượng/đơn giá');
    await delay(250); assert(state.created === 1, 'Tạo đơn lặp');
  }],
  ['Đổi bố cục rộng sang nhỏ: giữ đúng số lượng và cập nhật ghi chú', async () => {
    draft([small(1)], 95000); await until(() => state.receivedNote === '1kg miến sâm nhỏ');
    const column = panel.querySelector('.ant-col-4'); column.className = 'ant-col-7';
    const input = column.querySelector('input'); input.value = '2';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await until(() => state.receivedNote === '2kg miến sâm nhỏ');
    assert(state.created === 0, 'Tự tạo đơn khi đổi bố cục');
  }],
  ['Hai ô số lượng không rõ ràng: không ghi chú hoặc tạo đơn', async () => {
    draft([small(1)], 95000, { autoSubmitOrder: true });
    const extra = document.createElement('div'); extra.className = 'ant-col-7';
    extra.innerHTML = '<input class="ant-input-number-input" value="90000">';
    panel.querySelector('.table-product').append(extra); tick();
    await delay(350);
    assert(!state.receivedNote && state.created === 0 && state.discount === 0, 'Đoán số lượng khi mơ hồ');
  }],
  ['Chọn sản phẩm: tự mở/điền ghi chú khi chưa tích miễn phí, không tạo đơn', async () => {
    draft([small(1)], 95000, { autoSubmitOrder: true });
    await until(() => state.receivedNote === '1kg miến sâm nhỏ');
    assert(!panel.querySelector('input[type=checkbox]').checked && state.discount === 0 && state.created === 0, 'Tự tích/giảm/tạo đơn');
  }],
  ['Đổi số lượng bằng input: cập nhật ngay, giữ focus ở số lượng', async () => {
    draft([small(1)], 95000); await until(() => !!state.receivedNote);
    const input = panel.querySelector('.row-table-product input'); input.focus(); input.value = '3';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await until(() => state.receivedNote === '3kg miến sâm nhỏ');
    assert(document.activeElement === input, 'Cướp focus');
  }],
  ['Thêm/xóa dòng: chỉ giữ tóm tắt mới nhất', async () => {
    draft([small(1)], 95000); await until(() => !!state.receivedNote);
    state.products.push(large(1)); renderProducts();
    await until(() => state.receivedNote === '1kg miến sâm nhỏ + 2kg miến sâm to');
    state.products = [large(2)]; renderProducts();
    await until(() => state.receivedNote === '4kg miến sâm to');
  }],
  ['Giữ lời dặn riêng; xóa hết sản phẩm chỉ xóa tóm tắt tự sinh', async () => {
    draft([small(1)], 95000); await until(() => !!state.receivedNote);
    panel.querySelector('textarea').value = 'Gọi trước khi giao | 1kg miến sâm nhỏ';
    state.products = [small(2)]; renderProducts();
    await until(() => state.receivedNote === 'Gọi trước khi giao | 2kg miến sâm nhỏ');
    state.products = []; renderProducts();
    await until(() => state.receivedNote === 'Gọi trước khi giao');
  }],
  ['Sửa sản phẩm khi miễn phí đã tích sẵn vẫn không tự tạo đơn', async () => {
    draft([small(1)], 95000, { autoSubmitOrder: true });
    panel.querySelector('input[type=checkbox]').checked = true;
    await until(() => state.receivedNote === '1kg miến sâm nhỏ');
    state.products = [small(2)]; renderProducts();
    await until(() => state.receivedNote === '2kg miến sâm nhỏ');
    assert(state.created === 0 && state.discount === 0, 'Sửa sản phẩm kích hoạt tạo đơn/giá');
  }],
  ['Ghi chú đã lưu: mở sửa và thay tóm tắt, không nhân đôi lời dặn', async () => {
    draft([small(1)], 95000); await until(() => !!state.receivedNote);
    const section = panel.querySelector('.note-print-order');
    section.innerHTML = '<span class="text-note">Gọi trước | 1kg miến sâm nhỏ</span>';
    section.querySelector('.text-note').onclick = () => {
      section.innerHTML = '<textarea>Gọi trước | 1kg miến sâm nhỏ</textarea>';
      section.querySelector('textarea').oninput = event => { state.receivedNote = event.target.value; };
    };
    state.products = [small(2)]; renderProducts();
    await until(() => state.receivedNote === 'Gọi trước | 2kg miến sâm nhỏ');
  }],
  ['Đổi nhanh số lượng: chỉ điền giá trị cuối', async () => {
    draft([small(1)], 95000);
    for (let i = 2; i <= 5; i++) { state.products = [small(i)]; renderProducts(); await delay(20); }
    await until(() => state.receivedNote === '5kg miến sâm nhỏ');
    assert(state.created === 0, 'Tự tạo đơn');
  }],
  ['Tắt ghi chú hoặc đổi hội thoại khi đang chờ: dừng điền', async () => {
    draft([small(1)], 95000); await delay(20); chrome.storage.local.set({ autoPrintNote: false });
    await delay(250); assert(!state.receivedNote, 'Vẫn điền sau tắt');
    draft([small(1)], 95000); await delay(20); rows[1].click(); await delay(250);
    assert(!state.receivedNote, 'Điền sang hội thoại khác');
  }],
  ['Đơn 3kg: giảm 20.000, lưu ghi chú, tạo đúng 1 đơn, chỉ giữ 2 tag', async () => {
    draft([small(1), large(1)], 240000, { autoSubmitOrder: true, autoOrderTags: true });
    const started = performance.now(); tick();
    await until(() => state.created === 1 && selectedTags().join(',') === 'Đã Lên Đơn,Đã Gửi');
    assert(state.discount === 41000 && state.savedNote === '1kg miến sâm nhỏ + 2kg miến sâm to', 'Giá/ghi chú sai');
    await delay(200); assert(state.created === 1, 'Tạo đơn lặp');
    return `ghi chú và tạo đơn hoàn tất trong ${Math.round(performance.now() - started - 200)} ms trên mô phỏng`;
  }],
  ['Tạo thủ công: chỉ điền ghi chú; đổi tag sau nút Tạo đơn', async () => {
    draft([small(2)], 160000, { autoOrderTags: true }); tick();
    await until(() => panel.querySelector('textarea')?.value === '2kg miến sâm nhỏ');
    assert(state.created === 0, 'Tự tạo khi công tắc tắt');
    panel.querySelector('.btn-cancel-note').click(); await until(() => !!state.savedNote);
    panel.querySelector('.btn-save-order').click();
    await until(() => selectedTags().join(',') === 'Đã Lên Đơn,Đã Gửi');
  }],
  ['Đơn lẫn sản phẩm khác: không chỉnh giá', async () => {
    draft([small(1), { name: '1KG Khoai Sọ', quantity: 1 }], 160000); tick();
    await until(() => !!panel.querySelector('textarea')?.value);
    assert(state.discount === 0 && state.created === 0, 'Chỉnh giá đơn hỗn hợp');
  }],
  ['7kg không có mốc: không chỉnh giá', async () => {
    draft([small(7)], 560000); tick(); await until(() => !!panel.querySelector('textarea')?.value);
    assert(state.discount === 0, 'Chỉnh giá 7kg');
  }],
  ['Giá thấp hơn mốc: giữ giảm giá hiện có', async () => {
    draft([small(3)], 190000, {}, { discount: 1000 }); tick(); await until(() => !!panel.querySelector('textarea')?.value);
    assert(state.discount === 1000, 'Ghi đè giảm giá');
  }],
  ['Tắt ghi chú và giá: không sửa form', async () => {
    draft([small(3)], 240000, { autoPrintNote: false, autoMienSamPrice: false }); tick(); await delay(120);
    assert(!panel.querySelector('textarea') && state.discount === 0 && state.created === 0, 'Công tắc tắt vẫn chạy');
  }],
  ['Đổi hội thoại nhanh: địa chỉ chỉ được chọn cho hội thoại cuối', async () => {
    reset({ suggestionDelay: 100 }); chrome.storage.local.set({ autoOrder: true });
    rows[0].click(); await until(() => state.tabClicks === 1); rows[1].click();
    await until(() => state.addressPicks.length === 1);
    assert(state.addressPicks[0] === 1, 'Chọn địa chỉ hội thoại cũ');
  }],
  ['Pancake trả về Thông tin: mở lại ngay sau thay đổi DOM', async () => {
    reset({ revertDelay: 260 }); chrome.storage.local.set({ autoOrder: true }); rows[0].click();
    await until(() => state.tabClicks === 2 && state.addressPicks.length === 2);
    assert(tabs[1].classList.contains('active'), 'Không phục hồi Tạo mới');
  }],
  ['Bật ghi nhận giữa chừng: hủy mở form còn chờ', async () => {
    reset(); chrome.storage.local.set({ autoOrder: true }); rows[0].click();
    chrome.storage.local.set({ uiRecording: true }); await delay(260);
    assert(state.tabClicks === 0, 'Vẫn mở form trong ghi nhận');
  }],
  ['Tắt Hỗ trợ lên đơn giữa chừng: hủy thao tác cũ', async () => {
    reset(); chrome.storage.local.set({ autoOrder: true }); rows[0].click();
    chrome.storage.local.set({ autoOrder: false }); await delay(260);
    assert(state.tabClicks === 0, 'Vẫn mở form khi tắt');
  }],
  ['Đổi sản phẩm trong lúc mở ghi chú: không ghi tóm tắt cũ', async () => {
    draft([small(1)], 80000, { autoSubmitOrder: true }, { noteDelay: 120 }); tick();
    await delay(30); state.products = [small(2)]; renderProducts();
    await until(() => state.receivedNote === '2kg miến sâm nhỏ');
    assert(state.created === 0, 'Tạo sai đơn');
  }],
  ['Bỏ miễn phí giao hàng giữa chừng: hủy ghi chú và tạo đơn', async () => {
    draft([small(1)], 80000, { autoSubmitOrder: true }, { noteDelay: 120 }); tick();
    await delay(30); tick(); await delay(180);
    assert(!state.receivedNote && state.created === 0, 'Không hủy sau bỏ tích');
  }],
  ['Đổi hội thoại trong lúc lưu ghi chú: không tạo đơn', async () => {
    draft([small(1)], 80000, { autoSubmitOrder: true }, { saveDelay: 150 }); tick();
    await until(() => !!state.receivedNote); rows[1].click(); await delay(220);
    assert(state.created === 0, 'Tạo đơn sang hội thoại khác');
  }],
  ['Tạo đơn lỗi: giữ nguyên tag', async () => {
    draft([small(1)], 80000, { autoOrderTags: true }, { failCreate: true });
    panel.querySelector('.btn-save-order').click(); await delay(350);
    assert(selectedTags().join(',') === 'Báo Giá,Miến Sâm', 'Đổi tag khi tạo lỗi');
  }],
  ['Không có gợi ý địa chỉ: không tự điền; thu hồi bộ theo dõi DOM', async () => {
    reset({ noSuggestions: true }); chrome.storage.local.set({ autoOrder: true }); rows[0].click();
    await until(() => state.tabClicks === 1);
    await until(() => activeObservers === 1, 6000);
    assert(state.addressPicks.length === 0 && activeObservers === 1, 'Không dọn observer tạm/điền địa chỉ tự đoán');
  }]
];
document.querySelector('#run-tests').addEventListener('click', async event => {
  event.target.disabled = true;
  const results = document.querySelector('#results'); results.replaceChildren();
  for (const [name, run] of tests) {
    const item = document.createElement('li'); results.append(item); item.textContent = `${name}…`;
    try { const note = await run(); item.className = 'pass'; item.textContent = `ĐẠT — ${name}${note ? ` (${note})` : ''}`; }
    catch (error) { item.className = 'fail'; item.textContent = `LỖI — ${name}: ${error.message}`; }
  }
  reset(); await until(() => activeObservers === 1); event.target.disabled = false;
  document.querySelector('#manual-status').textContent = `Hoàn tất: ${results.querySelectorAll('.pass').length}/${tests.length}. Observer còn hoạt động: ${activeObservers}`;
});
document.querySelector('#manual-test').addEventListener('click', () => {
  reset({ suggestionDelay: 1200, revertDelay: 800 }); chrome.storage.local.set({ autoOrder: true }); rows[0].click();
  document.querySelector('#manual-status').textContent = 'Bấm tab Thông tin trong khi đang chọn địa chỉ. Form phải giữ ở Thông tin.';
  later(() => {
    document.querySelector('#manual-status').textContent = tabs[0].classList.contains('active') && state.addressPicks.length === 0
      ? 'ĐẠT — Thao tác tay được ưu tiên, không chọn địa chỉ hoặc mở lại form.'
      : 'LỖI — Extension chưa nhường thao tác tay.';
  }, 2000);
});
