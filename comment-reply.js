// Explicit draft only: no send button, Enter key, network or customer messages.
(() => {
  'use strict';
  const reply = 'Dạ em đã gửi tin nhắn cho mình rồi đó ạ 🥰\nAnh/chị vui lòng kiểm tra tin nhắn giúp em nha.';
  let enabled = false, recording = false, generation = 0, timer;
  const cancel = () => { generation++; clearTimeout(timer); };
  const onPage = () => /^\/multi_pages(?:[/?#]|$)/.test(location.pathname + location.search + location.hash);
  const visible = element => element && element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0 && getComputedStyle(element).visibility !== 'hidden';
  // The selected row and its root comment share the same Pancake conversation key.
  // Do not depend on SVG path data or React retaining the clicked row node.
  const conversationKey = row => row?.querySelector('.list-tags-conv')?.className.match(/\blist_tags_conv_([0-9]+_[0-9]+)\b/)?.[1];
  chrome.storage.local.get({ autoCommentReply: false, uiRecording: false }, settings => {
    enabled = Boolean(settings.autoCommentReply); recording = Boolean(settings.uiRecording);
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.autoCommentReply) { enabled = Boolean(changes.autoCommentReply.newValue); cancel(); }
    if (changes.uiRecording) { recording = Boolean(changes.uiRecording.newValue); cancel(); }
  });
  document.addEventListener('input', event => { if (event.isTrusted) cancel(); }, true);
  document.addEventListener('keydown', event => { if (event.isTrusted) cancel(); }, true);
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    if (!target) return;
    const row = target.closest('.conversation-list-item');
    if (!row) { if (event.isTrusted) cancel(); return; }
    cancel();
    if (!enabled || recording || !onPage() || !visible(row) || target.closest('button,a,input,textarea,[contenteditable="true"]')) return;
    const key = conversationKey(row);
    if (!key) return;
    const id = generation;
    const started = Date.now();
    const check = () => {
      if (id !== generation || !enabled || recording || !onPage()) return;
      const selected = document.querySelector('.conversation-list-item.selected');
      const comment = document.getElementById(`message_${key}`);
      const composer = document.querySelector('#messageCol #replyBoxComposer');
      const ready = conversationKey(selected) === key && comment?.matches('#messageCol .comment-message-ele') && visible(comment) && visible(composer);
      if (ready) {
        if (composer.disabled || composer.readOnly || composer.value.trim()) return;
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(composer, reply);
        composer.dispatchEvent(new Event('input', { bubbles: true }));
        composer.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
      if (Date.now() - started < 4000) timer = setTimeout(check, 50);
    };
    // Let Pancake's own click handler select/render the conversation first.
    timer = setTimeout(check, 0);
  }, true);
})();
