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

export default () => {
  const localRoutes = {
    '/': '/user-app/pages/login.html',
    '/login': '/user-app/pages/login.html',
    '/home': '/user-app/pages/home.html',
    '/complete': '/user-app/pages/complete.html',
    '/admin': '/admin-app/pages/login.html',
    '/showpay-apk': '/showpay-apk.html',
    '/showpay-usdt': '/showpay-usdt.html',
    '/homepages': '/homepages.html',
    '/showpay/homepages': '/showpay/homepages/index.html',
  };

  const routePlugin = {
    name: 'showpay-local-routes',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url || '/', 'http://localhost').pathname;
        if (!localRoutes[pathname]) return next();
        req.url = localRoutes[pathname];
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url || '/', 'http://localhost').pathname;
        if (!localRoutes[pathname]) return next();
        req.url = localRoutes[pathname];
        next();
      });
    },
  };

  return {
    plugins: [routePlugin],
    server: {
      port: 3000,
      host: '0.0.0.0'
    },
    preview: {
      host: '0.0.0.0',
      port: 3000
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
};
