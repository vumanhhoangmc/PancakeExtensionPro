const crypto = require('node:crypto');

function makeAttempt(hostId, redirectUri) {
  const random = () => crypto.randomBytes(32).toString('base64url');
  const attempt = { state: random(), nonce: random(), verifier: random(), redirectUri, expires: Date.now() + 600000 };
  const url = new URL('https://auth.openai.com/api/accounts/authorize');
  url.search = new URLSearchParams({ client_id: 'dynamic_agent_client', agent_name_hint: 'Pancake Assistant Pro',
    ext_agent_host_id: hostId, response_type: 'code', redirect_uri: redirectUri,
    scope: 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct',
    resource: 'https://api.openai.com/v1', state: attempt.state, nonce: attempt.nonce,
    code_challenge_method: 'S256', code_challenge: crypto.createHash('sha256').update(attempt.verifier).digest('base64url') }).toString();
  return { ...attempt, url: url.href };
}

function validateCallback(url, attempt) {
  if (!attempt || Date.now() > attempt.expires || url.searchParams.get('state') !== attempt.state) throw new Error('Đăng nhập hết hạn hoặc state không khớp.');
  if (url.searchParams.has('error')) throw new Error('Bạn chưa cấp quyền đăng nhập hoặc sử dụng gói ChatGPT.');
  const clientId = url.searchParams.get('client_id');
  const code = url.searchParams.get('code');
  if (!clientId || clientId === 'dynamic_agent_client' || !code) throw new Error('Đăng ký chưa trả về client ID và mã hợp lệ.');
  return { clientId, code };
}

function verifyIdToken(token, keys, clientId, nonce) {
  const parts = String(token).split('.');
  if (parts.length !== 3) throw new Error('ID token không hợp lệ.');
  const header = JSON.parse(Buffer.from(parts[0], 'base64url'));
  const claims = JSON.parse(Buffer.from(parts[1], 'base64url'));
  const key = keys.find(k => k.kid === header.kid && k.kty === 'RSA' && (!k.use || k.use === 'sig'));
  if (header.alg !== 'RS256' || !key || !crypto.verify('RSA-SHA256', Buffer.from(parts.slice(0, 2).join('.')), crypto.createPublicKey({ key, format: 'jwk' }), Buffer.from(parts[2], 'base64url'))) throw new Error('Không xác minh được chữ ký đăng nhập.');
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== 'https://auth.openai.com' || !audiences.includes(clientId) || claims.nonce !== nonce || !Number.isFinite(claims.exp) || claims.exp <= Date.now() / 1000 || !claims.sub || (audiences.length > 1 && claims.azp !== clientId)) throw new Error('Thông tin xác thực đăng nhập không khớp.');
  return claims;
}

async function readResponseStream(body) {
  let buffer = '', text = '', completed = false;
  const decoder = new TextDecoder();
  function consume(frame) {
    const data = frame.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n');
    if (!data || data === '[DONE]') return;
    const event = JSON.parse(data);
    if (event.type === 'response.output_text.delta') text += event.delta;
    if (event.type === 'response.completed') completed = true;
    if (['response.failed', 'response.incomplete', 'error'].includes(event.type)) throw new Error('ChatGPT không hoàn tất yêu cầu. Kiểm tra hạn mức/quyền tài khoản rồi thử lại.');
  }
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    buffer = buffer.replace(/\r\n/g, '\n');
    let end;
    while ((end = buffer.indexOf('\n\n')) !== -1) { consume(buffer.slice(0, end)); buffer = buffer.slice(end + 2); }
    if (buffer.length > 1000000 || text.length > 50000) throw new Error('Phản hồi quá lớn.');
  }
  if (buffer.trim()) consume(buffer);
  if (!completed || !text.trim()) throw new Error('Kết nối bị ngắt hoặc không có kết quả hoàn chỉnh.');
  return text;
}

function parseProposal(text) {
  const proposal = JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''));
  if (!['confirmed', 'unclear', 'cancelled', 'inquiry'].includes(proposal.intent) || !Array.isArray(proposal.items) || proposal.items.length > 20) throw new Error('Kết quả AI không đúng cấu trúc.');
  for (const item of proposal.items) {
    if (typeof item.product !== 'string' || !item.product.trim() || !Number.isFinite(item.kg) || item.kg <= 0 || item.kg > 1000 || typeof item.evidence !== 'string') throw new Error('Sản phẩm/khối lượng AI chưa hợp lệ.');
  }
  return { intent: proposal.intent, items: proposal.items.map(({ product, kg, evidence }) => ({ product, kg, evidence })) };
}
module.exports = { makeAttempt, validateCallback, verifyIdToken, readResponseStream, parseProposal };
