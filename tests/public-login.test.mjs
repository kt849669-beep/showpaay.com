import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const luminance = hex => {
  const channels = hex.match(/[a-f\d]{2}/gi).map(n => parseInt(n, 16) / 255)
    .map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};
test('public login text colors meet normal text contrast against their backgrounds', () => {
  for (const [foreground, background] of [['0056b3', 'ffffff'], ['606875', 'f8f9fb'], ['ffffff', '0066cc'], ['b42318', 'ffffff']]) {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    assert((values[0] + 0.05) / (values[1] + 0.05) >= 4.5, foreground);
  }
});
test('built login pages allow zoom, label inputs and avoid CSS/icon render blocking', () => {
  for (const file of ['index.html', 'user-app/pages/login.html']) {
    const html = fs.readFileSync(new URL('../dist/' + file, import.meta.url), 'utf8');
    assert(!html.includes('user-scalable=no'));
    assert(!html.includes('maximum-scale=1.0'));
    assert(html.includes('id="mobile" aria-label="Phone number" autocomplete="tel"'));
    assert(html.includes('id="password" aria-label="Password" autocomplete="current-password"'));
    assert(html.includes('<script defer src="https://unpkg.com/lucide@0.511.0/dist/umd/lucide.min.js">'));
    assert(html.includes('document.addEventListener("DOMContentLoaded", () => lucide.createIcons());'));
    assert(!html.includes('@import'));
    assert(html.includes('data-login-styles="/assets/common-'));
    assert(html.includes('media="print" onload="this.media=\'all\'"'));
    for (const id of ['loginForm', 'loginBtn', 'errorMessage', 'limitPopup']) assert(html.includes(`id="${id}"`));
    assert.match(html, /type="module"[^>]+src="\/assets\/login-[^"]+\.js"/);
    assert(html.includes('href="https://app-web.showpay-web.com/regist?code=2invite5p6"'));
  }
});
test('admin login retains its original stylesheet and icon loading', () => {
  const html = fs.readFileSync(new URL('../dist/admin-app/pages/login.html', import.meta.url), 'utf8');
  assert(!html.includes('data-login-accessibility'));
  assert(!html.includes('data-login-styles'));
});
