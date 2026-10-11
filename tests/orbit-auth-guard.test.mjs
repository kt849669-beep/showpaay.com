import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function setup({ orbit = false, ordinaryToken, orbitHint = false, apiFailure = false } = {}) {
  let ready, logout, databaseCalls = 0;
  const local = new Map(ordinaryToken ? [['showpay_admin_session_token', ordinaryToken]] : []);
  const temporary = new Map(orbitHint ? [['showpay_orbit_login', '1']] : []);
  const storage = map => ({ getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) });
  const context = {
    document: { addEventListener: (_, callback) => { ready = callback; }, getElementById: () => ({ addEventListener: (_, callback) => { logout = callback; } }) },
    window: { location: { href: '' } }, localStorage: storage(local), sessionStorage: storage(temporary),
    console, alert() {}, fetch: async () => { if (apiFailure) throw Error('offline'); return { ok: true, json: async () => ({ authenticated: orbit, csrf: 'csrf' }) }; },
    supabase: { from() { databaseCalls++; const query = { select: () => query, eq: () => query, limit: async () => ({ data: [{ token: ordinaryToken }], error: null }), update: () => query }; return query; } },
  };
  const source = readFileSync(new URL('../admin-app/js/auth.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/m, '').replace('export async function', 'async function');
  vm.runInNewContext(source, context);
  return { context, run: () => ready(), databaseCalls: () => databaseCalls, logout: () => logout };
}
test('verified Orbit cookie grants entry without creating a fake Supabase token', async () => {
  const f = setup({ orbit: true }); await f.run();
  assert.equal(f.context.window.location.href, ''); assert.equal(f.databaseCalls(), 0);
  assert.equal(f.context.localStorage.getItem('showpay_admin_session_token'), null); assert.equal(typeof f.logout(), 'function');
});
test('fresh standalone browser is redirected to password login', async () => {
  const f = setup(); await f.run(); assert.equal(f.context.window.location.href, '/admin');
});
test('ordinary password session continues through existing ShowPay validation', async () => {
  const f = setup({ ordinaryToken: 'existing-session' }); await f.run();
  assert.equal(f.context.window.location.href, ''); assert.equal(f.databaseCalls(), 2);
});
test('expired or unverifiable Orbit login fails closed even when a legacy token exists', async () => {
  for (const apiFailure of [false, true]) {
    const f = setup({ ordinaryToken: 'legacy', orbitHint: true, apiFailure }); await f.run();
    assert.equal(f.context.window.location.href, '/admin'); assert.equal(f.databaseCalls(), 0);
  }
});
