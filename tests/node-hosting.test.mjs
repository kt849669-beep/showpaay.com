import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHostingServer } from '../scripts/node-server.mjs';

let server, port;
test.before(async () => {
  server = await createHostingServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  port = server.address().port;
});
test.after(() => new Promise(resolve => server.close(resolve)));
function request(route, { method = 'GET', host = 'showpayy.com', body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: route, method, headers: { Host: host, 'X-Forwarded-Proto': 'https', ...headers } }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.end(body);
  });
}
test('login, admin and dashboard use their existing built pages', async () => {
  for (const route of ['/', '/admin', '/home', '/admin-app/pages/login.html', '/user-app/pages/login']) {
    const response = await request(route);
    assert.equal(response.status, 200, route);
    assert.match(response.headers['content-type'], /text\/html/);
    assert.match(response.body, /ShowPay|Showpay/);
  }
});
test('public guides, sitemap and query-preserving aliases retain the production origin', async () => {
  const guide = await request('/showpay-guide.html');
  assert.equal(guide.status, 200);
  assert.match(guide.body, /https:\/\/showpayy\.com/);
  assert.equal(guide.headers['x-robots-tag'], 'index, follow');
  const alias = await request('/showpay-guide?source=test');
  assert.equal(alias.status, 301);
  assert.equal(alias.headers.location, '/showpay-guide.html?source=test');
  const sitemap = await request('/sitemap.xml');
  assert.equal(sitemap.status, 200);
  assert.match(sitemap.body, /https:\/\/showpayy\.com\//);
  const login = await request('/login?source=test');
  assert.equal(login.status, 200);
  assert.match(login.body, /id="loginBtn"/);
  assert.doesNotMatch(login.body, /<section class="login-seo-content"/);
  const landing = await request('/');
  assert.match(landing.body, /Show Pay app\./);
  assert.match(landing.body, /https:\/\/showpayy\.com\/login/);
  assert.doesNotMatch(landing.body, /showpaay\.online/);
  for (const route of ['/privacy-policy.html', '/terms.html']) {
    const page = await request(route);
    assert.equal(page.status, 200);
    assert.ok(sitemap.body.includes('https://showpayy.com' + route));
  }
});
test('preview responses are noindex and HEAD has no body', async () => {
  for (const route of ['/', '/showpay-guide.html']) assert.equal((await request(route, { host: 'preview.example.test' })).headers['x-robots-tag'], 'noindex, nofollow');
  const head = await request('/admin', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
});
test('source files, secrets, path traversal and build control files cannot be served', async () => {
  for (const route of ['/.env', '/package.json', '/server.ts', '/scripts/orbit-admin-api.js', '/_worker.js', '/_routes.json', '/_redirects', '/%2e%2e%2fscripts%2forbit-admin-api.js', '/assets%5c..%5c_worker.js']) {
    const response = await request(route);
    assert.equal(response.status, 404, route);
    assert.doesNotMatch(response.body, /ORBIT_API_KEY|export async function|"dependencies"/);
  }
});
test('optional Orbit auth fails closed and oversized requests are bounded', async () => {
  const session = await request('/api/admin/orbit/session');
  assert.equal(session.status, 503);
  assert.equal(session.headers['cache-control'], 'no-store');
  assert.equal((await request('/api/admin/orbit/session', { host: 'preview.example.test' })).status, 403);
  assert.equal((await request('/api/admin/orbit/redeem', { method: 'POST', body: 'x'.repeat(2049), headers: { 'Content-Type': 'application/json' } })).status, 413);
  assert.equal((await request('/admin', { method: 'POST' })).status, 405);
});
test('health check reports optional Orbit status without exposing credentials', async () => {
  const response = await request('/healthz');
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.body), { ok: true, orbitConfigured: false });
});
test('production entry point listens on the hosting-assigned PORT', async t => {
  const reserved = http.createServer();
  reserved.listen(0, '127.0.0.1');
  await once(reserved, 'listening');
  const assigned = reserved.address().port;
  await new Promise(resolve => reserved.close(resolve));
  const child = spawn(process.execPath, ['scripts/node-server.mjs'], { cwd: new URL('../', import.meta.url), env: { ...process.env, PORT: String(assigned), ORBIT_API_KEY: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { child.kill(); });
  await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error('Server did not start')), 10000);
    child.stdout.on('data', chunk => { output += chunk; if (output.includes(`listening on port ${assigned}`)) { clearTimeout(timeout); resolve(); } });
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}`)); });
    child.once('error', error => { clearTimeout(timeout); reject(error); });
  });
  const response = await fetch(`http://127.0.0.1:${assigned}/healthz`);
  assert.equal(response.status, 200);
});

