# ShowPay 3.0 — Expert Brief / Poora Analysis

> Is folder ko har angle se pada gaya hai: frontend, admin panel, database, deployment aur security. Neeche saara nichod hai — pehle short summary (Hinglish), phir detail (English).

---

## 0. Ek line mein (TL;DR)

**Yeh ek "payment app" jaisa dikhta hai, lekin actually mein ek credential-harvesting funnel hai.** Isme koi asli wallet, balance, ya paisa lena-dena ka logic nahi hai. Kaam sirf itna hai: user ka **mobile number, password aur MPIN** collect karo → ek promo video / Telegram link dikhao → logout kar do. Poora database internet par **anon key** se khula pada hai (koi bhi read/write/delete kar sakta hai), passwords **plaintext** mein store hote hain, aur admin login **client-side** hai jise bypass karna trivial hai.

Agar yeh aapka apna project hai aur aap ise samajhna/thik karna chahte hain — theek. Neeche exact locations aur fixes diye hain.

---

## 1. Yeh project hai kya (Architecture)

| Layer | Tech | Reality |
|---|---|---|
| User app | Vanilla JS + HTML (`user-app/`) | **LIVE** — Vite static build on Cloudflare Pages |
| Admin panel | Vanilla JS + HTML (`admin-app/`) | **LIVE** |
| SEO pages | Generated HTML (`public/`, `seo-generator.cjs`) | **LIVE** |
| Database | Supabase Postgres, browser se seedha access | **LIVE** |
| React app (`src/`) | React + TypeScript | **DEAD** — deploy hi nahi hota (react package.json mein hai hi nahi) |
| Express server (`server.ts`) | Node/Express, in-memory DB | **DEAD** — express installed nahi, current app uses static assets |
| Gemini AI | `metadata.json` mein declared | **EXISTS NAHI** — koi code nahi, sirf leftover scaffolding |

**Deploy:** Cloudflare Pages (`npm run build`, output `dist`), connected to GitHub `main`. Existing app rewrites keep `/` → login, `/home` → dashboard, `/admin` → admin login; a scoped Cloudflare worker serves public SEO guides.

**Source structure:** The application source is maintained at the repository root. Keep one source tree so each change and production build uses the same maintained files.

---

## 2. User flow — actually hota kya hai

1. **Login** (`user-app/js/auth/login.js`): mobile + password daalo.
   - Password ka koi asli check nahi. Agar mobile+password match nahi hua → **naya account auto-create** ho jaata hai (`status: pending`). Yani "login" darasal "signup" hai.
   - Password DB mein **plaintext** save hota hai (`login.js:97`).
2. **MPIN** (`user-app/js/home.js`): `/home` par 2 second baad ek mandatory 6-digit MPIN popup. MPIN bhi plaintext save hota hai, `status: completed` ho jaata hai.
3. **Funnel:** MPIN success → promo video popup → Telegram join popup → **auto logout**. Bas. Dashboard par balance/received/bonus sab hardcoded `0.00` hai — koi real feature nahi (`home.html:98-116`).
4. **Lock-out by design:** jo user ek baar `completed` ho gaya, woh dobara login nahi kar sakta — "Update Request Already Received" popup dikhta hai jo `showpay-web.com` par bhej deta hai (`login.js:47-81`).

**Phishing-shaped detail:** login page ke "Forget Password" aur "Register" links ek **alag domain** par jaate hain — `https://app-web.showpay-web.com/...` (`login.html:179, 200`), jabki app khud `showpayy.com` par hai. Cross-domain credential handoff.

---

## 3. Admin panel — kya-kya hai

13 pages (dashboard, users, trash, slider, video-popup, telegram, settings, reports, activity, banner, notifications, profile). Driver JS `admin-app/js/*.js` mein.

**Important sach:** aadha folder **khaali (0 byte) files** hai — dikhta bahut complete hai par:
- Shared `admin-app/components/*.html` files (sidebar, header, modals) are currently empty. Sidebar and topbar markup are maintained within the individual pages.
- Saari `admin-app/css/*.css` (login, dashboard, users…) — **empty**. Sirf `admin.css` aur `responsive.css` mein content hai — aur `responsive.css` kisi page mein linked hi nahi (dead).
- `js/pdf.js`, `upload.js`, `gmail.js`, `realtime.js`, `user-details.js` — **empty** (logic doosri files mein inline hai).
- Saare `docs/*.md` (DATABASE, DEPLOYMENT, SUPABASE…) — **empty**. Project documented dikhta hai, hai nahi.

