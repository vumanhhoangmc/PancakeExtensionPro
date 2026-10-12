// DOM adapter. Only fills a draft; never clicks free shipping or Create order.
(function(root) {
  'use strict';
  const plan = root.PancakeAIOrderPlan;
  const text = node => (node?.textContent || '').replace(/\s+/g, ' ').trim();
  const visible = node => Boolean(node && node.getBoundingClientRect().width && node.getBoundingClientRect().height && getComputedStyle(node).visibility !== 'hidden' && getComputedStyle(node).display !== 'none');
  const rows = () => [...document.querySelectorAll('.crm-platform .view-order .row-table-product')];
  const rowName = row => text(row.querySelector('.col-product-name .info-order-item > .font-weight-500'));
  const quantityInput = row => row?.querySelector('.table-product > .ant-col-4 input.ant-input-number-input');
  function setInput(input, value) {
    if (!input || input.disabled) throw new Error('Không tìm thấy ô nhập đang hoạt động.');
    input.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  async function wait(find, current, description, timeout = 4000) {
    const start = Date.now();
    do {
      current();
      const result = find();
      if (result) return result;
      await new Promise(resolve => setTimeout(resolve, 50));
    } while (Date.now() - start < timeout);
    const error = new Error(`Chưa xác nhận được ${description}. Kiểm tra form Pancake.`);
    error.code = 'DOM_WAIT_TIMEOUT';
    throw error;
  }
  async function settle(read, current, minimum = 500) {
    const started = Date.now();
    let signature = '', changed = started;
    await wait(() => {
      const next = JSON.stringify(read());
      if (signature !== next) { signature = next; changed = Date.now(); }
      return Date.now() - started >= minimum && Date.now() - changed >= 200;
    }, current, 'danh sách đã tải xong');
  }
  const catalogPopup = () => [...document.querySelectorAll('.ul-result-product')].find(visible);
  const catalogNodes = popup => [...popup.querySelectorAll('.li-variation')];
  const skuData = node => {
    const labels = node.querySelector('.variation-id');
    // The row can display a product code alongside its variation code. Search
    // only the variation label, never the concatenated text of both labels.
    const ids = [...(labels?.querySelectorAll('.tag-custom-id-variation') || [])].map(text).filter(Boolean);
    const codes = [...new Set(ids.length ? ids : labels && labels.querySelectorAll('.ant-tag').length <= 1 ? [text(labels)] : [])];
    return { name: text(node.querySelector('.product-name .div-name')), code: codes.length === 1 ? codes[0] : '' };
  };
  async function searchCatalog(term, current) {
    const input = document.querySelector('.crm-platform input[placeholder="Tìm kiếm sản phẩm"]');
    if (!visible(input)) throw new Error('Không thấy tìm kiếm sản phẩm POS trong form.');
    current(); input.click(); setInput(input, term);
    const popup = await wait(catalogPopup, current, 'bảng tìm sản phẩm');
    await wait(() => catalogNodes(catalogPopup() || popup).some(node => {
      const sku = skuData(node);
      const kind = plan.productKind(sku.name);
      return term === '2026' ? kind?.startsWith('miến') && /\(\s*2026\s*\)/.test(sku.name) : kind && kind === plan.productKind(term);
    }), current, `danh mục ${term}`, 8000);
    await settle(() => catalogNodes(popup).map(skuData), current);
    const holder = popup.querySelector('.rc-virtual-list-holder');
    const found = new Map();
    if (holder) holder.scrollTop = 0;
    for (let step = 0; step < 100; step++) {
      await settle(() => catalogNodes(popup).map(skuData), current, 200);
      if (input.value !== term || !visible(popup)) throw new Error('Bộ tìm sản phẩm đã thay đổi. Dừng điền đơn.');
      for (const node of catalogNodes(popup)) {
        const sku = skuData(node);
        if (sku.name && sku.code) found.set(`${sku.name}\n${sku.code}`, sku);
      }
      if (!holder || holder.scrollTop + holder.clientHeight >= holder.scrollHeight - 2) {
        input.blur();
        return [...found.values()];
      }
      const before = holder.scrollTop;
      holder.scrollTop = Math.min(holder.scrollHeight - holder.clientHeight, before + Math.max(100, holder.clientHeight * .8));
      holder.dispatchEvent(new Event('scroll', { bubbles: true }));
      if (holder.scrollTop === before) throw new Error('Không quét đủ danh mục SKU. Chọn sản phẩm thủ công.');
    }
    throw new Error('Danh mục quá dài; chưa quét đủ SKU.');
  }
  const addressPopup = () => [...document.querySelectorAll('.popup-select-address')].find(visible);
  async function selectAddress(delivery, current) {
    async function chooseSystem(system) {
    const input = document.querySelector('.crm-platform .customer-province input');
    current(); if (!addressPopup()) input.click();
    let popup = await wait(addressPopup, current, 'bộ chọn địa chỉ');
    const mode = popup.querySelector(`input[type="radio"][value="${system}"]`);
    if (!mode) throw new Error('Pancake không có chế độ địa chỉ đã nhận diện.');
    if (!mode.checked) { mode.click(); await settle(() => text(addressPopup()), current, 200); }
    const levels = system === 'old' ? ['province', 'district', 'commune'] : ['province', 'commune'];
    const selected = [];
    for (const level of levels) {
      popup = await wait(addressPopup, current, 'bộ chọn địa chỉ');
      const tab = popup.querySelector(`[data-node-key="${level}"] [role="tab"]`);
      if (!tab || tab.getAttribute('aria-disabled') === 'true') throw new Error(`Không mở được cấp ${level}.`);
      current(); tab.click();
      await wait(() => addressPopup()?.querySelector(`[data-node-key="${level}"] [role="tab"]`)?.getAttribute('aria-selected') === 'true', current, 'tab địa chỉ');
      popup = addressPopup();
      await settle(() => text(popup.querySelector('.ant-tabs-tabpane-active')), current, 200);
      let option;
      try {
        option = await wait(() => {
          const active = addressPopup()?.querySelector(`[data-node-key="${level}"] [role="tab"]`);
          if (active?.getAttribute('aria-selected') !== 'true') return null;
          const options = [...(addressPopup()?.querySelectorAll('.ant-tabs-tabpane-active .ant-select-item-option') || [])];
          try { const label = plan.matchRegion(delivery[level], options.map(text)); return options.find(node => text(node) === label); }
          catch (error) { if (error.code === 'REGION_NOT_FOUND') return null; throw error; }
        }, current, `địa danh ${delivery[level]}`, 6000);
      } catch (error) {
        if (error.code === 'DOM_WAIT_TIMEOUT') { error.code = 'REGION_NOT_FOUND'; error.message = `Không thấy ${delivery[level]} trong danh mục địa chỉ ${system === 'old' ? 'cũ' : 'mới'}.`; }
        throw error;
      }
      const label = text(option);
      current(); option.click(); selected.push(label);
      if (level !== 'commune') await wait(() => {
        const next = addressPopup()?.querySelector(`[data-node-key="${levels[levels.indexOf(level) + 1]}"] [role="tab"]`);
        return next && next.getAttribute('aria-disabled') !== 'true';
      }, current, 'cấp địa chỉ tiếp theo');
    }
    await wait(() => {
      const value = text(document.querySelector('.customer-province .ant-select-selection-item'));
      return selected.every(label => plan.normalize(value).includes(plan.normalize(label)));
    }, current, 'địa chỉ hành chính đã chọn');
    const detail = document.querySelector('.crm-platform .customer-address input[placeholder="Địa chỉ"]');
    current(); setInput(detail, delivery.detail); detail.blur();
    await wait(() => detail.value === delivery.detail, current, 'địa chỉ chi tiết');
    return { region: selected.join(', '), system };
    }
    try { return await chooseSystem(delivery.system); }
    catch (error) {
      // A customer may give a new commune and mention the former district.
      // Keep both names unchanged; only use new mode if its catalog matches.
      if (delivery.system !== 'old' || error.code !== 'REGION_NOT_FOUND') throw error;
      current();
      return chooseSystem('new');
    }
  }
  async function addSku(sku, current) {
    const search = document.querySelector('.crm-platform input[placeholder="Tìm kiếm sản phẩm"]');
    current(); search.click(); setInput(search, sku.code);
    const option = await wait(() => {
      const popup = catalogPopup();
      if (!popup) return null;
      const options = catalogNodes(popup).filter(node => {
        const data = skuData(node); return data.code === sku.code && data.name === sku.name;
      });
      if (options.length > 1) throw new Error(`Có nhiều lựa chọn cho SKU ${sku.code}. Dừng để tránh chọn nhầm.`);
      return options[0];
    }, current, `SKU ${sku.code}`, 8000);
    const count = rows().length;
    current(); option.click();
    const row = await wait(() => rows().length === count + 1 && rows().find(row => rowName(row) === sku.name), current, `sản phẩm ${sku.code}`);
    const input = quantityInput(row);
    current(); setInput(input, sku.quantity); input.blur();
    await wait(() => {
      const actual = quantityInput(rows().find(row => rowName(row) === sku.name));
      return actual && Number(actual.value) === sku.quantity && Number(actual.getAttribute('aria-valuenow')) === sku.quantity;
    }, current, `số lượng ${sku.code}`);
  }
  async function applyDraft(proposal, transcript, current, contactPhone) {
    const draft = plan.validateDraft(proposal, transcript);
    current();
    // Tell the original opener to cancel any outstanding first-address retry.
    document.dispatchEvent(new Event('pap-ai-draft-start'));
    const tab = [...document.querySelectorAll('.crm-platform .tab-label-item')].find(node => text(node) === 'Tạo mới');
    if (!tab) throw new Error('Không thấy tab Tạo mới.');
    tab.click();
    await wait(() => visible(document.querySelector('.crm-platform input[placeholder="Tìm kiếm sản phẩm"]')), current, 'form POS');
    if (rows().length) throw new Error('Form đã có sản phẩm. Beta không thêm trùng hoặc xóa đơn bạn đang làm; dùng một form trống rồi đọc lại chat.');
    const name = document.querySelector('.crm-platform input[placeholder="Họ tên"]');
    const phone = document.querySelector('.crm-platform input[placeholder="Số điện thoại"]');
    if (!name?.value.trim() || !phone || (!contactPhone && !/^0\d{9}$/.test(phone.value.replace(/\D/g, '')))) throw new Error('Thiếu tên/SĐT khách trên Pancake. Nhập thông tin này trước.');
    const expectedPhone = contactPhone || phone.value.replace(/\D/g, '');
    if (contactPhone && phone.value.replace(/\D/g, '') !== contactPhone) {
      current(); setInput(phone, contactPhone); phone.blur();
      await settle(() => [...document.querySelectorAll('.crm-platform .profile-customer input')].map(e => e.value), current);
    }
    const catalogs = new Map();
    const skus = [];
    for (const item of draft.items) {
      const kind = plan.productKind(item.product);
      const term = kind.startsWith('miến') ? '2026' : kind;
      if (!catalogs.has(term)) catalogs.set(term, await searchCatalog(term, current));
      skus.push(plan.chooseSku(item, catalogs.get(term)));
    }
    if (rows().length) throw new Error('Form vừa được thêm sản phẩm. Dừng để tránh thêm trùng.');
    const { region, system } = await selectAddress(draft.delivery, current);
    for (const sku of skus) await addSku(sku, current);
    current();
    if (document.querySelector('.crm-platform input[placeholder="Số điện thoại"]')?.value.replace(/\D/g, '') !== expectedPhone || document.querySelector('.crm-platform .customer-address input')?.value !== draft.delivery.detail || !plan.normalize(text(document.querySelector('.customer-province .ant-select-selection-item'))).includes(plan.normalize(region))) throw new Error('Thông tin nhận hàng trên form vừa thay đổi. Kiểm tra đơn nháp trước khi tạo.');
    if (rows().length !== skus.length || skus.some(sku => !rows().some(row => rowName(row) === sku.name && Number(quantityInput(row)?.value) === sku.quantity))) throw new Error('Sản phẩm trên form chưa khớp đề xuất. Kiểm tra đơn nháp.');
    const search = document.querySelector('.crm-platform input[placeholder="Tìm kiếm sản phẩm"]');
    setInput(search, ''); search.blur();
    return { address: [draft.delivery.detail, region].filter(Boolean).join(', '), addressSystem: system, products: skus.map(({ name, code, quantity }) => ({ name, code, quantity })), draftOnly: true };
  }
  root.PancakeAIOrderDOM = { applyDraft };
})(globalThis);
