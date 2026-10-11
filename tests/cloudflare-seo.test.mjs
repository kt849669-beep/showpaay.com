import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker from '../dist/_worker.js';

const deployedRoutes = JSON.parse(fs.readFileSync(new URL('../dist/_routes.json', import.meta.url))).include;
const origin = 'https://showpayy.com';
const request = (route, options) => new Request(origin + route, options);
const env = {ASSETS:{fetch:async req => new Response('unchanged assets: ' + new URL(req.url).pathname, {status:200})}};

test('every scoped public route terminates without a redirect loop and has a single canonical', async () => {
  for (const route of deployedRoutes.filter(route => !route.startsWith('/api/'))) {
    let current = route;
    const visited = new Set();
    let response;
    for (let hop = 0; hop < 4; hop++) {
      assert(!visited.has(current), `Redirect loop: ${route}`);
      visited.add(current);
      response = await worker.fetch(request(current), env);
      if (response.status !== 301) break;
      current = response.headers.get('Location');
    }
    assert.equal(response.status, 200, route);
    assert.equal(response.headers.get('X-Robots-Tag'), 'index, follow');
    const html = await response.text();
    if (route === '/sitemap.xml') continue;
    assert.equal((html.match(/<h1\b/gi) || []).length, 1, route);
    assert.equal((html.match(/rel=["']canonical["']/gi) || []).length, 1, route);
    assert(html.includes(`${origin}${current}`), `Canonical missing: ${route}`);
    for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) JSON.parse(match[1]);
  }
});

test('Orbit API routes reach authentication and fail closed without configuration', async () => {
  assert(deployedRoutes.includes('/api/admin/orbit/*'));
  const response = await worker.fetch(request('/api/admin/orbit/session'), env);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('indexed .html guide address serves content directly and aliases retain query strings', async () => {
  const response = await worker.fetch(request('/showpay-guide.html'), env);
  assert.equal(response.status, 200);
  assert((await response.text()).includes('ShowPay login, app download and USDT help'));
  const alias = await worker.fetch(request('/showpay-guide?source=help'), env);
  assert.equal(alias.status, 301);
  assert.equal(alias.headers.get('Location'), '/showpay-guide.html?source=help');
});

test('sitemap lists only final public addresses that return indexable HTML', async () => {
  const xml = await (await worker.fetch(request('/sitemap.xml'), env)).text();
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert.equal(new Set(urls).size, 11);
  assert(!xml.includes('/admin') && !xml.includes('/home<'));
  for (const url of urls.filter(url => url !== origin + '/')) {
    const response = await worker.fetch(new Request(url), env);
    assert.equal(response.status, 200, url);
    assert.equal(response.headers.get('X-Robots-Tag'), 'index, follow');
  }
});

test('preview guides are noindex and HEAD returns headers without a body', async () => {
  const response = await worker.fetch(new Request('https://preview.showpay3-0.pages.dev/showpay-guide.html'), env);
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  const head = await worker.fetch(request('/showpay-guide.html', {method:'HEAD'}), env);
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

test('login, dashboard, admin and static files preserve the original asset path', async () => {
  for (const route of ['/', '/home', '/admin', '/admin-app/pages/users.html', '/user-app/js/auth/login.js', '/showpay-brand.jpeg', '/not-found']) {
    assert(!deployedRoutes.includes(route), `Non-SEO route intercepted: ${route}`);
    const response = await worker.fetch(request(route), env);
    assert.equal(await response.text(), 'unchanged assets: ' + route);
  }
});

test('public guide links have destinations, and recovery help does not collect credentials', async () => {
  const response = await worker.fetch(request('/showpay-guide.html'), env);
  for (const match of (await response.text()).matchAll(/href="(\/[^"#]*)"/g)) {
    if (match[1] === '/' || match[1].includes('showpay-logo')) continue;
    assert(deployedRoutes.includes(match[1]), `Missing public route ${match[1]}`);
  }
  const help = await (await worker.fetch(request('/showpay-password-help.html'), env)).text();
  assert(!/<input\b|<form\b/i.test(help));
});
