# ShowPay 3.0 - Current Project State & Memory

This file serves as memory for AI agents. When a new conversation starts, read this to understand the current state.

## Recent Updates (September 17, 2026)
1. **New SEO Page `/homepages`:** Created `public/homepages.html` — a self-contained, production-ready page (CSS + JS inlined, no external deps) adapted from the ChatGPT showpay-seo-preview project. All modifications applied: robots=index/follow, canonical, og:url, og:image, twitter:card, keywords meta, updated title, login banner replacing preview-note, header CTA → ShowPay Login link, hero login button → showpayy.com, login CTA button on login screenshot card, new login-cta-section before guides, end-panel → ShowPay Login CTA, footer updated.
2. **Cloudflare routing:** `/homepages` is served by the public SEO routing layer generated during the build.
3. **sitemap.xml:** Added `https://showpayy.com/homepages` with priority 0.9.
4. **Build note:** The former local native-module issue has been resolved in the current environment. Use the complete production build for deployment.

## Recent Updates (July 16, 2026)
1. **SEO Optimization:** Updated meta tags and Open Graph data in `index.html` and other pages with exact casing for keywords ("Showpay", "Showpay login", "Showpay app", "Showpay apk"). GoDaddy `app-atgpay.in` domain was instructed to be unlinked to prioritize `showpayy.com`.
2. **Admin Panel Mobile Responsiveness:**
   - The admin login page (`admin-app/pages/login.html`) was updated via `admin-app/css/responsive.css` to fit mobile screens perfectly without touching the edges.
   - Fixed an issue where the sidebar hamburger menu was not working on mobile because the build dropped `sidebar.js`. Fixed by adding `type="module"` to all `sidebar.js` script tags in admin HTML pages.
3. **Admin Session Tracking (Multi-Device Logout):**
   - Added logic in `login.js` and `auth.js` to track `admin_sessions` in Supabase.
   - When an admin changes their password in `profile.js`, all other active sessions are logged out (tokens deleted), except for their current device.
   - Note for DB: The SQL query for the `admin_sessions` table has been provided to the user. `auth.js` gracefully handles missing table errors without causing infinite logout loops.
4. **Users Page Bulk Actions:**
   - Added "Select All" functionality in `users.html` and `users.js`.
   - Added bulk PDF download using `jspdf` and `jspdf-autotable`.
   - Added bulk delete for users (moves them to `trash` table in Supabase).
5. **Deployment:** Cloudflare Pages project `showpay3-0`, GitHub production branch `main`, build command `npm run build`, output directory `dist`.

## Important Notes for Future Agents
- **Environment:** Windows, PowerShell.
- **Tools:** Use `vite build` (no `vite.config.js` needed by default, but there is a `vite.config.ts` mapping HTML files).
- **Supabase:** The project uses Supabase for database operations. Ensure RLS policies or correct tokens are used.
- **Cloudflare:** Existing app rewrites remain in `public/_redirects`. Public SEO routes are generated into `dist/_worker.js` and restricted by `dist/_routes.json`; admin login remains `/admin`.
- **Scripts:** Always use `type="module"` for JS scripts in HTML if they need to be bundled by Vite in production.

## SEO indexing additions (October 11, 2026)
- Preserve all existing account/admin logic. Existing login HTML receives additions only.
- Keep indexed `/showpay-guide.html` and `/homepages`; public guide aliases use one permanent redirect.
- New public help guides do not implement password resets, collect credentials or advertise unverified contacts.
- Build-generated sitemap contains canonical public pages only. The date reflects this content release rather than build filesystem timestamps.
- Rollback target before this release: Pages deployment `559486ab-45e7-40ff-af4b-91af8980f85c`, source commit `1958bc9870149d331f5813552fad1f1ea91c4754`.
- Public-login build optimization in `scripts/optimize-public-login.cjs` inlines existing styles, loads fonts without blocking paint and defers icon initialization until DOMContentLoaded. It enables zoom and adds accessible field names and scoped contrast fixes. Existing account JavaScript and admin documents are unchanged. New PageSpeed scores require a deployed audit; no 100-point result has been verified.
- Owner-supplied recovery URL: https://app-web.showpayweb.com/forgetPassword (automated HTTP check returned 403; account recovery itself is unverified). Public guide/deposit pages link to YouTube video Rl8mR5YT2E4 and Instagram post DYfki7GTcSa. These are external links, with no iframe or social-profile schema claims.
