import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const domain = 'https://showpayy.com';
const publicPages = [
  'about-showpay.html',
  'showpay-apk.html',
  'showpay-support.html',
  'showpay-usdt.html',
  'showpay-guide.html',
  'how-to-use-showpay.html',
  'how-to-deposit-showpay.html',
  'how-to-deposit-usdt-showpay.html',
  'showpay-password-help.html',
];

const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function headValue(html, tag, attribute, value, outputAttribute) {
  const tags = html.match(new RegExp(`<${tag}\\b[^>]*>`, 'gi')) ?? [];
  for (const candidate of tags) {
    const selector = candidate.match(
      new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']+)["']`, 'i'),
    );
    if (selector?.[1]?.toLowerCase() !== value.toLowerCase()) continue;
    const output = candidate.match(
      new RegExp(`\\b${outputAttribute}\\s*=\\s*["']([^"']*)["']`, 'i'),
    );
    return output?.[1] ?? '';
  }
  return '';
}

function validateJsonLd(html, label) {
  const scripts = [
    ...html.matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  expect(scripts.length > 0, `${label}: missing JSON-LD`);
  for (const script of scripts) {
    try {
      JSON.parse(script[1]);
    } catch (error) {
      failures.push(`${label}: invalid JSON-LD (${error.message})`);
    }
  }
}

const login = read('user-app/pages/login.html');
const loginStyles = read('user-app/css/login.css');
expect(login.includes('<h1 class="header">Login</h1>'), 'login: missing visible H1');
expect(loginStyles.includes('min-height: 100svh'), 'login: first view must fill the small mobile viewport');
expect(loginStyles.includes('min-height: 100dvh'), 'login: first view must track the dynamic mobile viewport');
expect(login.includes('history.scrollRestoration = "manual"'), 'login: browser scroll restoration must be disabled');
expect(login.includes('window.scrollTo(0, 0)'), 'login: page must open at the login view');
expect(
  headValue(login, 'link', 'rel', 'canonical', 'href') === `${domain}/`,
  'login: canonical must be the root URL',
);
expect(
  headValue(login, 'meta', 'name', 'description', 'content').length >= 70,
  'login: description is missing or too short',
);
expect(login.includes('ShowPay App &amp; Secure Account Access'), 'login: title must cover ShowPay app access');
expect(login.includes('class="login-seo-content"'), 'login: missing visible SEO answer content');
expect(login.includes('class="seo-faq"'), 'login: missing visible FAQ content');
expect(login.includes('"@type": "FAQPage"'), 'login: missing FAQPage schema');
for (const link of ['/showpay-guide.html', '/showpay-apk', '/showpay-usdt', '/showpay-support.html']) {
  expect(login.includes(`href="${link}"`), `login: missing internal link ${link}`);
}
expect(!login.includes('/assets/showpay-og-image.jpg'), 'login: references missing OG image');
expect(!login.includes('/assets/logo.png'), 'login: references missing logo');
validateJsonLd(login, 'login');

const home = read('user-app/pages/home.html');
expect(
  /name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(home),
  'home: authenticated dashboard must be noindex',
);
expect(
  headValue(home, 'link', 'rel', 'canonical', 'href') === `${domain}/home`,
  'home: canonical must use the clean /home route',
);

for (const filename of publicPages) {
  const html = read(`public/${filename}`);
  const label = `public/${filename}`;
  expect(/<meta\b[^>]*name=["']viewport["']/i.test(html), `${label}: missing viewport`);
  expect(
    headValue(html, 'meta', 'name', 'description', 'content').length >= 70,
    `${label}: missing or short description`,
  );
  const canonicalRoutes = {
    'showpay-apk.html': '/showpay-apk',
    'showpay-usdt.html': '/showpay-usdt',
  };
  expect(
    headValue(html, 'link', 'rel', 'canonical', 'href') === `${domain}${canonicalRoutes[filename] ?? `/${filename}`}`,
    `${label}: canonical mismatch`,
  );
  expect(/<h1\b[^>]*>[^<]+<\/h1>/i.test(html), `${label}: missing H1`);
  expect(html.includes('class="site-header"'), `${label}: missing ShowPay site header`);
  expect(html.includes('<a class="cta" href="/">ShowPay Login</a>'), `${label}: missing ShowPay login CTA`);
  expect(html.includes('class="content-section"'), `${label}: missing detailed content section`);
  const visibleText = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  expect(visibleText.split(' ').length >= 300, `${label}: content is too thin`);
  validateJsonLd(html, label);
}

expect(fs.statSync(path.join(root, 'public', 'showpay-logo.png')).size > 0, 'public logo is empty');

const sitemap = read('public/sitemap.xml');
const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const sitemapRoutes = {
  'showpay-apk.html': '/showpay-apk',
  'showpay-usdt.html': '/showpay-usdt',
};
const expectedLocations = [
  `${domain}/`,
  ...publicPages.map((page) => `${domain}${sitemapRoutes[page] ?? `/${page}`}`),
];
expect(
  JSON.stringify(sitemapLocations) === JSON.stringify(expectedLocations),
  `sitemap URLs mismatch: ${sitemapLocations.join(', ')}`,
);
expect(!sitemap.includes('/user-app/'), 'sitemap: internal app URL must not be submitted');
expect(
  read('public/showpay-guide.html').includes('alternateName'),
  'guide hub: missing ShowPay alternate-name entity signal',
);
for (const filename of publicPages) {
  const html = read(`public/${filename}`);
  expect(html.includes('href="/showpay-guide.html"'), `${filename}: missing guide hub link`);
}

const robots = read('public/robots.txt');
expect(robots.includes(`Sitemap: ${domain}/sitemap.xml`), 'robots: sitemap directive missing');
expect(robots.includes('Disallow: /admin'), 'robots: admin disallow missing');

// --- Regressions that previously cost organic visibility -------------------

// A 404 that silently forwards to the homepage is a soft 404 and reads as a
// sneaky redirect. The not-found page must render, not relocate.
const notFound = read('public/404.html');
expect(
  !/http-equiv\s*=\s*["']refresh["']/i.test(notFound),
  '404: must not use a meta refresh redirect',
);
expect(
  !/location\s*\.\s*(replace|assign|href)/i.test(notFound),
  '404: must not redirect with JavaScript',
);
expect(
  /name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(notFound),
  '404: must be noindex',
);
expect(notFound.includes('href="/"'), '404: must link back to the ShowPay login');

// The former root document must never compete with the real homepage.
const portal = read('portal.html');
expect(
  /name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(portal),
  'portal: legacy root document must be noindex',
);

// public/ is Vite's publicDir. Listing it as a rollup input too would publish
// every SEO page a second time under /public/*.html.
const viteConfig = read('vite.config.ts');
expect(
  /file\s*!==\s*'public'/.test(viteConfig),
  'vite config: public/ must be excluded from rollup inputs to avoid duplicate URLs',
);

// Two files were previously committed with their whole contents appended
// twice, which broke this audit and overrode the login layout.
for (const [file, pattern] of [
  ['user-app/css/login.css', /^\.login-container\s*\{/gm],
  ['tests/seo-audit.mjs', /^const failures = \[\];/gm],
]) {
  const occurrences = (read(file).match(pattern) ?? []).length;
  expect(occurrences === 1, `${file}: file content appears duplicated (${occurrences} copies found)`);
}

// Primary keyword surfaces must stay covered somewhere on the public site.
const loginText = login.toLowerCase();
const supportPage = read('public/showpay-support.html').toLowerCase();
for (const [term, haystack, label] of [
  ['show pay', loginText, 'login'],
  ['showpay login', loginText, 'login'],
  ['showpay app', loginText, 'login'],
  ['apk', loginText, 'login'],
  ['usdt', loginText, 'login'],
  ['customer support', supportPage, 'showpay-support'],
]) {
  expect(haystack.includes(term), `${label}: primary keyword "${term}" is not covered`);
}

if (failures.length) {
  console.error(`SEO audit failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`SEO audit passed: ${expectedLocations.length} indexable URLs validated.`);
