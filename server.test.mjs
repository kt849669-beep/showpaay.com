import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';

let server, base;
before(async () => {
  const socket = net.createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  base = 'http://127.0.0.1:' + port;
  const env = { ...process.env, PORT: String(port) };
  for (const key of ['DB_HOST', 'DB_USER', 'DB_NAME', 'DB_PASSWORD']) delete env[key];
  server = spawn(process.execPath, ['server.mjs'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server did not start')), 10000);
    server.stdout.on('data', data => { if (String(data).includes('listening')) { clearTimeout(timer); resolve(); } });
    server.on('exit', () => { clearTimeout(timer); reject(new Error('Server exited')); });
  });
});
after(async () => {
  if (server && server.exitCode === null) { const stopped = once(server, 'exit'); server.kill(); await stopped; }
});
test('uses the assigned port and reports missing database honestly', async () => {
  const response = await fetch(base + '/healthz');
  assert.equal(response.status, 503);
  assert.equal((await response.json()).database, false);
});
test('production routes serve built HTML and assets', async () => {
  for (const path of ['/', '/login', '/home?preview=1', '/complete', '/admin', '/admin-app/pages/profile.html', '/showpay-guide']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, /<!doctype html>/i);
    for (const asset of html.matchAll(/(?:src|href)="(\/assets\/[^"#]+)"/g)) assert.equal((await fetch(base + asset[1])).status, 200, asset[1]);
  }
});
test('database endpoints fail closed with no configuration', async () => {
  const response = await fetch(base + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@showpay.com', password: 'admin@0123' }) });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('set-cookie'), null);
});
test('cross-origin writes are rejected and source files are private', async () => {
  assert.equal((await fetch(base + '/api/content/query', { method: 'POST', headers: { Origin: 'https://example.org', 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
  for (const path of ['/server.mjs', '/.env', '/package.json']) assert.equal((await fetch(base + path)).status, 404);
});
test('built frontend does not contain legacy default administrator credentials', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  for (const file of readdirSync('dist/assets', { recursive: true }).filter(file => file.endsWith('.js'))) assert.doesNotMatch(readFileSync('dist/assets/' + file, 'utf8'), /admin@0123|showpay_local_database_v1/);
});
