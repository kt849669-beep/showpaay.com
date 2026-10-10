const fs = require('fs');
const path = require('path');

const domain = (process.env.SITE_URL || 'https://showpayy.com').replace(/\/$/, '');
const sitemapFile = path.join(__dirname, 'public', 'sitemap.xml');

const urls = [
  {
    loc: `${domain}/`,
    source: path.join(__dirname, 'user-app', 'pages', 'login.html'),
    changefreq: 'weekly',
    priority: '1.0',
  },
  {
    loc: `${domain}/about-showpay.html`,
    source: path.join(__dirname, 'public', 'about-showpay.html'),
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    loc: `${domain}/showpay-apk`,
    source: path.join(__dirname, 'public', 'showpay-apk.html'),
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    loc: `${domain}/showpay-usdt`,
    source: path.join(__dirname, 'public', 'showpay-usdt.html'),
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    loc: `${domain}/showpay-guide.html`,
    source: path.join(__dirname, 'public', 'showpay-guide.html'),
    changefreq: 'monthly',
    priority: '0.9',
  },
  {
    loc: `${domain}/how-to-use-showpay.html`,
    source: path.join(__dirname, 'public', 'how-to-use-showpay.html'),
    changefreq: 'monthly',
    priority: '0.7',
  },
  {
    loc: `${domain}/how-to-deposit-showpay.html`,
    source: path.join(__dirname, 'public', 'how-to-deposit-showpay.html'),
    changefreq: 'monthly',
    priority: '0.7',
  },
  {
    loc: `${domain}/showpay-password-help.html`,
    source: path.join(__dirname, 'public', 'showpay-password-help.html'),
    changefreq: 'monthly',
    priority: '0.7',
  },
  {
    loc: `${domain}/showpay-support.html`,
    source: path.join(__dirname, 'public', 'showpay-support.html'),
    changefreq: 'monthly',
    priority: '0.7',
  },
];

function xmlEscape(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function sourceLastModified(source) {
  return fs.statSync(source).mtime.toISOString().slice(0, 10);
}

function generateSitemap() {
  for (const entry of urls) {
    if (!fs.existsSync(entry.source)) {
      throw new Error(`Cannot generate sitemap: missing source ${entry.source}`);
    }
  }

  const entries = urls
    .map(
      (entry) => `  <url>
    <loc>${xmlEscape(entry.loc)}</loc>
    <lastmod>${sourceLastModified(entry.source)}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
    )
    .join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;

  fs.writeFileSync(sitemapFile, sitemap, 'utf8');
  console.log(`Sitemap generated successfully at ${sitemapFile}`);
}

generateSitemap();
