import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleOrbitAdmin } from '../scripts/orbit-admin-api.js';

const origin = 'https://showpayy.com';
const key = 'sp_orbit_' + 'a'.repeat(64);
function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../database/orbit_auth.sql', import.meta.url), 'utf8'));
  const db = {
    prepare(sql) {
      let values = [];
      const statement = {
        bind(...args) { values = args; return statement; },
        async first() { return sqlite.prepare(sql).get(...values) || null; },
        async run() { return sqlite.prepare(sql).run(...values); },
      };
      return statement;
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  const env = { ORBIT_AUTH: db, ORBIT_API_KEY: key };
  const call = (route, { body, cookie, csrf, browser = false, bearer = key, urlOrigin = origin } = {}) => {
    const headers = {};
    if (route !== 'session') headers['Content-Type'] = 'application/json';
    if (['launch', 'revoke'].includes(route) && bearer) headers.Authorization = 'Bearer ' + bearer;
    if (browser || route === 'redeem' || route === 'logout') headers.Origin = origin;
    if (cookie) headers.Cookie = cookie;
    if (csrf) headers['X-Showpay-Orbit-CSRF'] = csrf;
    return handleOrbitAdmin(new Request(`${urlOrigin}/api/admin/orbit/${route}`, { method: route === 'session' ? 'GET' : 'POST', headers, ...(route !== 'session' ? { body: JSON.stringify(body ?? {}) } : {}) }), env);
  };
  const owner = { orbit_session_id: 'orbit_owner_session_12345', orbit_expires_at: Math.floor(Date.now() / 1000) + 3600 };
  const launch = async () => { const response = await call('launch', { body: owner }); assert.equal(response.status, 200); const data = await response.json(); assert.ok(!JSON.stringify(data).includes(key)); return new URL(data.login_url).hash.slice('#ticket='.length); };
  const login = async () => { const ticket = await launch(); const response = await call('redeem', { body: { ticket } }); assert.equal(response.status, 200); const cookie = response.headers.get('set-cookie'); assert.match(cookie, /Secure; HttpOnly; SameSite=None/); assert.deepEqual(await response.json(), { authenticated: true }); return cookie.split(';')[0]; };
  return { sqlite, env, call, owner, launch, login };
}

test('standalone browser has no Orbit session', async () => {
  const f = fixture(); assert.deepEqual(await (await f.call('session')).json(), { authenticated: false });
});
test('missing and incorrect API keys cannot launch', async () => {
  const f = fixture();
  for (const bearer of ['', 'sp_orbit_' + 'b'.repeat(64)]) assert.equal((await f.call('launch', { body: f.owner, bearer })).status, 401);
});
test('browser cannot use permanent key; previews cannot use production login', async () => {
  const f = fixture();
  assert.equal((await f.call('launch', { body: f.owner, browser: true })).status, 403);
  assert.equal((await f.call('launch', { body: f.owner, urlOrigin: 'https://preview.pages.dev' })).status, 403);
});
test('requires Orbit session and bounded expiry', async () => {
  const f = fixture();
  for (const body of [{}, { ...f.owner, orbit_expires_at: 0 }, { ...f.owner, orbit_expires_at: Math.floor(Date.now() / 1000) + 30000 }]) assert.equal((await f.call('launch', { body })).status, 400);
});
test('launch, redeem and session work with real SQLite and no Supabase', async () => {
  const f = fixture(), cookie = await f.login();
  const response = await f.call('session', { cookie });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const result = await response.json(); assert.equal(result.authenticated, true); assert.match(result.csrf, /^[a-f0-9]{64}$/);
  const row = f.sqlite.prepare('SELECT token_hash FROM orbit_sessions').get(); assert.ok(!cookie.includes(row.token_hash));
});
test('concurrent redemption grants only one session', async () => {
  const f = fixture(), ticket = await f.launch();
  const responses = await Promise.all([f.call('redeem', { body: { ticket } }), f.call('redeem', { body: { ticket } })]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 401]);
});
test('expired ticket and expired session are rejected', async () => {
  const f = fixture(), ticket = await f.launch();
  f.sqlite.exec('UPDATE orbit_tickets SET expires_at = 0');
  assert.equal((await f.call('redeem', { body: { ticket } })).status, 401);
  const cookie = await f.login(); f.sqlite.exec('UPDATE orbit_sessions SET expires_at = 0');
  assert.equal((await (await f.call('session', { cookie })).json()).authenticated, false);
});
test('rotation invalidates tickets and active sessions', async () => {
  const f = fixture(), cookie = await f.login(), ticket = await f.launch();
  f.env.ORBIT_API_KEY = 'sp_orbit_' + 'b'.repeat(64);
  assert.equal((await f.call('redeem', { body: { ticket } })).status, 401);
  assert.equal((await (await f.call('session', { cookie })).json()).authenticated, false);
});
test('logout checks CSRF and revokes browser session', async () => {
  const f = fixture(), cookie = await f.login();
  assert.equal((await f.call('logout', { cookie })).status, 403);
  const session = await (await f.call('session', { cookie })).json();
  const response = await f.call('logout', { cookie, csrf: session.csrf });
  assert.equal(response.status, 200); assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await (await f.call('session', { cookie })).json()).authenticated, false);
});
test('Orbit logout revokes sessions and outstanding tickets for that owner session', async () => {
  const f = fixture(), cookie = await f.login(), ticket = await f.launch();
  assert.equal((await f.call('revoke', { body: { orbit_session_id: f.owner.orbit_session_id } })).status, 200);
  assert.equal((await (await f.call('session', { cookie })).json()).authenticated, false);
  assert.equal((await f.call('redeem', { body: { ticket } })).status, 401);
});
test('missing bindings and database errors fail closed', async () => {
  const f = fixture(); delete f.env.ORBIT_AUTH;
  assert.equal((await f.call('launch', { body: f.owner })).status, 503);
  f.env.ORBIT_AUTH = { prepare() { throw Error('private database failure'); } };
  const response = await f.call('session', { cookie: '__Host-showpay-orbit=' + 'a'.repeat(64) });
  assert.equal(response.status, 503); assert.ok(!(await response.text()).includes('private database failure'));
});
