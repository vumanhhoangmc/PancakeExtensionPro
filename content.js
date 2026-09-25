(() => {
  'use strict';

  // Only the conversation screen uses this workflow. Pancake is a single-page app.
  const isConversationPage = () => /^\/multi_pages(?:[/?#]|$)/.test(location.pathname + location.search + location.hash);
  let enabled = false;
  let runId = 0;
  let autoPrintNote = false;
  let noteRunId = 0;
  let autoSubmitOrder = false;
  let autoSubmitRunId = 0;
  let autoOrderTags = false;
  let tagRunId = 0;
  let recording = false;
  let recordedCount = 0;
  const generatedNotes = new WeakMap();

  chrome.storage.local.get({ autoOrder: true, autoPrintNote: true, autoSubmitOrder: false,
    autoOrderTags: false, uiRecording: false, uiEvents: [] },
    ({ autoOrder, autoPrintNote: noteEnabled, autoSubmitOrder: submitEnabled,
      autoOrderTags: tagsEnabled, uiRecording, uiEvents }) => {
    enabled = autoOrder;
    autoPrintNote = noteEnabled;
    autoSubmitOrder = submitEnabled;
    autoOrderTags = tagsEnabled;
    recording = uiRecording;
    recordedCount = uiEvents.length;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.autoOrder) return;
    enabled = changes.autoOrder.newValue;
    if (!enabled) runId++;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.autoPrintNote) {
      autoPrintNote = changes.autoPrintNote.newValue;
      if (!autoPrintNote) {
        noteRunId++;
        autoSubmitRunId++;
      }
    }
    if (changes.autoSubmitOrder) {
      autoSubmitOrder = changes.autoSubmitOrder.newValue;
      if (!autoSubmitOrder) autoSubmitRunId++;
    }
    if (changes.autoOrderTags) {
      autoOrderTags = changes.autoOrderTags.newValue;
      if (!autoOrderTags) tagRunId++;
    }
    if (changes.uiRecording) {
      recording = changes.uiRecording.newValue;
      if (recording) {
        noteRunId++;
        autoSubmitRunId++;
        tagRunId++;
      }
    }
    if (changes.uiEvents) recordedCount = changes.uiEvents.newValue.length;
  });

  function recordClick(target) {
    if (!recording || recordedCount >= 4) return;
    const chain = [];
    for (let element = target; element && element !== document.body && chain.length < 6; element = element.parentElement) {
      const rect = element.getBoundingClientRect();
      chain.push({
        tag: element.tagName.toLowerCase(),
        className: typeof element.className === 'string'
          ? element.className.replace(/\d{5,}/g, '[number]').slice(0, 200) : '',
        role: element.getAttribute('role'),
        placeholder: element.getAttribute('placeholder'),
        rect: [Math.round(rect.left), Math.round(rect.top), Math.round(rect.width), Math.round(rect.height)]
      });
    }
    chrome.storage.local.get({ uiEvents: [] }, ({ uiEvents }) => {
      if (!recording || uiEvents.length >= 4) return;
      const next = [...uiEvents, { step: uiEvents.length + 1, chain }];
      chrome.storage.local.set({ uiEvents: next, uiRecording: next.length < 4 });
    });
  }

  const visible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  };

  const normalizedText = (element) => (element.textContent || '').replace(/\s+/g, ' ').trim();
  const selectedConversationId = () => document.querySelector('.conversation-list-item.selected')?.id;

  function conversationRow(target) {
    if (target.closest('button, input, textarea, select, [contenteditable="true"]')) return null;
    const row = target.closest('.conversation-list-item');
    return row && visible(row) ? row : null;
  }

  async function waitFor(find, id, timeoutMs = 3000) {
    const until = Date.now() + timeoutMs;
    while (enabled && id === runId && Date.now() < until) {
      const result = find();
      if (result) return result;
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    return null;
  }

  function createTab() {
    return [...document.querySelectorAll('.crm-platform .tab-label-item')]
      .find((element) => normalizedText(element) === 'Tạo mới' && visible(element)) || null;
  }

  function addressInput() {
    return [...document.querySelectorAll('.customer-address input[placeholder]')]
      .find((element) => /^địa chỉ$/i.test(element.placeholder.trim()) && visible(element)) || null;
  }

  function firstAddressSuggestion(input) {
    if (!visible(input)) return null;
    const field = input.getBoundingClientRect();
    const controlledList = document.getElementById(input.getAttribute('aria-controls') || '');
    const listboxes = [...document.querySelectorAll('[role="listbox"]')];
    const roots = controlledList?.querySelector('[role="option"]') ? [controlledList] : listboxes;
    const options = roots.flatMap((root) => [...root.querySelectorAll('[role="option"]')]);
    return options.filter((option) => {
      if (!visible(option)) return false;
      const rect = option.getBoundingClientRect();
      return rect.top >= field.bottom - 3 && rect.top <= field.bottom + 80 &&
        rect.right >= field.left - 100 && rect.left <= field.right &&
        normalizedText(option).length > 0;
    }).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0] || null;
  }

  async function prepareOrder(id) {
    const tab = await waitFor(createTab, id);
    if (!tab || id !== runId) return;
    tab.click();

    const input = await waitFor(addressInput, id);
    if (!input || id !== runId) return;
    input.click();

    const suggestion = await waitFor(() => firstAddressSuggestion(input), id, 3500);
    if (suggestion && id === runId && enabled) suggestion.click();
  }

  function orderProducts() {
    return [...document.querySelectorAll('.crm-platform .view-order .row-table-product')]
      .filter(visible)
      .map((row) => ({
        name: row.querySelector('.col-product-name .info-order-item > .font-weight-500')?.textContent?.trim(),
        quantity: row.querySelector('.table-product > .ant-col-4 input.ant-input-number-input')?.value
      }));
  }

  async function waitForNote(find, id, timeoutMs = 2000) {
    const until = Date.now() + timeoutMs;
    while (autoPrintNote && !recording && id === noteRunId && Date.now() < until) {
      const result = find();
      if (result) return result;
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    return null;
  }

  function noteWithSummary(existing, summary, previous) {
    if (!existing || existing === summary) return summary;
    if (previous && existing.endsWith(previous)) return existing.slice(0, -previous.length) + summary;
    if (existing.endsWith(` | ${summary}`)) return existing;
    const onlyWeightSummary = existing.split(/\s+\+\s+/).every((part) =>
      /^\d+(?:[.,]\d+)?kg\s+\S+/i.test(part));
    return onlyWeightSummary ? summary : `${existing} | ${summary}`;
  }

  async function fillPrintNote(id, submitId, conversationId) {
    const products = orderProducts();
    const summary = globalThis.PancakeProductSummary?.summarizeProducts(products);
    if (!summary || id !== noteRunId) return;

    const section = await waitForNote(() => document.querySelector('.crm-platform .note-print-order'), id);
    if (!section) return;
    if (!section.querySelector('textarea')) {
      const addNote = [...section.querySelectorAll('*')]
        .find((element) => element.children.length === 0 && normalizedText(element) === 'Thêm ghi chú');
      if (!addNote) return;
      addNote.click();
    }

    const textarea = await waitForNote(() => section.querySelector('textarea'), id);
    if (!textarea || id !== noteRunId) return;
    const next = noteWithSummary(textarea.value.trim(), summary, generatedNotes.get(textarea));
    if (next !== textarea.value) {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      setter.call(textarea, next);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      generatedNotes.set(textarea, summary);
    }
    if (autoSubmitOrder) await submitAfterNote(section, id, submitId, conversationId, summary);
  }

  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function freeShippingInput() {
    const label = [...document.querySelectorAll('.crm-platform .view-order label')]
      .find((element) => normalizedText(element) === 'Miễn phí giao hàng');
    return label?.querySelector('input[type="checkbox"]') || null;
  }

  async function submitAfterNote(section, noteId, submitId, conversationId, summary) {
    await pause(80); // Allow Pancake's controlled textarea to receive the input event.
    const current = () => autoSubmitOrder && autoPrintNote && !recording &&
      noteId === noteRunId && submitId === autoSubmitRunId &&
      conversationId && selectedConversationId() === conversationId && freeShippingInput()?.checked;
    if (!current() || !orderProducts().length) return;

    const save = section.querySelector('button.btn-cancel-note');
    if (!save || normalizedText(save) !== 'Lưu') return;
    save.click();

    const until = Date.now() + 5000;
    while (current() && Date.now() < until && section.querySelector('textarea')) await pause(100);
    if (!current() || section.querySelector('textarea')) return;
    if (globalThis.PancakeProductSummary?.summarizeProducts(orderProducts()) !== summary) return;

    const create = document.querySelector('.crm-platform .box-footer button.btn-save-order');
    if (create && !create.disabled && normalizedText(create) === 'Tạo đơn') create.click();
  }

  function createdOrderIds() {
    const ids = new Set();
    // Pancake adds a new order card in the right sidebar after a successful
    // creation. It does not always send a new message to the conversation.
    for (const header of document.querySelectorAll('.crm-platform .recent-orders .ant-collapse-header')) {
      const number = normalizedText(header);
      if (/^\d+$/.test(number)) ids.add(`recent:${number}`);
    }
    for (const message of document.querySelectorAll('.message-list .inbox-message-ele')) {
      for (const match of message.textContent.matchAll(/Đơn hàng\s+([A-Z0-9]+)\s+đã được tạo/gi)) {
        ids.add(match[1]);
      }
    }
    return ids;
  }

  function orderCreated(beforeIds, beforeNotices) {
    for (const id of createdOrderIds()) if (!beforeIds.has(id)) return true;
    return [...document.querySelectorAll('.ant-message-notice, .ant-notification-notice')]
      .some((notice) => !beforeNotices.has(notice) &&
        /(?:tạo đơn thành công|đơn hàng đã được tạo)/i.test(normalizedText(notice)));
  }

  function findTag(name) {
    return [...document.querySelectorAll('button.btn-tag-item')]
      .find((button) => normalizedText(button) === name) || null;
  }

  async function setTag(name, desired, id, conversationId) {
    const current = () => autoOrderTags && !recording && id === tagRunId &&
      selectedConversationId() === conversationId;
    if (!current()) return false;
    const tag = findTag(name);
    if (!tag) return false;
    if (Boolean(tag.querySelector('.ellipse')) === desired) return true;
    tag.click();
    const until = Date.now() + 2000;
    while (current() && Date.now() < until) {
      const updated = findTag(name);
      if (updated && Boolean(updated.querySelector('.ellipse')) === desired) return true;
      await pause(80);
    }
    return false;
  }

  async function normalizeOrderTags(id, conversationId) {
    for (const name of ['Đã Lên Đơn', 'Đã Gửi']) {
      if (!await setTag(name, true, id, conversationId)) return;
    }
    const otherNames = [...document.querySelectorAll('button.btn-tag-item')]
      .filter((button) => button.querySelector('.ellipse'))
      .map(normalizedText)
      .filter((name) => name !== 'Đã Lên Đơn' && name !== 'Đã Gửi');
    for (const name of otherNames) await setTag(name, false, id, conversationId);
  }

  async function watchCreatedOrder(id, conversationId, beforeIds, beforeNotices) {
    const until = Date.now() + 30000;
    while (autoOrderTags && !recording && id === tagRunId &&
      selectedConversationId() === conversationId && Date.now() < until) {
      if (orderCreated(beforeIds, beforeNotices)) {
        await normalizeOrderTags(id, conversationId);
        return;
      }
      await pause(180);
    }
  }

  document.addEventListener('change', (event) => {
    if (!isConversationPage() || recording) return;
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'checkbox') return;
    const label = input.closest('label');
    if (!label || normalizedText(label) !== 'Miễn phí giao hàng' || !label.closest('.crm-platform')) return;
    if (!input.checked) {
      noteRunId++;
      autoSubmitRunId++;
      return;
    }
    if (!autoPrintNote) return;
    const id = ++noteRunId;
    const submitId = ++autoSubmitRunId;
    const conversationId = selectedConversationId();
    setTimeout(() => {
      if (autoPrintNote && !recording && id === noteRunId)
        fillPrintNote(id, submitId, conversationId);
    }, 80);
  }, true);

  document.addEventListener('click', (event) => {
    if (!isConversationPage() || !(event.target instanceof Element)) return;
    if (recording) {
      recordClick(event.target);
      return;
    }
    const create = event.target.closest('button.btn-save-order');
    if (create && create.closest('.crm-platform .box-footer')) {
      autoSubmitRunId++; // A click on Tạo đơn cancels any other pending automatic click.
      if (autoOrderTags) {
        const id = ++tagRunId;
        const notices = new Set(document.querySelectorAll('.ant-message-notice, .ant-notification-notice'));
        watchCreatedOrder(id, selectedConversationId(), createdOrderIds(), notices);
      }
      return;
    }
    if (conversationRow(event.target)) {
      noteRunId++;
      autoSubmitRunId++;
      tagRunId++;
    }
    if (!enabled) return;
    if (!conversationRow(event.target)) return;
    const id = ++runId;
    // Let Pancake finish switching the active conversation before opening its form.
    setTimeout(() => {
      if (enabled && id === runId) prepareOrder(id);
    }, 180);
  }, true);
})();
