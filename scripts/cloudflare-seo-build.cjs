/* Build a Cloudflare-only routing layer for public guides. Existing app/admin
 * assets and their routing continue through ASSETS without authentication changes. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const origin = 'https://showpayy.com';
const publicResources = require('./showpay-public-resources.cjs');
const changedDate = '2026-10-11';
const routes = {
  '/about-showpay.html': 'about-showpay.html',
  '/showpay-apk': 'showpay-apk.html',
  '/showpay-usdt': 'showpay-usdt.html',
  '/showpay-guide.html': 'showpay-guide.html',
  '/homepages': 'homepages.html',
};
const help = [
  ['showpay-password-help.html', 'ShowPay Password Help | Login Troubleshooting', 'ShowPay password and login help',
    'Find ShowPay login troubleshooting steps and learn how to locate account recovery assistance without sharing your password, OTP or MPIN.',
    `<h2>Having trouble with your ShowPay login?</h2><ol><li>Open <a href="/">showpayy.com</a> and check the complete address.</li><li>Check your registered phone number and keyboard settings. Avoid repeated login attempts.</li><li>If you cannot remember your password, use a recovery option provided inside the account service or contact its support.</li></ol><h2>Does this page reset a password?</h2><p>This is a public help guide. It does not collect passwords or OTPs and cannot change your account password. No email or phone recovery method is advertised here without verification.</p><p><a href="/showpay-support.html">Read the ShowPay support guide</a>.</p>`],
  ['showpay-support.html', 'ShowPay Support | Account and Transaction Help', 'ShowPay customer support guide',
    'Find the information to prepare for ShowPay login and transaction questions, and learn how to use support without sharing private account credentials.',
    `<h2>Where can I find ShowPay support?</h2><p>Use the support option provided by your signed-in account or by the account service you registered with. Check the destination before opening an external link.</p><h2>What information should I prepare?</h2><p>Describe the issue and when it happened. For a transaction question, retain the transaction reference and status. Do not publish private account information.</p><h2>What should I never share?</h2><p>Keep your password, OTP, MPIN and recovery codes private. This guide does not collect credentials or payments. A support email address or Telegram contact should be used only after its ownership has been verified.</p><p><a href="/showpay-password-help.html">Password and login help</a> · <a href="/showpay-usdt">USDT help</a></p>`],
  ['how-to-use-showpay.html', 'How to Use ShowPay | Web App and Login Guide', 'How to use the ShowPay web app',
    'Learn how to open the ShowPay web app, access your account and find public guides for mobile use, login assistance and transaction checks.',
    `<h2>Open ShowPay on a phone or computer</h2><p>Open <a href="/">https://showpayy.com/</a> in a current browser. Sign in only with your own registered account details. The web app does not require an APK installation.</p><h2>Review the available account tools</h2><p>After signing in, check the options available to your account. Public guides do not replace current instructions, fees, limits or transaction information displayed by the account service.</p><h2>Find the guide for your task</h2><p><a href="/showpay-apk">ShowPay app and APK download information</a> · <a href="/showpay-usdt">ShowPay USDT information</a> · <a href="/showpay-password-help.html">Login help</a></p>`],
  ['how-to-deposit-showpay.html', 'ShowPay Deposit Help | Checks Before a Transfer', 'ShowPay deposit help',
    'Review the destination, payment method, amount and transaction status before using a deposit feature available in your ShowPay account.',
    `<h2>Check instructions in your own account</h2><p>Use a deposit option only when it is available in your signed-in account. Confirm the recipient, method, amount and any displayed fee before sending funds.</p><h2>Keep a transaction reference</h2><p>Retain the payment reference and check the transaction status. A pending status does not confirm that a deposit has completed. Do not repeat a transfer solely because its status is delayed.</p><h2>Need help?</h2><p>Use the account service's verified support option. Read the <a href="/showpay-support.html">support guide</a> and <a href="/showpay-usdt">USDT guide</a>. This page does not provide a deposit address or promise a return.</p>`],
  ['how-to-deposit-usdt-showpay.html', 'ShowPay USDT Deposit Help | Network and Address Checks', 'ShowPay USDT deposit help',
    'Understand USDT network, destination address, fee and transaction reference checks before using a USDT deposit feature in a ShowPay account.',
    `<h2>Verify the network and full address</h2><p>If your account offers USDT deposits, use the network and complete destination address displayed there. The sending wallet and receiving account must support the same network.</p><h2>Check fees and transaction status</h2><p>Review the amount and network fee. Retain the transaction ID and check its status on the explorer for that network. Confirmation time can vary.</p><h2>USDT to INR information</h2><p>A USDT to INR quote can change with the provider, fees and time. This website does not publish a guaranteed live conversion rate. Confirm the quote and terms in your own account before proceeding.</p><p><a href="/showpay-usdt">Read the ShowPay USDT guide</a> · <a href="/showpay-support.html">Get support guidance</a></p>`],
];
const navigation = `<nav aria-label="ShowPay public guides"><a href="/">ShowPay Login</a> · <a href="/showpay-guide.html">All guides</a> · <a href="/showpay-apk">App and APK</a> · <a href="/showpay-usdt">USDT</a> · <a href="/showpay-password-help.html">Password help</a> · <a href="/showpay-support.html">Support</a></nav>`;
const styles = `*{box-sizing:border-box}body{margin:0;color:#172033;background:#fff;font:16px/1.75 system-ui,sans-serif}header,main,footer{max-width:920px;margin:auto;padding:24px}header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e6edf5;gap:16px}header a{display:inline-flex;align-items:center;gap:10px}img{object-fit:contain}a{color:#0056b3;text-underline-offset:3px}h1,h2{line-height:1.3}h1{font-size:clamp(28px,6vw,42px)}h2{margin-top:32px}nav{padding-top:20px}footer{font-size:14px;border-top:1px solid #e6edf5}a:focus-visible{outline:3px solid #0056b3;outline-offset:4px}`;
for (const [filename, title, heading, description, body] of help) {
  const route = `/${filename}`;
  routes[route] = filename;
  const schema = {'@context':'https://schema.org','@type':'WebPage','@id':`${origin}${route}#webpage`,url:`${origin}${route}`,name:title,description,isPartOf:{'@id':`${origin}/#website`}};
  const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><meta name="description" content="${description}"><meta name="robots" content="index, follow, max-image-preview:large"><link rel="canonical" href="${origin}${route}"><link rel="icon" type="image/jpeg" href="/showpay-brand.jpeg"><meta property="og:site_name" content="ShowPay"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${origin}${route}"><meta property="og:image" content="${origin}/showpay-brand.jpeg"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${origin}/showpay-brand.jpeg"><script type="application/ld+json">${JSON.stringify(schema)}</script><style>${styles}</style></head><body><header><a href="/"><img src="/showpay-brand.jpeg" alt="ShowPay" width="40" height="40">ShowPay</a><a href="/">Login</a></header><main><h1>${heading}</h1>${body}${navigation}</main><footer>ShowPay public help · Check current account instructions before taking action.</footer></body></html>\n`;
  fs.writeFileSync(path.join(dist, filename), html);
}
const guideExtra = `\n<section class="content-section" aria-labelledby="showpay-guide-quick-answers"><h2 id="showpay-guide-quick-answers">ShowPay login, app download and USDT help</h2><p>ShowPay, also written Show Pay, is the name used for the web app and account guides on showpayy.com. Start with the task you want to complete.</p><h3>Where is the ShowPay login?</h3><p><a href="/">Open the ShowPay login</a> to access your registered account. For assistance, read <a href="/showpay-password-help.html">password and login help</a>.</p><h3>Where can I download the ShowPay app or APK?</h3><p>The web app works in a current browser. This website does not host a direct APK download. Read the <a href="/showpay-apk">app and APK guide</a> before considering an installation.</p><h3>Where can I find ShowPay USDT to INR information?</h3><p>Read the <a href="/showpay-usdt">USDT guide</a> for network and transaction checks. Conversion quotes and fees can change; confirm current terms in your account.</p>${navigation}</section>\n`;
const guideFile = path.join(dist, 'showpay-guide.html');
fs.writeFileSync(guideFile, fs.readFileSync(guideFile, 'utf8').replace('    </main>', `${guideExtra}    </main>`));
for (const filename of ['showpay-guide.html', 'how-to-deposit-showpay.html']) {
  const documentPath = path.join(dist, filename);
  fs.writeFileSync(documentPath, fs.readFileSync(documentPath, 'utf8').replace('</main>', `${publicResources}</main>`));
}
const passwordHelpPath = path.join(dist, 'showpay-password-help.html');
fs.writeFileSync(passwordHelpPath, fs.readFileSync(passwordHelpPath, 'utf8').replace('<h2>Does this page reset a password?</h2>', '<p><a href="https://app-web.showpayweb.com/forgetPassword">Open the ShowPay Forgot Password page</a></p><h2>Does this page reset a password?</h2>'));

// Keep the indexed .html addresses for guides. Serve clean aliases with one 301.
const aliases = {'/showpay/homepages':'/homepages','/showpay/homepages/':'/homepages','/showpay/homepages/index.html':'/homepages'};
for (const route of Object.keys(routes)) {
  if (route.endsWith('.html')) {
    aliases[route.slice(0, -5)] = route;
    aliases[`${route.slice(0, -5)}/`] = route;
  } else {
    aliases[`${route}.html`] = route;
    aliases[`${route}/`] = route;
  }
}
const documents = {};
for (const [route, filename] of Object.entries(routes)) {
  documents[route] = fs.readFileSync(path.join(dist, filename), 'utf8');
}
const updatedRoutes = new Set(['/', '/showpay-guide.html', ...help.map(([filename]) => `/${filename}`)]);
const sitemapEntries = ['/', ...Object.keys(routes)].map(route => {
  const lastmod = route === '/' ? '2026-10-14' : updatedRoutes.has(route) ? changedDate : '';
  const logo = route === '/' ? `<image:image><image:loc>${origin}/showpay-logo.png</image:loc></image:image>` : '';
  return `  <url><loc>${origin}${route}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}${logo}</url>`;
});
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${sitemapEntries.join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemap);
const routingSource = fs.readFileSync(path.join(root, 'scripts', 'cloudflare-seo-worker.js'), 'utf8');
const orbitSource = fs.readFileSync(path.join(root, 'scripts', 'orbit-admin-api.js'), 'utf8').replace(/^export /gm, '');
fs.writeFileSync(path.join(dist, '_worker.js'), `${orbitSource}\nconst documents = ${JSON.stringify(documents)};\nconst aliases = ${JSON.stringify(aliases)};\nconst sitemap = ${JSON.stringify(sitemap)};\n${routingSource}`);
fs.writeFileSync(path.join(dist, '_routes.json'), JSON.stringify({version:1,include:[...Object.keys(routes),...Object.keys(aliases),'/sitemap.xml','/api/admin/orbit/*'],exclude:[]},null,2));
console.log(`Cloudflare SEO build: ${Object.keys(routes).length} public guides; login/admin assets unchanged.`);
require('./optimize-public-login.cjs');
