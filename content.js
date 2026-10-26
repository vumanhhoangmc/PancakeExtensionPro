(() => {
  'use strict';

  // Only the conversation screen uses this workflow. Pancake is a single-page app.
  const isConversationPage = () => /^\/multi_pages(?:[/?#]|$)/.test(location.pathname + location.search + location.hash);
  let enabled = false;
  let runId = 0;
  let autoPrintNote = false;
  let noteRunId = 0;
  let autoMienSamPrice = false;
  let priceRunId = 0;
  let autoSubmitOrder = false;
  let autoSubmitRunId = 0;
  let autoOrderTags = false;
  let tagRunId = 0;
  let recording = false;
  let recordedCount = 0;
  const generatedNotes = new WeakMap();
  const sectionSummaries = new WeakMap();
  let productNoteTimer;
  let observedProducts = null;
  document.addEventListener('pap-ai-draft-start', () => {
    runId++; noteRunId++; priceRunId++; autoSubmitRunId++;
  });

  chrome.storage.local.get({ autoOrder: true, autoPrintNote: true, autoMienSamPrice: false, autoSubmitOrder: false,
    autoOrderTags: false, uiRecording: false, uiEvents: [] },
    ({ autoOrder, autoPrintNote: noteEnabled, autoSubmitOrder: submitEnabled,
      autoMienSamPrice: priceEnabled, autoOrderTags: tagsEnabled, uiRecording, uiEvents }) => {
    enabled = autoOrder;
    autoPrintNote = noteEnabled;
    autoMienSamPrice = priceEnabled;
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
    if (changes.autoMienSamPrice) {
      autoMienSamPrice = changes.autoMienSamPrice.newValue;
      if (!autoMienSamPrice) priceRunId++;
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
        runId++;
        noteRunId++;
        priceRunId++;
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
  const selectedConversationId = () => {
    const row = document.querySelector('.conversation-list-item.selected');
    // Pancake no longer gives conversation rows an id; retain the DOM node as a safe identity.
    return row?.id || row || null;
  };

  function conversationRow(target) {
    if (target.closest('button, input, textarea, select, [contenteditable="true"]')) return null;
    const row = target.closest('.conversation-list-item');
    return row && visible(row) ? row : null;
  }

  function waitForDom(find, current, timeoutMs) {
    return new Promise((resolve, reject) => {
      let observer, timeout, cancellation;
      let finished = false;
      const finish = (result, error) => {
        if (finished) return;
        finished = true;
        observer?.disconnect();
        clearTimeout(timeout);
        clearInterval(cancellation);
        if (error) reject(error);
        else resolve(result);
      };
      const check = () => {
        try {
          if (!current()) return finish(null);
          const result = find();
          if (result) finish(result);
        } catch (error) {
          finish(null, error);
        }
      };
      check();
      if (finished) return;
      observer = new MutationObserver(check);
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
      timeout = setTimeout(() => finish(null), timeoutMs);
      // Native input properties and switch cancellation may not produce a DOM mutation.
      cancellation = setInterval(check, 80);
    });
  }

  function waitFor(find, id, timeoutMs = 3000) {
    return waitForDom(find, () => enabled && !recording && id === runId, timeoutMs);
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
    const roots = controlledList?.querySelector('[role="option"]')
      ? [controlledList] : document.querySelectorAll('[role="listbox"]');
    for (const root of roots) for (const option of root.querySelectorAll('[role="option"]')) {
      if (!visible(option)) continue;
      const rect = option.getBoundingClientRect();
      if (rect.top >= field.bottom - 3 && rect.top <= field.bottom + 80 &&
        rect.right >= field.left - 100 && rect.left <= field.right &&
        normalizedText(option).length > 0) return option;
    }
    return null;
  }

  async function prepareOrder(id) {
    for (let attempt = 0; attempt < 2 && enabled && !recording && id === runId; attempt++) {
      const tab = await waitFor(createTab, id);
      if (!tab || id !== runId) return;
      tab.click();

      const input = await waitFor(addressInput, id);
      if (!input || id !== runId) return;
      input.click();

      const suggestion = await waitFor(() => firstAddressSuggestion(input), id, 3500);
      if (suggestion && id === runId && enabled && !recording) suggestion.click();

      // Pancake may finish loading the conversation after our first click and restore Thông tin.
      const reverted = await waitForDom(() => {
        const activeTab = document.querySelector('.crm-platform .tab-label-item.active');
        return activeTab && normalizedText(activeTab) !== 'Tạo mới';
      }, () => enabled && !recording && id === runId, 500);
      if (!reverted) return;
    }
  }

  function orderProducts() {
    return [...document.querySelectorAll('.crm-platform .view-order .row-table-product')]
      .filter(visible)
      .map((row) => ({
        name: row.querySelector('.col-product-name .info-order-item > .font-weight-500')?.textContent?.trim(),
        quantity: row.querySelector('.table-product > .ant-col-4 input.ant-input-number-input')?.value
      }));
  }

  function waitForNote(find, id, timeoutMs = 2000) {
    return waitForDom(find, () => autoPrintNote && !recording && id === noteRunId, timeoutMs);
  }

  function noteWithSummary(existing, summary, previous) {
    if (!existing || existing === summary) return summary;
    if (previous && existing.endsWith(previous)) {
      const prefix = existing.slice(0, -previous.length);
      return summary ? prefix + summary : prefix.replace(/\s*\|\s*$/, '').trim();
    }
    if (!summary) return existing;
    if (existing.endsWith(` | ${summary}`)) return existing;
    const onlyWeightSummary = existing.split(/\s+\+\s+/).every((part) =>
      /^\d+(?:[.,]\d+)?kg\s+\S+/i.test(part));
    return onlyWeightSummary ? summary : `${existing} | ${summary}`;
  }

  async function fillPrintNote(id, submitId, conversationId, priceReady, productChange = false) {
    const form = document.querySelector('.crm-platform .view-order');
    const current = () => autoPrintNote && !recording && id === noteRunId && conversationId &&
      selectedConversationId() === conversationId && form?.isConnected &&
      form === document.querySelector('.crm-platform .view-order') &&
      (productChange || freeShippingInput()?.checked);
    if (!current()) return;
    const products = orderProducts();
    const summary = products.length ? globalThis.PancakeProductSummary?.summarizeProducts(products) : '';
    if ((products.length && !summary) || id !== noteRunId) return;

    const section = await waitForNote(() => document.querySelector('.crm-platform .note-print-order'), id);
    if (!section || !current()) return;
    const previous = sectionSummaries.get(section);
    const previousSummary = previous?.conversationId === conversationId ? previous.summary : undefined;
    if (!summary && !previousSummary) return;
    if (!section.querySelector('textarea')) {
      const addNote = [...section.querySelectorAll('*')]
        .find((element) => element.children.length === 0 && normalizedText(element) === 'Thêm ghi chú') ||
        section.querySelector('.text-note');
      if (!addNote) return;
      addNote.click();
    }

    const textarea = await waitForNote(() => section.querySelector('textarea'), id);
    if (!textarea || !current() || JSON.stringify(orderProducts()) !== JSON.stringify(products)) return;
    const next = noteWithSummary(textarea.value.trim(), summary, previousSummary || generatedNotes.get(textarea));
    if (next !== textarea.value) {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      setter.call(textarea, next);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      generatedNotes.set(textarea, summary);
    }
    sectionSummaries.set(section, { conversationId, summary });
    if (!productChange && autoSubmitOrder && priceReady) await submitAfterNote(section, id, submitId, conversationId, summary);
  }

  function productNoteState() {
    return { form: document.querySelector('.crm-platform .view-order'),
      conversation: selectedConversationId(), products: JSON.stringify(orderProducts()) };
  }

  function checkProductNote() {
    if (!isConversationPage()) return;
    const next = productNoteState();
    if (observedProducts && next.form === observedProducts.form &&
        next.conversation === observedProducts.conversation && next.products === observedProducts.products) return;
    observedProducts = next;
    clearTimeout(productNoteTimer);
    const id = ++noteRunId;
    autoSubmitRunId++; // Product edits invalidate any pending creation based on the old basket.
    if (!autoPrintNote || recording || !next.form || !next.conversation) return;
    productNoteTimer = setTimeout(() => {
      if (id === noteRunId && autoPrintNote && !recording)
        void fillPrintNote(id, autoSubmitRunId, next.conversation, false, true);
    }, 180);
  }

  // Only react to order-pane DOM changes, not incoming chat messages.
  const productObserver = new MutationObserver((records) => {
    if (!isConversationPage()) return;
    if (records.some((record) => {
      const target = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
      return target?.closest('.crm-platform') || [...record.addedNodes, ...record.removedNodes]
        .some((node) => node.nodeType === Node.ELEMENT_NODE &&
          (node.matches('.crm-platform') || node.querySelector('.crm-platform')));
    })) checkProductNote();
  });
  productObserver.observe(document.body, { childList: true, subtree: true, characterData: true,
    attributes: true, attributeFilter: ['value'] });
  for (const eventName of ['input', 'change']) document.addEventListener(eventName, (event) => {
    if (event.target instanceof Element && event.target.closest('.row-table-product')) checkProductNote();
  }, true);

  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function freeShippingInput() {
    const label = [...document.querySelectorAll('.crm-platform .view-order label')]
      .find((element) => normalizedText(element) === 'Miễn phí giao hàng');
    return label?.querySelector('input[type="checkbox"]') || null;
  }

  function paymentRow(label) {
    return [...document.querySelectorAll('.crm-platform .view-order .content-order-payment > .row-content-payment')]
      .find((row) => normalizedText(row.firstElementChild) === label && visible(row)) || null;
  }

  function money(text) {
    const value = String(text || '').trim();
    if (!/^\d[\d.,\s]*\s*đ?$/i.test(value)) return null;
    const amount = Number(value.replace(/\D/g, ''));
    return Number.isSafeInteger(amount) ? amount : null;
  }

  function discountField() {
    return paymentRow('Giảm giá')?.querySelector('input.ant-input-number-input') || null;
  }

  function priceVerifiedForCurrentOrder() {
    if (!autoMienSamPrice) return true;
    const total = money(paymentRow('Tổng giá trị đơn hàng')?.lastElementChild?.textContent);
    if (total === null || !globalThis.PancakePricing?.calculateDiscount) return false;
    const price = globalThis.PancakePricing.calculateDiscount(orderProducts(), total);
    if (!price || price.discount === 0) return true;
    return money(discountField()?.value) === price.discount &&
      money(document.querySelector('.crm-platform .box-footer .text-final-price')?.textContent) === price.targetTotal;
  }

  async function adjustMienSamPrice(id, conversationId) {
    const current = () => autoMienSamPrice && !recording && id === priceRunId &&
      conversationId && selectedConversationId() === conversationId && freeShippingInput()?.checked;
    if (!current()) return false;
    const products = orderProducts();
    const totalRow = paymentRow('Tổng giá trị đơn hàng');
    const total = money(totalRow?.lastElementChild?.textContent);
    if (total === null) return false;
    if (!globalThis.PancakePricing?.calculateDiscount) return false;
    const price = globalThis.PancakePricing.calculateDiscount(products, total);
    if (!price) return true; // Mixed products, missing data, or no price for this weight.
    if (price.discount === 0) return true;

    const field = discountField();
    if (!field || !visible(field)) return false;
    const sameOrder = () => current() && JSON.stringify(orderProducts()) === JSON.stringify(products) &&
      money(paymentRow('Tổng giá trị đơn hàng')?.lastElementChild?.textContent) === total;
    if (!sameOrder()) return false;

    if (money(field.value) !== price.discount) {
      field.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(field, String(price.discount));
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      field.blur();
    }

    return Boolean(await waitForDom(() => {
      const finalTotal = money(document.querySelector('.crm-platform .box-footer .text-final-price')?.textContent);
      return money(discountField()?.value) === price.discount && finalTotal === price.targetTotal;
    }, sameOrder, 2000));
  }

  async function handleFreeShipping(noteId, submitId, priceId, conversationId) {
    await pause(0); // Let Pancake finish handling the checkbox event.
    const priceReady = !autoMienSamPrice || await adjustMienSamPrice(priceId, conversationId);
    if (autoPrintNote && !recording && noteId === noteRunId && freeShippingInput()?.checked)
      await fillPrintNote(noteId, submitId, conversationId, priceReady);
  }

  async function submitAfterNote(section, noteId, submitId, conversationId, summary) {
    await pause(0); // Allow Pancake's controlled textarea to receive the input event.
    const current = () => autoSubmitOrder && autoPrintNote && !recording &&
      noteId === noteRunId && submitId === autoSubmitRunId &&
      conversationId && selectedConversationId() === conversationId && freeShippingInput()?.checked;
    if (!current() || !orderProducts().length) return;

    const save = section.querySelector('button.btn-cancel-note');
    if (!save || normalizedText(save) !== 'Lưu') return;
    save.click();

    const saved = await waitForDom(() => section.isConnected && !section.querySelector('textarea'), current, 5000);
    if (!saved || !current()) return;
    if (globalThis.PancakeProductSummary?.summarizeProducts(orderProducts()) !== summary) return;
    if (!priceVerifiedForCurrentOrder()) return;

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
    return Boolean(await waitForDom(() => {
      const updated = findTag(name);
      return updated && Boolean(updated.querySelector('.ellipse')) === desired;
    }, current, 2000));
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
    const current = () => autoOrderTags && !recording && id === tagRunId &&
      conversationId && selectedConversationId() === conversationId;
    const created = await waitForDom(() => orderCreated(beforeIds, beforeNotices), current, 30000);
    if (created && current()) await normalizeOrderTags(id, conversationId);
  }

  document.addEventListener('change', (event) => {
    if (!isConversationPage() || recording) return;
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'checkbox') return;
    const label = input.closest('label');
    if (!label || normalizedText(label) !== 'Miễn phí giao hàng' || !label.closest('.crm-platform')) return;
    clearTimeout(productNoteTimer);
    observedProducts = productNoteState(); // The explicit shipping action owns this run.
    if (!input.checked) {
      noteRunId++;
      priceRunId++;
      autoSubmitRunId++;
      return;
    }
    const id = ++noteRunId;
    const priceId = ++priceRunId;
    const submitId = ++autoSubmitRunId;
    const conversationId = selectedConversationId();
    if (autoPrintNote || autoMienSamPrice) handleFreeShipping(id, submitId, priceId, conversationId);
  }, true);

  document.addEventListener('click', (event) => {
    if (!isConversationPage() || !(event.target instanceof Element)) return;
    if (recording) {
      recordClick(event.target);
      return;
    }
    // Give deliberate user input priority over an opener/address selection still in progress.
    if (event.isTrusted && event.target.closest('.crm-platform, .ant-select-dropdown')) runId++;
    const create = event.target.closest('button.btn-save-order');
    if (create && create.closest('.crm-platform .box-footer')) {
      runId++; // Creating an order also cancels a pending opener retry.
      autoSubmitRunId++; // A click on Tạo đơn cancels any other pending automatic click.
      if (autoOrderTags) {
        const id = ++tagRunId;
        const notices = new Set(document.querySelectorAll('.ant-message-notice, .ant-notification-notice'));
        watchCreatedOrder(id, selectedConversationId(), createdOrderIds(), notices);
      }
      return;
    }
    const row = conversationRow(event.target);
    if (row) {
      noteRunId++;
      priceRunId++;
      autoSubmitRunId++;
      tagRunId++;
    }
    if (!enabled) return;
    if (!row) return;
    const id = ++runId;
    // Let Pancake finish switching the active conversation before opening its form.
    setTimeout(() => {
      if (enabled && id === runId) prepareOrder(id);
    }, 180);
  }, true);
})();
