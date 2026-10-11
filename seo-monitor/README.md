# ShowPay hourly SEO monitor

This is a read-only cloud monitor for `https://showpayy.com/`. GitHub Actions runs it at minute 17 of every hour, so a local computer or the Codex desktop app does not need to stay online.

## Checks

- uptime, HTTP status, redirects and real 404 handling
- `sitemap.xml`, `robots.txt`, canonical, noindex, titles, descriptions, viewport, H1 and JSON-LD validity
- all sitemap URLs and same-origin internal links
- Search Console clicks, impressions, CTR and average position for equal seven-day periods
- India and Mobile segments
- case-insensitive exact seed queries: ShowPay, ShowPay login, Show pay, Show pay login, ShowPay app and ShowPay apk
- Search Console sitemap errors and URL Inspection indexing/crawl/canonical/mobile results
- alert thresholds for 30% traffic drops, two-position regressions, indexing failures, sitemap failures, blocked crawling, 4xx/5xx and downtime

Every run creates a GitHub Actions summary and a 30-day JSON/Markdown artifact. A deduplicated GitHub issue is created or updated while alerts are active and closed after recovery.

## Required Google configuration

Public technical checks run without credentials. The preferred Search Console connection is keyless Google Workload Identity Federation. Configure these repository Actions variables:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GSC_SERVICE_ACCOUNT_EMAIL`

The identity provider is restricted to `kt849669-beep/showpay3.0`, and the service-account email is added only as a restricted user of the exact Search Console property `https://showpayy.com/`. The workflow requests a short-lived token with the read-only `https://www.googleapis.com/auth/webmasters.readonly` scope.

`GSC_SERVICE_ACCOUNT_JSON` remains an optional compatibility fallback, but the production setup should use the keyless connection so no long-lived Google private key is stored in GitHub.

## Local verification

```sh
node --test seo-monitor/tests/monitor.test.mjs
node seo-monitor/run.mjs
```

Without the Google secret, the second command still completes all public technical checks and reports Search Console as not connected.