**Admin auth:**
- Login `admin_settings` table ke against email+password check karta hai (plaintext, URL query mein bheja jaata hai → logs mein aa jaata hai).
- **Permanent backdoor:** DB match na mile to hardcoded `admin@showpay.com` / `admin@0123` chal jaata hai (`login.js:42`). Password change karo tab bhi yeh chalta rahega.
- **Guard fail-open hai** (`auth.js:15-17`): koi bhi error aaye to logout nahi karta — comment likha hai "to avoid infinite login loops". Matlab ek localStorage key set karke poora panel khul jaata hai.

**Features jo aadhe/tootey hain:**
- `banners` table + poora CMS page — user app mein koi ise **padta hi nahi** (orphan).
- `notifications` page — koi ise **likhta hi nahi** (producer nahi).
- Bulk delete mein bug: `users.js:275` mein `allUsers` undefined hai → successful delete bhi "Error" dikhata hai.
- Single delete "confirm" tootа hai (`users.js:179`): button text `"Delete User"` hai par code `"Delete"` check karta hai → **bina confirm ke delete**.
- Realtime + 10-second `setInterval` dono ek saath chalte hain → har 10 sec par checkbox selection wipe ho jaata hai, bulk actions toot-te hain.

---

## 4. Database — schema aur (na)suraksha

10 tables: `users`, `trash`, `slider_images`, `popup_video`, `telegram_popup`, `activity_logs`, `banners`, `notifications`, `admin_settings`, `admin_sessions`.

- **Koi foreign key nahi, koi index nahi** (sirf PK + `users.mobile` unique). `admin_sessions.token` par index nahi — har admin page load par full table scan.
- `users` mein password `TEXT` (plaintext), mpin `VARCHAR(6)` (plaintext).
- `admin_settings.admin_password` ka DB **default hi `'admin@0123'`** hai — plaintext, committed.
- 3 storage buckets (`slider_images`, `popup_video`, `banners`) — sab public, anon upload **aur** delete allowed, koi file-type/size validation nahi.

### RLS — yeh sabse bada issue hai

`database/policies.sql` mein har table par har operation `TO anon USING (true)` hai. File khud comment karti hai: *"we need to allow anon role full access to all tables."*

Anon key `user-app/js/config/supabase.js:5` mein hardcoded hai (har browser ko milta hai). Iska matlab **koi bhi banda, bina login**, sirf ek `curl` se:

- `GET /rest/v1/users?select=*` → **sabke mobile + plaintext password + MPIN** nikaal le.
- `GET /rest/v1/admin_settings` → admin ka email + plaintext password padh le → `/admin` mein ghus jaaye.
- `DELETE`/`PATCH` bina filter → **poora users table wipe / tamper** kar de.
- `admin_sessions` par to RLS **enable hi nahi** (`sessions_schema.sql` mein `ENABLE ROW LEVEL SECURITY` nahi) → koi bhi UUID insert karke **admin session forge** kar le.

Yeh incidental bug nahi hai — **design hi aisa hai.**

---

## 5. Security findings (priority order)

### 🔴 CRITICAL
1. **Anon key = full DB master key.** Saari RLS `USING(true)`. Poora data world-readable + world-writable. (`policies.sql:22-87`, `supabase.js:5`)
2. **Passwords + MPINs plaintext** store, transmit, screen/PDF/Gmail par export. (`schema.sql:11-12`, `users.js:136-171`)
3. **Hardcoded admin backdoor** `admin@showpay.com`/`admin@0123` jise rotate nahi kiya ja sakta. (`login.js:42`, `schema.sql:99`)
4. **Admin auth 100% client-side, fail-open** — trivially bypassable. (`auth.js:15-29`)
5. **`admin_sessions` bina RLS** → session forge. (`sessions_schema.sql`)
6. **Public buckets, anon upload+delete, zero validation** → malware/phishing hosting apne domain par. (`buckets.sql:17-27`)

### 🟠 HIGH
7. **Stored XSS:** DB values seedhe `innerHTML` mein (`users.js`, `trash.js`, `login.js:68` — `telegram_link` `href` mein bhi). Anon in tables mein likh sakta hai → admin browser mein script chal jaayegi.
8. **Credential exfiltration built-in:** Gmail compose URL mein plaintext password+MPIN. (`users.js:136-146`)
9. **Supply chain:** supabase-js, jspdf, lucide sab CDN se, **koi SRI nahi**, CSP mein `'unsafe-inline'`. CDN compromise = injected JS.
10. **`users` realtime publication mein** → anon subscribers live plaintext passwords stream kar sakte hain. (`triggers.sql:7`)

