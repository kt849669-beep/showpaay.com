import test from 'node:test';
import assert from 'node:assert/strict';
import {
  completedPeriods,
  inspectHtml,
  inspectRobots,
  normalizeQuery,
  parseSitemap,
  percentChange,
} from '../lib.mjs';

test('uses complete seven-day comparison windows', () => {
  assert.deepEqual(completedPeriods(new Date('2026-08-04T12:00:00Z')), {
    current: { start: '2026-07-27', end: '2026-08-02' },
    previous: { start: '2026-07-20', end: '2026-07-26' },
  });
});

test('normalizes keyword casing and spaces', () => {
  assert.equal(normalizeQuery('  ShowPay   Login '), 'showpay login');
});

test('calculates percentage changes safely', () => {
  assert.equal(percentChange(7, 10), -30);
  assert.equal(percentChange(0, 0), 0);
  assert.equal(percentChange(1, 0), null);
});

test('extracts essential SEO fields and internal links', () => {
  const html = `<!doctype html><html><head>
    <title>ShowPay Login</title>
    <meta name="description" content="A sufficiently descriptive and truthful description for the monitored ShowPay page.">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="index,follow">
    <link rel="canonical" href="https://showpayy.com/">
    <script type="application/ld+json">{"@type":"WebSite"}</script>
  </head><body><h1>ShowPay Login</h1><a href="/support.html">Support</a></body></html>`;
  const result = inspectHtml(html, 'https://showpayy.com/');
  assert.equal(result.title, 'ShowPay Login');
  assert.equal(result.canonical, 'https://showpayy.com/');
  assert.deepEqual(result.h1s, ['ShowPay Login']);
  assert.deepEqual(result.links, ['https://showpayy.com/support.html']);
  assert.deepEqual(result.schemaErrors, []);
});

test('parses sitemap and robots directives', () => {
  assert.deepEqual(parseSitemap('<urlset><url><loc>https://showpayy.com/</loc></url></urlset>'), ['https://showpayy.com/']);
  assert.deepEqual(inspectRobots('User-agent: *\nAllow: /\nSitemap: https://showpayy.com/sitemap.xml', 'https://showpayy.com/'), {
    sitemaps: ['https://showpayy.com/sitemap.xml'],
    declaresExpectedSitemap: true,
    blocksAll: false,
  });
});
