# ShowPay on GoDaddy

This repository is a UI demonstration. The mobile login and test PIN flow do not authenticate real accounts, collect credentials, process payments or manage funds. User reports remain empty by design.

## Deploy

Use Node.js 22 or later, install with `npm ci`, build with `npm run build`, and start with `npm start`. Both `start` and the platform's fallback `dev` command run the production server. It binds to `process.env.PORT` on all interfaces and serves only the built `dist` directory.

GoDaddy injects `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` for the attached hosted MySQL database. Do not put these in source code. On startup the server creates `showpay_content` and `showpay_admin_sessions` if they do not exist. Preview and Published share this database. `/healthz` reports database readiness; it returns 503 if configuration or initialization fails.

Set `NODE_ENV=production`, `SITE_URL=https://showpayy.com`, `ADMIN_EMAIL`, and a unique `ADMIN_PASSWORD` of at least 16 characters in GoDaddy Secrets. Administrator access is disabled until credentials are configured. Never use the legacy browser demo password. Sessions use HttpOnly, SameSite cookies and database-stored token hashes, with an eight-hour expiry. Configure administrator credentials yourself in Secrets; they are never returned to the frontend. Existing admin sessions expire after eight hours; revoke sessions before changing access.

Content settings for banners, slides, video and Telegram are stored in MySQL; anonymous callers can only read enabled public content. Administrator writes require a server-validated session. Media uploads accept JPEG, PNG, WebP, GIF or MP4 up to 8 MB and are persisted in the database. Use externally hosted HTTPS URLs for larger videos. Public user credentials and PINs are never stored.

`npm test` verifies production routes, assigned-port startup, missing-database behavior, cross-origin write protection, source-file privacy and removal of the legacy frontend administrator password. After deployment, additionally verify the hosted database, administrator session and a content write/read cycle.
