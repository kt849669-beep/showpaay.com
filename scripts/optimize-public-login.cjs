/* Optimize built public login documents only. Account modules are never rewritten. */
const fs = require('node:fs');
const path = require('node:path');
const dist = path.resolve(__dirname, '../dist');
const fontUrl = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
for (const file of ['index.html', 'user-app/pages/login.html']) {
  const filename = path.join(dist, file);
  let html = fs.readFileSync(filename, 'utf8');
  // Retain the existing stylesheet order, including the final accessibility overrides.
  html = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, tag => {
    const href = tag.match(/href="([^"]+)"/)[1];
    const cssPath = path.resolve(dist, '.' + href);
    if (!cssPath.startsWith(dist + path.sep)) throw new Error('Invalid stylesheet path');
    let css = fs.readFileSync(cssPath, 'utf8');
    css = css.replace(/@import\s*(?:url\()?\s*["']https:\/\/fonts\.googleapis\.com[^"']+["']\s*\)?\s*;/g, '');
    return `<style data-login-styles="${href}">${css}</style>`;
  });
  html = html.replace('maximum-scale=1.0, user-scalable=no, ', '');
  html = html.replace('<script src="https://unpkg.com/lucide@0.511.0/dist/umd/lucide.min.js">', '<script defer src="https://unpkg.com/lucide@0.511.0/dist/umd/lucide.min.js">');
  html = html.replace('      lucide.createIcons();', '      document.addEventListener("DOMContentLoaded", () => lucide.createIcons());');
  html = html.replace('id="mobile"', 'id="mobile" aria-label="Phone number" autocomplete="tel"');
  html = html.replace('id="password"', 'id="password" aria-label="Password" autocomplete="current-password"');
  const resources = `<link rel="preconnect" href="https://unpkg.com"><link rel="preconnect" href="https://cdn.jsdelivr.net"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${fontUrl.replaceAll('&', '&amp;')}" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="${fontUrl.replaceAll('&', '&amp;')}"></noscript>`;
  const overrides = fs.readFileSync(path.join(dist, 'showpay-login-accessibility.css'), 'utf8');
  html = html.replace('</head>', `${resources}<style data-login-accessibility>${overrides}</style></head>`);
  fs.writeFileSync(filename, html);
}
console.log('Public login: inline styles, nonblocking fonts/icons, zoom and contrast improvements.');
