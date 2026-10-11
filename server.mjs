import express from 'express';
import mysql from 'mysql2/promise';
import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
app.disable('x-powered-by');
const root = resolve(fileURLToPath(new URL('.', import.meta.url)), 'dist');
const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const configured = required.every(key => process.env[key]);
const pool = configured ? mysql.createPool({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, connectionLimit: 5,
  ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: true } } : {}),
}) : null;
const publicTables = new Set(['slider_images', 'banners', 'popup_video', 'telegram_popup']);
const tables = new Set([...publicTables, 'notifications', 'activity_logs']);
const fields = {
  slider_images: ['image_url', 'title', 'display_order', 'is_enabled'],
  banners: ['image_url', 'title', 'display_order', 'is_enabled'],
  popup_video: ['title', 'video_url', 'is_enabled'],
  telegram_popup: ['title', 'description', 'telegram_link', 'is_enabled'],
  notifications: ['title', 'message', 'type', 'is_read'],
  activity_logs: ['action', 'details'],
};
let databaseReady = false;
async function initialize() {
  if (!pool) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS showpay_content (
    collection VARCHAR(40) NOT NULL, id VARCHAR(36) NOT NULL,
    document JSON NOT NULL, PRIMARY KEY (collection, id))`);
  await pool.query(`CREATE TABLE IF NOT EXISTS showpay_admin_sessions (
    id VARCHAR(36) PRIMARY KEY, token_hash CHAR(64) NOT NULL UNIQUE,
    device_info VARCHAR(300) NOT NULL, created_at BIGINT NOT NULL,
    last_active BIGINT NOT NULL, expires_at BIGINT NOT NULL)`);
  for (const [collection, document] of Object.entries({
    popup_video: { title: 'ShowPay Video', video_url: '', is_enabled: false },
    telegram_popup: { title: 'ShowPay Updates', telegram_link: '', is_enabled: false },
  })) {
    await pool.execute('INSERT IGNORE INTO showpay_content (collection, id, document) VALUES (?, ?, ?)',
      [collection, 'default', JSON.stringify({ id: 'default', created_at: new Date().toISOString(), ...document })]);
  }
  databaseReady = true;
}
const hash = text => createHash('sha256').update(text).digest('hex');
const equal = (a, b) => timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
const cookie = req => /(?:^|;\s*)showpay_admin=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
async function session(req) {
  const token = cookie(req);
  if (!token || !databaseReady) return null;
  const [rows] = await pool.execute('SELECT id FROM showpay_admin_sessions WHERE token_hash = ? AND expires_at > ?', [hash(token), Date.now()]);
  return rows[0] || null;
}
const fail = (res, status, message) => res.status(status).json({ error: { message } });
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
  if (req.path.startsWith('/api/') || req.path.startsWith('/admin')) {
    res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive' });
  }
  next();
});
app.use('/api', (req, res, next) => {
  if (req.method !== 'GET' && req.headers.origin) {
    try {
      if (new URL(req.headers.origin).host !== req.headers.host) return fail(res, 403, 'Cross-origin request denied');
    } catch { return fail(res, 403, 'Invalid origin'); }
  }
  next();
});
app.use(express.json({ limit: '16mb' }));
app.get('/healthz', (_req, res) => res.status(databaseReady ? 200 : 503).json({ status: databaseReady ? 'ok' : 'database-unavailable', database: databaseReady }));
app.use('/api', (_req, res, next) => databaseReady ? next() : fail(res, 503, 'Hosted database is not connected'));

// Bound login attempts without trusting client supplied proxy IP headers.
let loginAttempts = [];
app.post('/api/admin/login', async (req, res) => {
  const timestamp = Date.now();
  loginAttempts = loginAttempts.filter(time => timestamp - time < 60_000);
  if (loginAttempts.length >= 20) return fail(res, 429, 'Too many login attempts; wait one minute');
  loginAttempts.push(timestamp);
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 16) return fail(res, 503, 'Administrator credentials must be configured in GoDaddy Secrets');
  if (typeof req.body.email !== 'string' || typeof req.body.password !== 'string' ||
      !equal(req.body.email, email) || !equal(req.body.password, password)) return fail(res, 401, 'Invalid credentials');
  const token = randomBytes(32).toString('hex');
  await pool.execute('DELETE FROM showpay_admin_sessions WHERE expires_at < ?', [timestamp]);
  await pool.execute('INSERT INTO showpay_admin_sessions VALUES (?, ?, ?, ?, ?, ?)',
    [randomUUID(), hash(token), String(req.headers['user-agent'] || 'Browser').slice(0, 300), timestamp, timestamp, timestamp + 8 * 3600_000]);
  res.cookie('showpay_admin', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 8 * 3600_000 });
  res.json({ ok: true });
});
app.get('/api/admin/session', async (req, res) => {
  const active = await session(req);
  if (!active) return fail(res, 401, 'Sign in required');
  await pool.execute('UPDATE showpay_admin_sessions SET last_active = ? WHERE id = ?', [Date.now(), active.id]);
  res.json({ id: active.id, admin_email: process.env.ADMIN_EMAIL, admin_name: 'ShowPay Admin' });
});
app.post('/api/admin/logout', async (req, res) => {
  if (cookie(req)) await pool.execute('DELETE FROM showpay_admin_sessions WHERE token_hash = ?', [hash(cookie(req))]);
  res.clearCookie('showpay_admin', { path: '/' });
  res.json({ ok: true });
});
app.get('/api/admin/sessions', async (req, res) => {
  if (!await session(req)) return fail(res, 401, 'Sign in required');
  const [rows] = await pool.execute('SELECT id, device_info, created_at, last_active FROM showpay_admin_sessions WHERE expires_at > ?', [Date.now()]);
  res.json(rows);
});
app.delete('/api/admin/sessions/:id', async (req, res) => {
  if (!await session(req)) return fail(res, 401, 'Sign in required');
  await pool.execute('DELETE FROM showpay_admin_sessions WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});
const matches = (row, filters = []) => filters.every(({ column, operator, value }) => {
  const actual = row[column];
  if (operator === 'eq') return String(actual) === String(value);
  if (operator === 'neq') return String(actual) !== String(value);
  if (operator === 'in') return Array.isArray(value) && value.map(String).includes(String(actual));
  if (operator === 'gt') return actual > value;
  if (operator === 'gte') return actual >= value;
  if (operator === 'lt') return actual < value;
  if (operator === 'lte') return actual <= value;
  return false;
});
const parseDocument = value => typeof value === 'string' ? JSON.parse(value) : value;
app.post('/api/content/query', async (req, res) => {
  const { table, operation = 'select', filters = [], sort, maxRows, payload, options = {} } = req.body;
  if (!tables.has(table) || !['select', 'insert', 'update', 'delete'].includes(operation) ||
      !Array.isArray(filters) || filters.length > 20 || (sort && typeof sort.column !== 'string')) return fail(res, 400, 'Invalid content query');
  const authenticated = await session(req);
  if (!authenticated && (operation !== 'select' || !publicTables.has(table))) return fail(res, 401, 'Sign in required');
  const [stored] = await pool.execute('SELECT document FROM showpay_content WHERE collection = ? LIMIT 1000', [table]);
  let rows = stored.map(item => parseDocument(item.document));
  if (!authenticated) rows = rows.filter(row => row.is_enabled === true);
  let selected = rows.filter(row => matches(row, filters));
  if (operation !== 'select') {
    const clean = value => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid content');
      const result = {};
      for (const key of fields[table]) {
        if (value[key] === undefined) continue;
        const item = value[key];
        if (typeof item === 'string') {
          if (item.length > 4000 || /[<>"']/.test(item)) throw new Error('Invalid content text');
          if (/(?:_url|_link)$/.test(key) && item && !item.startsWith('/api/assets/')) {
            const url = new URL(item);
            if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Only HTTPS content URLs are supported');
          }
        } else if (!['boolean', 'number'].includes(typeof item) || (typeof item === 'number' && !Number.isFinite(item))) throw new Error('Invalid content value');
        result[key] = item;
      }
      return result;
    };
    if (operation === 'insert') {
      const items = Array.isArray(payload) ? payload : [payload];
      if (items.length > 50) return fail(res, 400, 'Too many records');
      selected = items.map(item => ({ ...clean(item), id: randomUUID(), created_at: new Date().toISOString() }));
      for (const row of selected) await pool.execute('INSERT INTO showpay_content VALUES (?, ?, ?)', [table, row.id, JSON.stringify(row)]);
    } else {
      if (!filters.length) return fail(res, 400, 'A filter is required');
      const changes = operation === 'update' ? clean(payload) : null;
      for (const row of selected) {
        if (changes) {
          Object.assign(row, changes, { updated_at: new Date().toISOString() });
          await pool.execute('UPDATE showpay_content SET document = ? WHERE collection = ? AND id = ?', [JSON.stringify(row), table, row.id]);
        } else await pool.execute('DELETE FROM showpay_content WHERE collection = ? AND id = ?', [table, row.id]);
      }
    }
  }
  if (sort) selected.sort((a, b) => (a[sort.column] === b[sort.column] ? 0 : a[sort.column] > b[sort.column] ? 1 : -1) * (sort.ascending === false ? -1 : 1));
  const count = selected.length;
  if (Number.isFinite(maxRows)) selected = selected.slice(0, Math.max(0, Math.min(1000, maxRows)));
  res.json({ data: options.head ? null : selected, error: null, count: options.count === 'exact' ? count : null });
});
// Small media assets live in the hosted database and survive code deployments.
app.post('/api/assets/:bucket/:name', async (req, res) => {
  if (!await session(req)) return fail(res, 401, 'Sign in required');
  if (!['banners', 'slider_images', 'popup_video'].includes(req.params.bucket)) return fail(res, 400, 'Invalid bucket');
  const { data, type } = req.body;
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4'].includes(type) || typeof data !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) return fail(res, 400, 'Unsupported media');
  const bytes = Buffer.from(data, 'base64');
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) return fail(res, 413, 'Maximum upload size is 8 MB');
  const id = hash(req.params.bucket + '/' + req.params.name).slice(0, 36);
  await pool.execute('INSERT INTO showpay_content VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE document = VALUES(document)', ['assets', id, JSON.stringify({ type, data })]);
  res.json({ data: { path: req.params.name, publicUrl: '/api/assets/' + id }, error: null });
});
app.get('/api/assets/:id', async (req, res) => {
  const [rows] = await pool.execute('SELECT document FROM showpay_content WHERE collection = ? AND id = ?', ['assets', req.params.id]);
  if (!rows.length) return res.sendStatus(404);
  const asset = parseDocument(rows[0].document);
  res.set('Cache-Control', 'public, max-age=300').type(asset.type).send(Buffer.from(asset.data, 'base64'));
});
const routes = { '/': '/user-app/pages/login.html', '/login': '/user-app/pages/login.html', '/home': '/user-app/pages/home.html', '/complete': '/user-app/pages/complete.html', '/admin': '/admin-app/pages/login.html', '/homepages': '/homepages.html', '/showpay/homepages': '/showpay/homepages/index.html' };
for (const page of ['about-showpay', 'showpay-apk', 'showpay-usdt', 'showpay-guide', 'showpay-password-help', 'showpay-support', 'how-to-use-showpay', 'how-to-deposit-showpay']) routes['/' + page] = '/' + page + '.html';
app.use((req, _res, next) => {
  if (routes[req.path]) req.url = routes[req.path];
  next();
});
app.use(express.static(root, { dotfiles: 'deny', maxAge: '5m', setHeaders(res, path) { if (path.endsWith('.html')) res.set('Cache-Control', 'no-cache'); } }));
app.use((_req, res) => res.status(404).type('text').send('Page not found'));
app.use((error, _req, res, _next) => {
  console.error('Request failed:', error.code || error.name);
  fail(res, error.status || 500, error.status === 413 ? 'Request too large' : 'Request failed');
});
await initialize().catch(error => console.error('Database initialization failed:', error.code || error.name));
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, '0.0.0.0', () => console.log(`ShowPay listening on ${port}; database ready: ${databaseReady}`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(async () => { if (pool) await pool.end(); process.exit(0); }));
