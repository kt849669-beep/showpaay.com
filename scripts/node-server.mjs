import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { connectOrbitDatabase } from './orbit-mysql.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp4': 'video/mp4', '.pdf': 'application/pdf', '.apk': 'application/vnd.android.package-archive' };
const privateFiles = new Set(['_worker.js', '_routes.json', '_redirects', '_headers']);

export async function createHostingServer({ distPath = path.join(root, 'dist'), orbitEnv = {} } = {}) {
  const dist = await fs.realpath(distPath);
  const worker = (await import(pathToFileURL(path.join(dist, '_worker.js')).href)).default;
  const redirects = new Map();
  for (const line of (await fs.readFile(path.join(dist, '_redirects'), 'utf8')).split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const [from, to, status] = line.trim().split(/\s+/);
    if (from !== '/*') redirects.set(from, { to, status: Number(status) });
  }
  async function assetResponse(request) {
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    const url = new URL(request.url);
    const rewrite = redirects.get(url.pathname);
    if (rewrite?.status === 301) return new Response(null, { status: 301, headers: { Location: rewrite.to + url.search } });
    let pathname;
    try { pathname = decodeURIComponent(rewrite?.status === 200 ? rewrite.to : url.pathname); }
    catch { return new Response('Bad Request', { status: 400 }); }
    if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part => part.startsWith('.') || privateFiles.has(part))) return new Response('Not Found', { status: 404 });
    const target = path.resolve(dist, '.' + pathname);
    if (target !== dist && !target.startsWith(dist + path.sep)) return new Response('Not Found', { status: 404 });
    const candidates = [target];
    if (!path.extname(target)) candidates.push(target + '.html', path.join(target, 'index.html'));
    let file, status = 200;
    for (const candidate of candidates) {
      try {
        const real = await fs.realpath(candidate);
        if (!real.startsWith(dist + path.sep) || !types[path.extname(real).toLowerCase()]) continue;
        if ((await fs.stat(real)).isFile()) { file = real; break; }
      } catch (error) { if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error; }
    }
    if (!file) { file = path.join(dist, '404.html'); status = 404; }
    const data = await fs.readFile(file);
    const headers = { 'Content-Type': types[path.extname(file).toLowerCase()], 'Content-Length': String(data.length), 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Cache-Control': 'no-cache' };
    if (!['showpayy.com', 'www.showpayy.com'].includes(url.hostname)) headers['X-Robots-Tag'] = 'noindex, nofollow';
    return new Response(request.method === 'HEAD' ? null : data, { status, headers });
  }
  const env = { ...orbitEnv, ASSETS: { fetch: assetResponse } };
  return http.createServer(async (incoming, outgoing) => {
    try {
      const scheme = incoming.headers['x-forwarded-proto']?.split(',')[0].trim() === 'https' || incoming.socket.encrypted ? 'https' : 'http';
      const requestUrl = `${scheme}://${incoming.headers.host || 'localhost'}${incoming.url}`;
      let response;
      if (new URL(requestUrl).pathname === '/healthz' && ['GET', 'HEAD'].includes(incoming.method)) {
        response = new Response(incoming.method === 'HEAD' ? null : JSON.stringify({ ok: true, orbitConfigured: Boolean(orbitEnv.ORBIT_AUTH) }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
      } else {
        let body;
        if (!['GET', 'HEAD'].includes(incoming.method)) {
          const chunks = []; let length = 0;
          for await (const chunk of incoming.iterator({ destroyOnReturn: false })) {
            length += chunk.length;
            if (length > 2048) { incoming.resume(); const error = new Error('Request too large'); error.status = 413; throw error; }
            chunks.push(chunk);
          }
          body = Buffer.concat(chunks);
        }
        const headers = new Headers();
        for (let i = 0; i < incoming.rawHeaders.length; i += 2) headers.append(incoming.rawHeaders[i], incoming.rawHeaders[i + 1]);
        const request = new Request(requestUrl, { method: incoming.method, headers, ...(body ? { body } : {}) });
        response = await worker.fetch(request, env);
      }
      outgoing.statusCode = response.status;
      for (const [name, value] of response.headers) if (name !== 'set-cookie') outgoing.setHeader(name, value);
      const cookies = response.headers.getSetCookie();
      if (cookies.length) outgoing.setHeader('Set-Cookie', cookies);
      outgoing.end(incoming.method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      if (outgoing.headersSent) { outgoing.destroy(); return; }
      outgoing.writeHead(error.status === 413 ? 413 : 500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      outgoing.end(error.status === 413 ? 'Request too large' : 'Service unavailable');
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const database = await connectOrbitDatabase();
  const server = await createHostingServer({ orbitEnv: database.env });
  server.listen(port, '0.0.0.0', () => console.log(`ShowPay server listening on port ${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(async () => { await database.close(); process.exit(0); }));
}
