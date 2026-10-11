# ShowPay Orbit admin login

This API uses Cloudflare D1 and an independent HttpOnly ShowPay session. It does not use Supabase or change dashboard workflows. Normal ShowPay email/password login is preserved. Only the admin login guard and Cloudflare routing/build hooks are extended.

## Configure production

1. Create a Cloudflare D1 database and run `database/orbit_auth.sql` against it.
2. Bind that database as `ORBIT_AUTH` in the production `showpay3-0` Pages project.
3. Add the generated connection key as the encrypted production secret `ORBIT_API_KEY`. Do not expose it to Vite or commit it. Keep preview bindings/secrets separate: the handler also rejects preview hostnames.
4. Build and publish the source normally. Existing SEO routing is retained; `/api/admin/orbit/*` is added to the advanced worker routes.

## Connect Orbit (server side only)

Store the key in Orbit's private server configuration, alongside its existing OlaPay connection key. Orbit must verify its owner session and CSRF token **before** calling the launch API. Keep a random identifier for each Orbit session. Do not use the owner's email or another public identifier.

```http
POST https://showpayy.com/api/admin/orbit/launch
Authorization: Bearer <ORBIT_API_KEY>
Content-Type: application/json

{"orbit_session_id":"<private random session ID>","orbit_expires_at":<Orbit expiry as Unix seconds>}
```

The expiry must be in the future and at most eight hours away. The returned `login_url` contains a one-use 60-second ticket, never the permanent key. Open it to establish ShowPay's session and enter the existing dashboard. Tickets and cookies are stored only as hashes in D1. The browser cookie is Secure and HttpOnly. A fresh browser has no Orbit session and still needs normal ShowPay credentials.

Orbit must call `POST /api/admin/orbit/revoke` with the same server Authorization header and `{"orbit_session_id":"..."}` whenever its session ends, including logout/password revocation. This invalidates pending links and active ShowPay sessions. Their maximum expiry also follows the original Orbit session. Rotating the production key immediately invalidates both tickets and sessions tied to the old key.

Browser launch calls are rejected. CORS/Origin checks are defense in depth, not application identity: any server holding the private key has its authority. Exclusive Orbit use therefore requires keeping this credential only in Orbit's authenticated backend. Never paste it into a browser iframe URL or JavaScript configuration.

The callback/session endpoints use ShowPay's own origin. Cross-site iframe cookies can be blocked by browser settings; if so, use a top-level ShowPay tab or an authenticated Orbit bridge. An iframe alone is not an authentication integration. Wire and verify Orbit's launch/revoke lifecycle before claiming end-to-end Orbit login is active.

The original ShowPay authentication/database permission model remains outside this API change. This API authenticates its own sessions, not Supabase data permissions. Ordinary logout continues through the original login flow; Orbit-created sessions use the independent Cloudflare logout endpoint with CSRF protection.

Tests: `node --test tests/orbit-admin-api.test.mjs`.

Cloudflare advanced-mode deployment reference: https://developers.cloudflare.com/pages/functions/advanced-mode/
