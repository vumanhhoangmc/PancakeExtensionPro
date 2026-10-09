(() => {
  'use strict';

  if (!/^\/shop\/[^/]+\/order(?:\/|$)/.test(location.pathname)) return;

  let enabled = false;
  let scanning = false;
  let cancelled = false;
  let lastScan = null;
  let selectedKeys = new Set();
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const $ = (selector, root = document) => root.querySelector(selector);

  function orderList() {
    return $('.ant-table-tbody-virtual-holder');
  }

  function rowInfo(row) {
    const id = $('.order-id-column a', row)?.textContent?.trim();
    const rowKey = row.getAttribute('data-row-key');
    const productCell = row.querySelectorAll(':scope > .ant-table-cell')[9];
    return id && rowKey && productCell ? { id, rowKey, productCell } : null;
  }

  async function waitFor(find, timeout = 4000) {
    const until = Date.now() + timeout;
    while (!cancelled && enabled && Date.now() < until) {
      const result = find();
      if (result) return result;
      await pause(70);
    }
    return null;
  }

  async function readMultiProductOrder(info) {
    const trigger = $('span', info.productCell) || info.productCell;
    const visibleBefore = new Set(document.querySelectorAll(
      '.order-action-list:not(.ant-popover-hidden)'
    ));
    trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: null }));
    try {
      const popover = await waitFor(() => [...document.querySelectorAll(
        '.order-action-list:not(.ant-popover-hidden)'
      )].find((element) => !visibleBefore.has(element) &&
        element.querySelector('.ant-menu-title-content')), 700);
      if (!popover) return null;
      const lines = [...popover.querySelectorAll('.ant-menu-title-content')];
      const products = lines.flatMap((line) =>
        globalThis.PancakePosGroups.parseListProduct(line.textContent?.trim()) || []);
      return lines.length && products.length === lines.length ? products : null;
    } finally {
      trigger.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
    }
  }

  function setStatus(message) {
    const status = $('#pap-pos-status');
    if (status) status.textContent = message;
  }

  function scrollPositions(holder) {
    const step = Math.max(160, Math.floor(holder.clientHeight * 0.6));
    const bottom = Math.max(0, holder.scrollHeight - holder.clientHeight);
    const positions = [];
    for (let top = 0; top < bottom; top += step) positions.push(top);
    positions.push(bottom);
    return [...new Set(positions)];
  }

  function expectedOrderCount() {
    const active = [...document.querySelectorAll('label.ant-radio-button-wrapper-checked')]
      .find((label) => label.querySelector('.status-title'));
    const count = Number(active?.querySelector('.ant-tag')?.textContent?.trim());
    return Number.isSafeInteger(count) ? count : null;
  }

  async function scanOrders() {
    if (scanning) return;
    if ($('.ant-modal[role="dialog"]')) {
      setStatus('Hãy đóng cửa sổ chi tiết đơn trước khi quét.');
      return;
    }
    if (nativeSelectedCount() > 0) {
      setStatus('Hãy bỏ chọn các đơn trên POS trước khi quét lại.');
      return;
    }
    const holder = orderList();
    if (!holder) {
      setStatus('Không tìm thấy danh sách đơn hàng trên trang này.');
      return;
    }
    scanning = true;
    cancelled = false;
    lastScan = null;
    selectedKeys = new Set();
    const previousScroll = holder.scrollTop;
    const expected = expectedOrderCount();
    const orders = new Map();
    try {
      for (const top of scrollPositions(holder)) {
        if (cancelled || !enabled) return;
        holder.scrollTop = top;
        holder.dispatchEvent(new Event('scroll', { bubbles: true }));
        await pause(60);
        const keys = [...holder.querySelectorAll('.ant-table-row[data-row-key]')]
          .map((row) => row.getAttribute('data-row-key'));
        for (const key of keys) {
          if (cancelled || !enabled) return;
          if (orders.has(key)) continue;
          let row = [...holder.querySelectorAll('.ant-table-row[data-row-key]')]
            .find((candidate) => candidate.getAttribute('data-row-key') === key);
          if (!row) {
            holder.scrollTop = top;
            holder.dispatchEvent(new Event('scroll', { bubbles: true }));
            await pause(90);
            row = [...holder.querySelectorAll('.ant-table-row[data-row-key]')]
              .find((candidate) => candidate.getAttribute('data-row-key') === key);
          }
          const info = row && rowInfo(row);
          if (!info) continue;
          const text = info.productCell.textContent.trim();
          const products = text === 'Nhiều sản phẩm'
            ? await readMultiProductOrder(info) : globalThis.PancakePosGroups.parseListProduct(text);
          orders.set(key, { id: info.id, rowKey: key, products });
          if (orders.size % 10 === 0 || orders.size === expected) {
            setStatus(`Đang đọc ${orders.size}${expected === null ? '' : `/${expected}`} đơn...`);
          }
        }
        if (orders.size === expected) break;
      }
      if (expected !== null && orders.size !== expected) {
        setStatus(`Mới đọc ${orders.size}/${expected} đơn trong bộ lọc. Hãy quét lại trước khi in.`);
        return;
      }
      const result = globalThis.PancakePosGroups.groupOrders([...orders.values()]);
      lastScan = { url: location.href, orders: [...orders.values()], result };
      renderGroups(result, orders.size);
    } catch (error) {
      setStatus(`Không thể hoàn tất quét: ${error.message}`);
    } finally {
      holder.scrollTop = previousScroll;
      holder.dispatchEvent(new Event('scroll', { bubbles: true }));
      scanning = false;
    }
  }

  function renderGroups(result, scanned) {
    const list = $('#pap-pos-groups');
    if (!list) return;
    list.replaceChildren();
    setStatus(`Đã đọc ${scanned} đơn: ${result.groups.length} nhóm; ${result.unclassified.length} đơn cần xem lại.`);
    for (const group of result.groups) {
      const card = document.createElement('div');
      card.className = 'pap-pos-group';
      const title = document.createElement('strong');
      title.textContent = `${group.label} — ${group.orders.length} đơn`;
      const ids = document.createElement('small');
      ids.textContent = `Mã đơn: ${group.orders.map((order) => order.id).join(', ')}`;
      const select = document.createElement('button');
      select.type = 'button';
      select.textContent = 'Chọn nhóm để in';
      select.addEventListener('click', () => selectGroup(group, select));
      const print = document.createElement('button');
      print.type = 'button';
      print.textContent = 'In nhóm bằng POS';
      print.addEventListener('click', () => printGroup(group));
      card.append(title, ids, select, print);
      list.append(card);
    }
    if (result.unclassified.length) {
      const note = document.createElement('p');
      note.textContent = `Cần xem lại: ${result.unclassified.map((order) => order.id).join(', ')}. Các đơn này sẽ không được chọn để in theo nhóm.`;
      list.append(note);
    }
  }

  function nativeSelectedCount() {
    return Number(document.body.textContent.match(/Đã chọn\s*:\s*(\d+)/)?.[1] || 0);
  }

  async function changeSelection(keys, checked) {
    const holder = orderList();
    if (!holder) return false;
    const previousScroll = holder.scrollTop;
    const seen = new Set();
    try {
      for (const top of scrollPositions(holder)) {
        holder.scrollTop = top;
        holder.dispatchEvent(new Event('scroll', { bubbles: true }));
        await pause(90);
        for (const row of holder.querySelectorAll('.ant-table-row[data-row-key]')) {
          const key = row.getAttribute('data-row-key');
          if (!keys.has(key) || seen.has(key)) continue;
          const input = $('.ant-table-selection-column input[type="checkbox"]', row);
          if (!input) continue;
          if (input.checked !== checked) {
            input.click();
            await pause(20);
          }
          if (input.checked === checked) seen.add(key);
        }
        if (seen.size === keys.size) break;
      }
      return seen.size === keys.size;
    } finally {
      holder.scrollTop = previousScroll;
      holder.dispatchEvent(new Event('scroll', { bubbles: true }));
    }
  }

  async function selectGroup(group, button) {
    if (scanning || !lastScan || lastScan.url !== location.href) {
      setStatus('Bộ lọc đã thay đổi. Hãy quét lại đơn.');
      return;
    }
    if ($('.ant-modal[role="dialog"]')) {
      setStatus('Hãy đóng cửa sổ POS đang mở trước khi chọn nhóm.');
      return;
    }
    scanning = true;
    try {
      const nativeCount = nativeSelectedCount();
      if (nativeCount === 0) selectedKeys = new Set(); // POS may clear selection after printing.
      if (nativeCount !== selectedKeys.size) {
        setStatus('POS đang có đơn được chọn ngoài bảng nhóm. Hãy bỏ chọn trên POS rồi thử lại.');
        return;
      }
      if (selectedKeys.size && !await changeSelection(selectedKeys, false)) {
        setStatus('Không thể bỏ hết nhóm cũ. Hãy bỏ chọn trên POS rồi thử lại.');
        return;
      }
      selectedKeys = new Set();
      const keys = new Set(group.orders.map((order) => order.rowKey));
      const complete = await changeSelection(keys, true);
      await pause(100);
      if (!complete || nativeSelectedCount() !== keys.size) {
        setStatus('Chọn đơn chưa đủ. Hãy kiểm tra bộ lọc và quét lại.');
        return;
      }
      selectedKeys = keys;
      button.classList.add('pap-pos-selected');
      button.title = 'Nhóm đã chọn. Bấm lại để chọn lại nhóm này.';
      setStatus(`Đã chọn ${keys.size} đơn nhóm “${group.label}”. Kiểm tra mã đơn rồi bấm “In nhóm bằng POS”.`);
    } finally {
      scanning = false;
    }
  }

  async function clearGroups() {
    if (scanning) {
      setStatus('Đang xử lý đơn. Hãy đợi hoàn tất rồi bấm Clear.');
      return;
    }
    if ($('.ant-modal[role="dialog"]')) {
      setStatus('Hãy đóng cửa sổ POS đang mở trước khi bấm Clear.');
      return;
    }
    scanning = true;
    try {
      if (lastScan?.url === location.href && selectedKeys.size && nativeSelectedCount() > 0 &&
          !await changeSelection(selectedKeys, false)) {
        setStatus('Chưa bỏ chọn hết nhóm cũ. Hãy bỏ chọn trên POS rồi bấm Clear lại.');
        return;
      }
      lastScan = null;
      selectedKeys = new Set();
      $('#pap-pos-groups')?.replaceChildren();
      const remaining = nativeSelectedCount();
      setStatus(remaining > 0
        ? `Đã xóa kết quả phân nhóm. Còn ${remaining} đơn được chọn trên POS; hãy bỏ chọn trước khi quét lại.`
        : 'Đã xóa kết quả phân nhóm. Bạn có thể quét lại đơn.');
    } finally {
      scanning = false;
    }
  }

  function printGroup(group) {
    const keys = new Set(group.orders.map((order) => order.rowKey));
    if (!lastScan || lastScan.url !== location.href || keys.size !== selectedKeys.size ||
        [...keys].some((key) => !selectedKeys.has(key)) || nativeSelectedCount() !== keys.size) {
      setStatus('Hãy chọn đúng nhóm trước khi in.');
      return;
    }
    const print = [...document.querySelectorAll('.action-btn-container .ant-space-compact button')]
      .find((button) => button.querySelector('svg path[d^="M214.67,72"]'));
    if (!print) {
      setStatus('Không tìm thấy nút in hàng loạt của POS.');
      return;
    }
    print.click();
    setStatus(`Đã mở thao tác in của POS cho ${keys.size} đơn nhóm “${group.label}”.`);
  }

  function mount() {
    if ($('#pap-pos-launcher')) return;
    const launcher = document.createElement('button');
    launcher.id = 'pap-pos-launcher';
    launcher.type = 'button';
    launcher.textContent = 'Phân nhóm đơn';
    launcher.addEventListener('click', () => {
      const panel = $('#pap-pos-panel');
      panel.hidden = !panel.hidden;
    });
    const panel = document.createElement('section');
    panel.id = 'pap-pos-panel';
    panel.hidden = true;
    panel.innerHTML = '<header><strong>Phân nhóm đơn POS Cake</strong><button type="button" id="pap-pos-close" aria-label="Đóng">×</button></header><p>Quét các đơn trong bộ lọc hiện tại, gom theo loại sản phẩm và tổng kg.</p><button type="button" id="pap-pos-scan">Quét và phân nhóm</button><button type="button" id="pap-pos-clear">Clear</button><p id="pap-pos-status" role="status"></p><div id="pap-pos-groups"></div>';
    document.body.append(launcher, panel);
    $('#pap-pos-close').addEventListener('click', () => { panel.hidden = true; });
    $('#pap-pos-scan').addEventListener('click', scanOrders);
    $('#pap-pos-clear').addEventListener('click', clearGroups);
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    if (enabled) mount();
    else {
      cancelled = true;
      $('#pap-pos-launcher')?.remove();
      $('#pap-pos-panel')?.remove();
    }
  }

  chrome.storage.local.get({ posGroupPrint: false }, ({ posGroupPrint }) => setEnabled(posGroupPrint));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.posGroupPrint) setEnabled(changes.posGroupPrint.newValue);
  });
})();
