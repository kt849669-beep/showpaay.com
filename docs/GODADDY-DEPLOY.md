# ShowPay on GoDaddy

Use Node.js 22 or later. Install with `npm ci`, build with `npm run build`, and run with `npm start`. Configure the hosting start command explicitly as `npm start`; `npm run dev` remains the local Vite development workflow. The server listens on GoDaddy's assigned `PORT` on all interfaces. `/healthz` reports server readiness and whether optional Orbit access is configured.

The Node entry point serves only the built `dist` directory. Existing page rewrites, public guide aliases, sitemap, login, dashboard and admin routes use the same generated routing logic. Source files and deployment control files are not served. User and administrator application data continue to use the existing Supabase integration.

Connect the custom domain `showpayy.com` to this application in GoDaddy and enable its HTTPS certificate. Preview addresses send `noindex` headers. Keep the existing domain mail and verification records when changing web DNS records.

Optional Orbit owner access uses the existing `ORBIT_API_KEY` in hosting Secrets and GoDaddy's injected `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. Use `DB_SSL=true` if the provided database requires verified TLS. The server creates only the `orbit_tickets` and `orbit_sessions` tables; it does not modify Supabase. Ticket redemption uses an InnoDB transaction and row lock so each ticket can be used once. Without the Orbit key, those endpoints remain disabled; ordinary account and administrator login remain available through the existing integration.

Run `npm run test:hosting` and the existing routing, Orbit authentication and SEO monitor tests after building. Before publishing, verify production HTTPS, `/admin`, `/home`, public guides, and the hosted Orbit database if that optional feature is enabled.
