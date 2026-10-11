// Finalize the public homepage after the existing app and guide build.
const fs = require('node:fs');
const path = require('node:path');
const dist = path.join(__dirname, 'dist');
const homepage = fs.readFileSync(path.join(dist, 'landing-page.html'), 'utf8');
fs.writeFileSync(path.join(dist, 'index.html'), homepage);
const workerPath = path.join(dist, '_worker.js');
let worker = fs.readFileSync(workerPath, 'utf8');
const documentMatch = worker.match(/const documents = (.+);\nconst aliases =/);
const documents = JSON.parse(documentMatch[1]);
documents['/'] = homepage;
for (const file of ['privacy-policy.html', 'terms.html']) {
  documents['/' + file] = fs.readFileSync(path.join(dist, file), 'utf8');
}
worker = worker.replace(documentMatch[0], `const documents = ${JSON.stringify(documents)};\nconst aliases =`);
let sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
for (const route of ['/privacy-policy.html', '/terms.html']) {
  sitemap = sitemap.replace('</urlset>', `  <url><loc>https://showpayy.com${route}</loc><lastmod>2026-10-11</lastmod></url>\n</urlset>`);
}
worker = worker.replace(/const sitemap = (.+);\n/, `const sitemap = ${JSON.stringify(sitemap)};\n`);
fs.writeFileSync(workerPath, worker);
fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(dist, 'robots.txt'), 'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin-app/\nDisallow: /api/\nDisallow: /home\nDisallow: /user-app/\nDisallow: /complete\n\nSitemap: https://showpayy.com/sitemap.xml\n');
const routesPath = path.join(dist, '_routes.json');
const routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
routes.include = [...new Set([...routes.include, '/', '/privacy-policy.html', '/terms.html'])];
fs.writeFileSync(routesPath, JSON.stringify(routes, null, 2));
console.log('GoDaddy homepage: showpayy.com landing, /login account access, canonical public sitemap.');
