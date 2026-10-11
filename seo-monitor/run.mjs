import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_SITE_URL,
  auditPublicSite,
  auditSearchConsole,
  buildAlerts,
  fingerprintAlerts,
} from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(here, 'output');
fs.mkdirSync(outputDir, { recursive: true });

const siteUrl = process.env.SEO_SITE_URL || DEFAULT_SITE_URL;
const generatedAt = new Date().toISOString();

function fmt(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'n/a';
  return Number(value).toFixed(digits);
}

function percent(value) {
  return value === null || value === undefined ? 'new' : `${value >= 0 ? '+' : ''}${fmt(value)}%`;
}

function performanceRow(name, data) {
  return `| ${name} | ${data.current.clicks} | ${percent(data.change.clicksPercent)} | ${data.current.impressions} | ${percent(data.change.impressionsPercent)} | ${(data.current.ctr * 100).toFixed(1)}% | ${fmt(data.current.position)} | ${data.change.position >= 0 ? '+' : ''}${fmt(data.change.position)} |`;
}

const publicAudit = await auditPublicSite(siteUrl);
let searchConsole;
try {
  searchConsole = await auditSearchConsole({
    accessToken: process.env.GSC_ACCESS_TOKEN,
    serviceAccountJson: process.env.GSC_SERVICE_ACCOUNT_JSON,
    siteUrl,
    sitemapUrls: publicAudit.sitemapUrls,
  });
} catch (error) {
  searchConsole = { connected: false, error: error.message };
}

const alerts = buildAlerts(publicAudit, searchConsole);
const fingerprint = fingerprintAlerts(alerts);
const report = {
  version: 1,
  generatedAt,
  siteUrl,
  status: alerts.some((alert) => alert.severity === 'critical') ? 'critical' : alerts.length ? 'warning' : 'healthy',
  alertFingerprint: fingerprint,
  alerts,
  publicAudit,
  searchConsole,
};

const lines = [
  `# ShowPay hourly SEO report`,
  '',
  `- Generated: ${generatedAt}`,
  `- Status: **${report.status.toUpperCase()}**`,
  `- Live sitemap URLs: **${publicAudit.sitemapUrls.length}**`,
  `- Broken internal links: **${publicAudit.brokenLinks.length}**`,
  `- Search Console: **${searchConsole.connected ? 'connected' : 'not connected'}**`,
  '',
];

if (searchConsole.connected) {
  lines.push(
    `Data periods: ${searchConsole.periods.current.start} to ${searchConsole.periods.current.end} vs ${searchConsole.periods.previous.start} to ${searchConsole.periods.previous.end}.`,
    '',
    '| Segment | Clicks | Δ clicks | Impressions | Δ impressions | CTR | Position | Δ position |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
    performanceRow('Overall', searchConsole.performance.overall),
    performanceRow('India', searchConsole.performance.india),
    performanceRow('Mobile', searchConsole.performance.mobile),
    '',
    '## Seed keywords (India + Mobile)',
    '',
    '| Query | Clicks | Impressions | CTR | Position | Δ position |',
    '|---|---:|---:|---:|---:|---:|',
  );
  for (const [query, data] of Object.entries(searchConsole.performance.keywords)) {
    lines.push(`| ${query} | ${data.current.clicks} | ${data.current.impressions} | ${(data.current.ctr * 100).toFixed(1)}% | ${fmt(data.current.position)} | ${data.change.position >= 0 ? '+' : ''}${fmt(data.change.position)} |`);
  }
  lines.push('');
}

lines.push('## Alerts', '');
if (alerts.length) {
  for (const alert of alerts) lines.push(`- **${alert.severity.toUpperCase()} · ${alert.type}:** ${alert.message}`);
} else {
  lines.push('- No alert thresholds crossed.');
}

lines.push(
  '',
  '## Technical checks',
  '',
  `- Homepage: ${publicAudit.endpointStatus.homepage?.status || 0}`,
  `- sitemap.xml: ${publicAudit.endpointStatus.sitemap?.status || 0}`,
  `- robots.txt: ${publicAudit.endpointStatus.robots?.status || 0}`,
  `- /login final URL: ${publicAudit.endpointStatus.loginRedirect?.finalUrl || 'unavailable'}`,
  `- Unknown URL returns: ${publicAudit.endpointStatus.missing404?.status || 0}`,
  '',
  'This monitor is read-only. It does not request indexing, resubmit successful sitemaps, or modify titles, content, canonicals, redirects, login, dashboard, database, UI, or security code.',
  '',
);

const summary = lines.join('\n');
fs.writeFileSync(path.join(outputDir, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, 'summary.md'), summary);
fs.writeFileSync(path.join(outputDir, 'alert-level.txt'), report.status);
console.log(summary);
