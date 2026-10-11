import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

// Helper to find all HTML files dynamically
function getHtmlFiles(dir, fileList = {}) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = resolve(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      // `public` is Vite's publicDir: everything inside it is copied to the
      // output root as-is. Adding those files as rollup inputs as well emits a
      // second copy under dist/public/, which would publish every SEO page on
      // two crawlable URLs (/showpay-guide.html and /public/showpay-guide.html).
      if (
        file !== 'node_modules' &&
        file !== 'dist' &&
        file !== '.git' &&
        file !== 'public'
      ) {
        getHtmlFiles(fullPath, fileList);
      }
    } else if (file.endsWith('.html')) {
      // Use relative path as the key name
      let name = fullPath.replace(__dirname, '').replace(/\\/g, '/').substring(1).replace('.html', '');
      // E.g. user-app/pages/login
      fileList[name] = fullPath;
    }
  }
  return fileList;
}

export default defineConfig(() => {
  return {
    // Top-level plugins array required by Cloudflare Wrangler / @cloudflare/vite-plugin
    plugins: [],
    server: {
      port: 3000,
      host: '0.0.0.0'
    },
    // This is a standalone plain-CSS project. Do not inherit a PostCSS config
    // from a parent workspace when the repository is checked out inside one.
    css: {
      postcss: {
        plugins: []
      }
    },
    build: {
      rollupOptions: {
        input: getHtmlFiles(__dirname)
      }
    }
  };
});
