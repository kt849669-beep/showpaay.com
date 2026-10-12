// Apply the owner's original ShowPay artwork to both static and Node-served pages.
const fs = require('node:fs');
const path = require('node:path');
const dist = path.join(__dirname, 'dist');
const origin = 'https://showpayy.com';
const logo = `${origin}/showpay-official-logo.png`;
const social = `${origin}/showpay-social-preview.png`;
const releaseDate = '2026-10-12';
const sitemapPath = path.join(dist, 'sitemap.xml');
let sitemap = fs.readFileSync(sitemapPath, 'utf8');
const publicUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]));
const logoObject = { '@type': 'ImageObject', '@id': `${origin}/#logo`, url: logo, contentUrl: logo, width: 640, height: 640, caption: 'ShowPay logo' };
const organization = { '@context': 'https://schema.org', '@type': 'Organization', '@id': `${origin}/#organization`, name: 'ShowPay', url: origin + '/', logo: logoObject };
const branding = `
    <link rel="icon" type="image/x-icon" href="/showpay-favicon.ico" sizes="16x16 32x32 48x48 96x96">
    <link rel="icon" type="image/png" href="/showpay-favicon-96.png" sizes="96x96">
    <link rel="apple-touch-icon" href="/showpay-apple-touch-icon.png" sizes="180x180">
    <link rel="manifest" href="/manifest.json">
    <meta property="og:image" content="${social}">
    <meta property="og:image:secure_url" content="${social}">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="ShowPay logo">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="${social}">
    <meta name="twitter:image:alt" content="ShowPay logo">
`;
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)].map(match => [match[1].toLowerCase(), match[3]]));
}
function updateSchema(value) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) { value.forEach(updateSchema); return; }
  if (Object.hasOwn(value, 'logo')) value.logo = logoObject;
  for (const child of Object.values(value)) updateSchema(child);
}
function brandHtml(html) {
  html = html.replace(/\s*<script\b[^>]*id="showpay-brand-organization"[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<link\b[^>]*>/gi, tag => /^(?:icon|shortcut icon|apple-touch-icon|apple-touch-icon-precomposed|mask-icon|manifest)$/.test(attributes(tag).rel || '') ? '' : tag);
  html = html.replace(/<meta\b[^>]*>/gi, tag => {
    const attr = attributes(tag);
    return /^(?:og:image(?::.*)?|twitter:image(?::.*)?|twitter:card)$/.test(attr.property || attr.name || '') ? '' : tag;
  });
  html = html.replace(/(<script\b[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi, (match, open, data, close) => {
    const parsed = JSON.parse(data);
    updateSchema(parsed);
    return open + JSON.stringify(parsed).replace(/</g, '\\u003c') + close;
  });
  const canonicalTag = [...html.matchAll(/<link\b[^>]*>/gi)].find(match => attributes(match[0]).rel === 'canonical');
  const canonical = canonicalTag && attributes(canonicalTag[0]).href;
  const addOrganization = publicUrls.has(canonical) && !/"@type"\s*:\s*"Organization"/.test(html);
  return html.replace(/<\/head>/i, branding + (addOrganization ? `    <script id="showpay-brand-organization" type="application/ld+json">${JSON.stringify(organization)}</script>\n` : '') + '  </head>');
}
function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(file);
    else if (entry.name.endsWith('.html')) fs.writeFileSync(file, brandHtml(fs.readFileSync(file, 'utf8')));
  }
}
visit(dist);
// The Node adapter serves public guide HTML from this document map.
const workerPath = path.join(dist, '_worker.js');
let worker = fs.readFileSync(workerPath, 'utf8');
const documentMatch = worker.match(/const documents = (.+);\nconst aliases =/);
if (!documentMatch) throw new Error('Public document map missing from built app');
const documents = JSON.parse(documentMatch[1]);
for (const route of Object.keys(documents)) documents[route] = brandHtml(documents[route]);
worker = worker.replace(documentMatch[0], () => `const documents = ${JSON.stringify(documents)};\nconst aliases =`);
sitemap = sitemap.replace(/\s+xmlns:image="[^"]*"/g, '').replace(/<image:image>[\s\S]*?<\/image:image>/g, '');
sitemap = sitemap.replace('<urlset ', '<urlset xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" ');
sitemap = sitemap.replace(/<url>([\s\S]*?)<\/url>/g, (_, content) => {
  content = content.replace(/<lastmod>[^<]+<\/lastmod>/g, '');
  if (content.includes(`<loc>${origin}/</loc>`)) content += `<image:image><image:loc>${logo}</image:loc></image:image>`;
  return `<url>${content}<lastmod>${releaseDate}</lastmod></url>`;
});
worker = worker.replace(/const sitemap = (.+);\n/, () => `const sitemap = ${JSON.stringify(sitemap)};\n`);
fs.writeFileSync(workerPath, worker);
fs.writeFileSync(sitemapPath, sitemap);
console.log('ShowPay original logo: favicons, app icons, sharing previews, Organization schema and image sitemap.');
