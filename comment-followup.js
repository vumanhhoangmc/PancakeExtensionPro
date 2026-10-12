// After the user's comment send: open Pancake's private reply shortcut and draft '/'.
// Never submits a comment or private message itself.
(() => {
  'use strict';
  let enabled = false, recording = false, generation = 0, timer;
  const cancel = () => { generation++; clearTimeout(timer); };
  const visible = node => node && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0;
  const keyOf = row => row?.querySelector('.list-tags-conv')?.className.match(/\blist_tags_conv_([0-9]+_[0-9]+)\b/)?.[1];
  const selectedKey = () => keyOf(document.querySelector('.conversation-list-item.selected'));
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
    if (!event.isTrusted) return;
    cancel();
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const button = target?.closest('#messageCol #reply_box .new-reply-box-btn');
    if (!enabled || recording || !/^\/multi_pages(?:[/?#]|$)/.test(location.pathname + location.search + location.hash)
      || !button?.querySelector('svg path[d^="M240,127.89"]')) return;
    const key = selectedKey();
    const root = key && document.getElementById(`message_${key}`);
    const composer = document.querySelector('#messageCol #replyBoxComposer');
    if (!root?.matches('#messageCol .comment-message-ele') || !composer?.value.trim() || composer.disabled || visible(document.querySelector('#previewReplyInput'))) return;
    const sentText = composer.value.trim().replace(/\s+/g, ' ');
    const priorIds = new Set([...document.querySelectorAll('#messageCol .comment-message-ele.media-current-user')].map(node => node.id).filter(Boolean));
    const id = generation;
    const start = Date.now();
    let opened = false;
    const check = () => {
      if (id !== generation || !enabled || recording || selectedKey() !== key) return;
      if (!opened) {
        const actual = document.querySelector('#messageCol #replyBoxComposer');
        const newReply = [...document.querySelectorAll('#messageCol .comment-message-ele.media-current-user')].some(node => {
          const body = node.querySelector('.comment-body-text');
          // Pancake renders the two-line reply with <br>; textContent joins its lines.
          return node.id && !priorIds.has(node.id) && (body?.innerText || body?.textContent || node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim().includes(sentText);
        });
        if (actual && !actual.value.trim() && newReply) {
          opened = true;
          // This customer-comment action opens the same modal as Alt+B.
          // Click the actual React control instead of depending on a synthetic shortcut.
          const currentRoot = document.getElementById(`message_${key}`);
          const privateButton = currentRoot?.querySelector('.comment-action-btn:has(svg path[d^="M128,24A104"][d*="84,140"])');
          if (!visible(privateButton) || privateButton.classList.contains('disabled')) return;
          privateButton.click();
        }
      }
      if (opened) {
        const input = document.querySelector('#previewReplyInput');
        if (visible(input)) {
          if (input.disabled || input.readOnly || input.value.trim()) return;
          input.focus();
          Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, '/');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
      }
      if (Date.now() - start < 8000) timer = setTimeout(check, 50);
    };
    timer = setTimeout(check, 0);
  }, true);
})();
