const bridge = 'http://127.0.0.1:18765';
const element = id => document.getElementById(id);
const command = `node ai-bridge.cjs ${chrome.runtime.id}`;
element('start-command').textContent = command;
let working = false;
let liveChat = null;
let analyzed = null;
function clearDraft() {
  analyzed = null; element('fill-draft').disabled = true; element('draft-status').textContent = '';
}
element('sample').addEventListener('input', clearDraft);
element('pancake-tab').addEventListener('change', () => { liveChat = null; clearDraft(); });
element('include-address').addEventListener('change', () => { liveChat = null; element('sample').value = ''; clearDraft(); element('chat-status').textContent = 'Đọc lại hội thoại với lựa chọn địa chỉ mới.'; });
async function findPancakeTabs() {
  if (working) return;
  liveChat = null; clearDraft();
  const tabs = await chrome.tabs.query({ url: ['https://pancake.vn/multi_pages*', 'https://*.pancake.vn/multi_pages*'] });
  element('pancake-tab').replaceChildren(new Option('Chọn tab Pancake', ''));
  tabs.forEach((tab, index) => element('pancake-tab').add(new Option(`Hội thoại Pancake — tab ${index + 1}`, String(tab.id))));
  if (tabs.length === 1) element('pancake-tab').value = String(tabs[0].id);
}
async function checkLiveChat() {
  if (!liveChat) return;
  const response = await chrome.tabs.sendMessage(liveChat.tabId, { type: 'pap-check-chat', key: liveChat.key });
  if (!response?.ok) throw new Error(response?.error || 'Không kiểm tra được hội thoại. Tải lại tab Pancake và đọc lại.');
}
element('find-pancake').addEventListener('click', () => findPancakeTabs().catch(error => element('chat-status').textContent = error.message));
element('read-pancake').addEventListener('click', async () => {
  if (working) return;
  clearDraft();
  try {
    const tabId = Number(element('pancake-tab').value);
    if (!tabId) throw new Error('Chọn tab Pancake đang mở hội thoại trước.');
    const result = await chrome.tabs.sendMessage(tabId, { type: 'pap-read-chat', includeAddress: element('include-address').checked });
    if (!result?.ok) throw new Error(result?.error || 'Không đọc được hội thoại.');
    liveChat = { tabId, key: result.key };
    element('sample').value = result.text;
    element('result').textContent = '';
    element('chat-status').textContent = `Đã đọc ${result.count} tin văn bản từ phần lịch sử đang tải. ${result.media} tin có media, ${result.unknown} tin chưa rõ vai trò, ${result.filtered} dòng/tin đã lọc. Kiểm tra bản xem trước trước khi gửi.`;
  } catch (error) { liveChat = null; element('sample').value = ''; element('chat-status').textContent = error.message + ' Nếu vừa cập nhật extension, tải lại tab Pancake.'; }
});
element('use-sample').addEventListener('click', () => {
  if (working) return;
  clearDraft();
  liveChat = null; element('sample').value = ''; element('result').textContent = '';
  element('chat-status').textContent = 'Đang nhập mẫu; không liên kết với hội thoại thật.';
});
async function callBridge(route, body) {
  // Chrome may omit Origin on GET; all bridge requests use CORS POST.
  const response = await fetch(bridge + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), signal: AbortSignal.timeout(95000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Không thực hiện được thao tác.');
  return result;
}
async function refreshConnection() {
  try {
    const status = await callBridge('/status');
    element('model').replaceChildren(new Option('Chọn model', ''));
    if (!status.connected) {
      element('connection-status').textContent = status.error || (status.pending ? 'Đang chờ bạn đăng nhập. Đăng nhập xong bấm Kiểm tra kết nối.' : 'Chương trình kết nối đang chạy. Chưa đăng nhập ChatGPT.');
      return;
    }
    const { models } = await callBridge('/models');
    for (const model of models) element('model').add(new Option(model.display_name, model.slug));
    if (models.length) element('model').value = models[0].slug;
    element('connection-status').textContent = models.length ? 'Đã đăng nhập và lấy được model. Hãy thử phân tích chat mẫu.' : 'Đã đăng nhập nhưng chưa có model được phép dùng.';
  } catch (error) {
    element('model').replaceChildren(new Option('Chưa kết nối', ''));
    element('connection-status').textContent = error instanceof TypeError ? 'Chưa kết nối được chương trình trên máy. Chạy lệnh ở bước 1 hoặc kiểm tra đúng ID extension.' : error.message;
  }
}
element('copy-command').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(command); element('copy-command').textContent = 'Đã sao chép'; }
  catch { element('connection-status').textContent = 'Hãy sao chép lệnh ở bước 1 bằng tay.'; }
});
element('connect').addEventListener('click', async () => {
  try {
    const { url } = await callBridge('/login', {});
    if (new URL(url).origin !== 'https://auth.openai.com') throw new Error('Địa chỉ đăng nhập không hợp lệ.');
    await chrome.tabs.create({ url });
    element('connection-status').textContent = 'Hoàn tất đăng nhập trong tab OpenAI, rồi bấm Kiểm tra kết nối.';
  } catch (error) { element('connection-status').textContent = error.message; }
});
element('refresh').addEventListener('click', refreshConnection);
element('disconnect').addEventListener('click', async () => {
  try { await callBridge('/logout', {}); await refreshConnection(); }
  catch (error) { element('connection-status').textContent = error.message; }
});
element('analyze').addEventListener('click', async () => {
  if (working) return;
  const { aiAutoOrderBeta = false } = await chrome.storage.local.get({ aiAutoOrderBeta: false });
  if (!aiAutoOrderBeta) { element('analysis-status').textContent = 'Bật AI tự lên đơn — Beta trong popup trước khi thử.'; return; }
  if (!element('model').value) { element('analysis-status').textContent = 'Đăng nhập và chọn model trước.'; return; }
  working = true; element('analyze').disabled = true; element('result').textContent = '';
  clearDraft();
  const transcript = element('sample').value;
  element('analysis-status').textContent = 'Đang phân tích bằng hạn mức ChatGPT…';
  try {
    await checkLiveChat();
    const { proposal } = await callBridge('/analyze', { model: element('model').value, text: transcript });
    await checkLiveChat();
    const current = await chrome.storage.local.get({ aiAutoOrderBeta: false });
    if (!current.aiAutoOrderBeta) throw new Error('Beta đã tắt. Đã bỏ kết quả này.');
    if (element('sample').value !== transcript) throw new Error('Bản xem trước đã được sửa trong khi AI phân tích. Phân tích lại bản mới.');
    element('result').textContent = JSON.stringify(proposal, null, 2);
    analyzed = { proposal, transcript, liveChat };
    try {
      PancakeAIOrderPlan.validateDraft(proposal, transcript);
      element('fill-draft').disabled = !liveChat;
      element('analysis-status').textContent = liveChat ? 'Đã xác định sản phẩm và địa chỉ. Xem lại đề xuất rồi bấm Điền đơn trên Pancake để đối chiếu danh mục shop.' : 'Đã phân tích mẫu. Đọc hội thoại thật để điền đơn trên Pancake.';
    } catch (error) { element('analysis-status').textContent = `Đã phân tích; chưa thể điền đơn: ${error.message}${!proposal.delivery ? ' Nếu helper chưa hỗ trợ địa chỉ, khởi động lại helper bản mới.' : ''}`; }
  } catch (error) { element('analysis-status').textContent = error.message; }
  finally { working = false; element('analyze').disabled = false; }
});
element('fill-draft').addEventListener('click', async () => {
  if (working || !analyzed?.liveChat || analyzed.transcript !== element('sample').value) return;
  const selected = analyzed;
  working = true; element('fill-draft').disabled = true; element('analyze').disabled = true;
  element('draft-status').textContent = 'Đang đối chiếu địa chỉ, SKU và điền đơn trên Pancake…';
  try {
    await checkLiveChat();
    const result = await chrome.tabs.sendMessage(selected.liveChat.tabId, { type: 'pap-apply-draft', key: selected.liveChat.key, proposal: selected.proposal, transcript: selected.transcript });
    if (!result?.ok) throw new Error(result?.error || 'Không điền được đơn nháp.');
    element('draft-status').textContent = `Đã điền đơn nháp: ${result.draft.products.map(p => `${p.name} × ${p.quantity}`).join(' + ')}. Địa chỉ${result.draft.addressSystem ? ` ${result.draft.addressSystem === 'new' ? 'mới' : 'cũ'}` : ''}: ${result.draft.address}. Mở Pancake xem lại, rồi tích Miễn phí giao hàng để chạy ghi chú/giá và tùy chọn tạo đơn hiện có.`;
  } catch (error) { element('draft-status').textContent = `${error.message} Form có thể đã điền một phần; kiểm tra trước khi làm lại. Chưa bấm Tạo đơn.`; }
  finally { analyzed = null; working = false; element('analyze').disabled = false; }
});
refreshConnection();
if (chrome.tabs?.query) findPancakeTabs().catch(error => element('chat-status').textContent = error.message);