### 🟡 MEDIUM
- Koi rate-limiting/brute-force protection nahi. Password min 4 char.
- Trash restore lossy hai — insert error ignore karke trash row delete kar deta hai → data loss (`trash.js:37-38`).
- Verify any future Cloudflare CSP against the external PDF script loaded by `users.html:9` before enforcing it; account/admin script permissions must remain compatible.
- `server.ts` unauthenticated `/api/admin/*` — agar kabhi deploy hua to aur ek hole.

### ⚪ LOW / cleanup
- Poora repo `showpay-app-login.com/` mein duplicate.
- `test-*.cjs` scripts anon key embed karke **live DB mein junk likhte** hain.
- `refactor.js` aur `build-structure.js` — chalane par mahino ka admin UI kaam **revert/erase** kar denge (stale templates, empty stubs). Foot-guns, delete karein.
- Applied `.patch` files (`showpay-logout-fix.patch`, `showpay-seo-fixes.patch`) repo mein pade hain — remove karein.
- Committed `dist/` purana/galat hai.

---

## 6. SEO layer (yeh part achha hai)

- `seo-generator.cjs` 9 help pages generate karta hai (title, description, JSON-LD, canonical). `generate-sitemap.cjs` sitemap banata hai.
- Ek recovery ho chuki hai (patch `showpay-seo-fixes`): pehle 404 page sab kuch `/` par redirect karta tha (Google ise "sneaky redirect"/soft-404 maanta tha) — fix ho gaya. `portal.html` aur `home.html` ab `noindex`.
- **`seo-monitor/`**: ek accha, dependency-free monitoring system — hourly GitHub Action jo site health + Google Search Console metrics check karta hai, aur regression par GitHub issue kholta/band karta hai. WIF (keyless) auth use karta hai.
- **Gap:** `npm run test:seo` kahin enforce nahi hota (build/CI mein wired nahi), to yeh guard chupke se dobara sad sakta hai. Aur `generate-sitemap.cjs` `lastmod` ko file mtime se leta hai → har CI build par jhoothe "changed" dates.

---

## 7. Sabse pehle kya karein (agar fix karna hai)

1. **RLS rewrite** — `anon` se `users`, `admin_settings`, `admin_sessions`, `trash` ka access hatao. Privileged kaam Supabase Auth ya server-side function (service_role) ke peeche daalo. → C1, C4, C5 khatam.
2. **Passwords/MPINs hash karo** server-side (bcrypt/argon2). Gmail/PDF credential export hatao.
3. **Hardcoded admin creds hatao + rotate karo.** Admin auth server-side karo.
4. **Buckets lock karo** — auth-only writes, MIME/size validation.
5. **Libraries npm se bundle + pin karo (SRI), CSP se `'unsafe-inline'` hatao.**
6. Review any duplicate `showpay-app-login.com/` checkout separately and protect local environment credentials. Do not publish local credential files in build output.

---

## 8. Verify kiye gaye claims

Yeh points maine seedhe files padh ke confirm kiye (guess nahi):
- RLS har table par `USING(true)` — `policies.sql:22-87` ✓
- Plaintext password login/insert — `login.js:36-40, 97` ✓
- Cross-domain `showpay-web.com` links — `login.html:179, 200`; `login.js:61` ✓
- Funnel → auto-logout — `home.js:234-299` ✓
- Logout fix applied (`window.location.href = "/"`) — `home.js:298` ✓
- Anon key hardcoded — `supabase.js` ✓

**Uncertain (repo se confirm nahi ho sakta):** live Supabase par actual RLS state files se match karta hai ya nahi; `.env.local` tokens kabhi git mein commit hue ya nahi (shell/git available nahi tha). Inhe Supabase dashboard aur git history mein verify karein.

---

## 9. Ek imaandaar note

Is app ka pattern — plaintext credentials, phishing-shaped cross-domain links, "one-time login then push to Telegram", real wallet ka na hona — legit fintech se match nahi karta. Agar aap ise defensive/learning ya apne owned system ko sudharne ke liye samajh rahe hain, upar sab kuch actionable hai. Agar iska maqsad doosron ke credentials collect karna hai, main uske liye help nahi kar sakta. Bataiye aap kis direction mein le jaana chahte hain — main us hisaab se next step de dunga.
