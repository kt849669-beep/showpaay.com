// Cloudflare-side login API. No Supabase access or panel workflow is required.
const ORBIT_COOKIE = '__Host-showpay-orbit';
const ORBIT_PREFIX = '/api/admin/orbit/';
const ORBIT_ORIGIN = 'https://showpayy.com';
const ORBIT_MAX_AGE = 8 * 60 * 60;
const orbitRandom = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
export async function orbitHash(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

export async function handleOrbitAdmin(request, env) {
  const url = new URL(request.url);
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
  const reply = (status, data, extra = {}) => new Response(JSON.stringify(data), { status, headers: { ...headers, ...extra } });
  // Preview deployments never authenticate against production keys or sessions.
  if (url.origin !== ORBIT_ORIGIN) return reply(403, { error: 'Production ShowPay origin required' });
  const route = url.pathname.slice(ORBIT_PREFIX.length);
  if (!['launch', 'redeem', 'session', 'logout', 'revoke'].includes(route)) return reply(404, { error: 'Unknown API route' });
  if (request.method !== (route === 'session' ? 'GET' : 'POST')) return reply(405, { error: 'Method not allowed' });
  if (!env.ORBIT_AUTH || !/^sp_orbit_[a-f0-9]{64}$/.test(env.ORBIT_API_KEY || '')) return reply(503, { error: 'Orbit login API is not configured' });
  const now = Math.floor(Date.now() / 1000);
  try {
    const keyHash = await orbitHash(env.ORBIT_API_KEY);
    const backend = route === 'launch' || route === 'revoke';
    if (backend) {
      // Orbit checks its own owner session and CSRF before making this call.
      // The shared key is a backend credential, never a browser credential.
      if (request.headers.has('Origin')) return reply(403, { error: 'Use the authenticated Orbit backend' });
      const bearer = request.headers.get('Authorization')?.match(/^Bearer (sp_orbit_[a-f0-9]{64})$/)?.[1];
      if (!bearer) return reply(401, { error: 'Invalid Orbit API key' });
      const candidate = await orbitHash(bearer);
      let diff = 0;
      for (let i = 0; i < keyHash.length; i++) diff |= keyHash.charCodeAt(i) ^ candidate.charCodeAt(i);
      if (diff) return reply(401, { error: 'Invalid Orbit API key' });
    } else if (request.headers.has('Origin') && request.headers.get('Origin') !== ORBIT_ORIGIN) {
      return reply(403, { error: 'Origin denied' });
    }
    let body = {};
    if (request.method === 'POST') {
      if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply(415, { error: 'JSON required' });
      const reader = request.body?.getReader();
      const chunks = []; let size = 0;
      if (reader) for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 2048) { await reader.cancel(); return reply(413, { error: 'Request too large' }); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { return reply(400, { error: 'Invalid JSON' }); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400, { error: 'Invalid request' });
    }
    if (backend) {
      if (typeof body.orbit_session_id !== 'string' || !/^[a-zA-Z0-9_-]{16,128}$/.test(body.orbit_session_id)) return reply(400, { error: 'Orbit session ID required' });
      if (route === 'revoke') {
        await env.ORBIT_AUTH.batch([
          env.ORBIT_AUTH.prepare('DELETE FROM orbit_tickets WHERE orbit_session_id = ? AND key_hash = ?').bind(body.orbit_session_id, keyHash),
          env.ORBIT_AUTH.prepare('DELETE FROM orbit_sessions WHERE orbit_session_id = ? AND key_hash = ?').bind(body.orbit_session_id, keyHash),
        ]);
        return reply(200, { revoked: true });
      }
      if (!Number.isInteger(body.orbit_expires_at) || body.orbit_expires_at <= now || body.orbit_expires_at > now + ORBIT_MAX_AGE) return reply(400, { error: 'Valid Orbit session expiry required (maximum 8 hours)' });
      const ticket = orbitRandom();
      await env.ORBIT_AUTH.batch([
        env.ORBIT_AUTH.prepare('DELETE FROM orbit_tickets WHERE expires_at <= ?').bind(now),
        env.ORBIT_AUTH.prepare('DELETE FROM orbit_sessions WHERE expires_at <= ?').bind(now),
        env.ORBIT_AUTH.prepare('INSERT INTO orbit_tickets(ticket_hash, key_hash, orbit_session_id, expires_at, session_expires_at) VALUES (?, ?, ?, ?, ?)').bind(await orbitHash(ticket), keyHash, body.orbit_session_id, Math.min(now + 60, body.orbit_expires_at), body.orbit_expires_at),
      ]);
      return reply(200, { login_url: `${ORBIT_ORIGIN}/admin-app/pages/orbit-login.html#ticket=${ticket}`, expires_at: Math.min(now + 60, body.orbit_expires_at) });
    }
    if (route === 'redeem') {
      if (request.headers.get('Origin') !== ORBIT_ORIGIN) return reply(403, { error: 'ShowPay origin required' });
      if (typeof body.ticket !== 'string' || !/^[a-f0-9]{64}$/.test(body.ticket)) return reply(401, { error: 'Invalid login link' });
      const ticket = await env.ORBIT_AUTH.prepare('DELETE FROM orbit_tickets WHERE ticket_hash = ? AND key_hash = ? AND expires_at > ? RETURNING orbit_session_id, session_expires_at').bind(await orbitHash(body.ticket), keyHash, now).first();
      if (!ticket) return reply(401, { error: 'Login link expired or already used' });
      const token = orbitRandom(), csrf = orbitRandom();
      await env.ORBIT_AUTH.prepare('INSERT INTO orbit_sessions(token_hash, key_hash, orbit_session_id, expires_at, csrf) VALUES (?, ?, ?, ?, ?)').bind(await orbitHash(token), keyHash, ticket.orbit_session_id, ticket.session_expires_at, csrf).run();
      return reply(200, { authenticated: true }, { 'Set-Cookie': `${ORBIT_COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=${ticket.session_expires_at - now}` });
    }
    const cookie = request.headers.get('Cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(ORBIT_COOKIE + '='))?.slice(ORBIT_COOKIE.length + 1);
    const tokenHash = cookie && /^[a-f0-9]{64}$/.test(cookie) ? await orbitHash(cookie) : null;
    const session = tokenHash && await env.ORBIT_AUTH.prepare('SELECT csrf FROM orbit_sessions WHERE token_hash = ? AND key_hash = ? AND expires_at > ?').bind(tokenHash, keyHash, now).first();
    if (route === 'session') return reply(200, session ? { authenticated: true, csrf: session.csrf } : { authenticated: false });
    if (!session) return reply(401, { error: 'Orbit session required' });
    if (request.headers.get('Origin') !== ORBIT_ORIGIN || request.headers.get('X-Showpay-Orbit-CSRF') !== session.csrf) return reply(403, { error: 'Invalid logout request' });
    await env.ORBIT_AUTH.prepare('DELETE FROM orbit_sessions WHERE token_hash = ?').bind(tokenHash).run();
    return reply(200, { authenticated: false }, { 'Set-Cookie': `${ORBIT_COOKIE}=; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=0` });
  } catch {
    return reply(503, { error: 'Orbit login unavailable. Please retry from Orbit.' });
  }
}
