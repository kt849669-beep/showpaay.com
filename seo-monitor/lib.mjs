import crypto from 'node:crypto';

export const DEFAULT_SITE_URL = 'https://showpayy.com/';
export const SEED_QUERIES = [
  'showpay',
  'showpay login',
  'show pay',
  'show pay login',
  'showpay app',
  'showpay apk',
];

const USER_AGENT = 'ShowPaySEOAgent/1.0 (+https://showpayy.com/)';

export function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function completedPeriods(now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  end.setUTCDate(end.getUTCDate() - 2);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);
  const previousEnd = new Date(start);
  previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setUTCDate(previousStart.getUTCDate() - 6);
  return {
    current: { start: isoDate(start), end: isoDate(end) },
    previous: { start: isoDate(previousStart), end: isoDate(previousEnd) },
  };
}

export function percentChange(current, previous) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function normalizeQuery(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match ? decodeEntities(match[1].trim()) : '';
}

function textContent(value) {
  return decodeEntities(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

export function inspectHtml(html, pageUrl) {
  const title = textContent(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  const linkTags = html.match(/<link\b[^>]*>/gi) || [];
  const descriptionTag = metaTags.find((tag) => attribute(tag, 'name').toLowerCase() === 'description');
  const robotsTag = metaTags.find((tag) => attribute(tag, 'name').toLowerCase() === 'robots');
  const viewportTag = metaTags.find((tag) => attribute(tag, 'name').toLowerCase() === 'viewport');
  const canonicalTag = linkTags.find((tag) => attribute(tag, 'rel').toLowerCase().split(/\s+/).includes('canonical'));
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) => textContent(match[1]));
  const jsonLd = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const schemaErrors = [];
  for (const entry of jsonLd) {
    try {
      JSON.parse(entry[1]);
    } catch (error) {
      schemaErrors.push(error.message);
    }
  }

  const links = [];
  for (const match of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    const href = decodeEntities(match[1].trim());
    if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href)) continue;
    try {
      const url = new URL(href, pageUrl);
      if (url.origin === new URL(pageUrl).origin) {
        url.hash = '';
        links.push(url.href);
      }
    } catch {
      // Invalid links are surfaced separately below.
      links.push(`INVALID:${href}`);
    }
  }

  return {
    title,
    description: descriptionTag ? attribute(descriptionTag, 'content') : '',
    robots: robotsTag ? attribute(robotsTag, 'content') : '',
    viewport: viewportTag ? attribute(viewportTag, 'content') : '',
    canonical: canonicalTag ? attribute(canonicalTag, 'href') : '',
    h1s,
    schemaBlocks: jsonLd.length,
    schemaErrors,
    links: [...new Set(links)],
  };
}

export function parseSitemap(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => decodeEntities(match[1]));
}

export function inspectRobots(text, siteUrl) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const sitemaps = lines
    .filter((line) => /^sitemap\s*:/i.test(line))
    .map((line) => line.replace(/^sitemap\s*:\s*/i, ''));
  return {
    sitemaps,
    declaresExpectedSitemap: sitemaps.includes(new URL('/sitemap.xml', siteUrl).href),
    blocksAll: lines.some((line) => /^disallow\s*:\s*\/$/i.test(line)),
  };
}

export async function fetchWithRedirects(url, options = {}) {
  const chain = [];
  let current = url;
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    const started = Date.now();
    const response = await fetch(current, {
      redirect: 'manual',
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xml,text/plain,*/*' },
      signal: AbortSignal.timeout(options.timeoutMs || 15000),
    });
    const elapsedMs = Date.now() - started;
    const location = response.headers.get('location');
    chain.push({ url: current, status: response.status, elapsedMs, location });
    if (response.status >= 300 && response.status < 400 && location) {
      current = new URL(location, current).href;
      continue;
    }
    return {
      url,
      finalUrl: current,
      status: response.status,
      elapsedMs: chain.reduce((sum, item) => sum + item.elapsedMs, 0),
      contentType: response.headers.get('content-type') || '',
      body: await response.text(),
      chain,
    };
  }
  throw new Error(`Too many redirects for ${url}`);
}

export async function auditPublicSite(siteUrl = DEFAULT_SITE_URL) {
  const origin = new URL(siteUrl).origin;
  const checks = {};
  const errors = [];
  const recommendations = [];

  async function safeFetch(label, url) {
    try {
      const result = await fetchWithRedirects(url);
      checks[label] = result;
      return result;
    } catch (error) {
      const result = { url, status: 0, error: error.message, chain: [] };
      checks[label] = result;
      errors.push(`${label}: ${error.message}`);
      return result;
    }
  }

  const [home, sitemap, robots, login, missing] = await Promise.all([
    safeFetch('homepage', siteUrl),
    safeFetch('sitemap', new URL('/sitemap.xml', siteUrl).href),
    safeFetch('robots', new URL('/robots.txt', siteUrl).href),
    safeFetch('loginRedirect', new URL('/login', siteUrl).href),
    safeFetch('missing404', new URL('/seo-monitor-not-found-check', siteUrl).href),
  ]);

  const sitemapUrls = sitemap.status === 200 ? parseSitemap(sitemap.body) : [];
  const robotsInfo = robots.status === 200 ? inspectRobots(robots.body, siteUrl) : null;
  const pageResults = [];
  for (const url of sitemapUrls.slice(0, 100)) {
    const result = url === siteUrl ? home : await safeFetch(`page:${url}`, url);
    const seo = result.status === 200 && result.contentType.includes('text/html')
      ? inspectHtml(result.body, result.finalUrl)
      : null;
    pageResults.push({
      url,
      finalUrl: result.finalUrl,
      status: result.status,
      elapsedMs: result.elapsedMs,
      seo,
    });
  }

  const internalLinks = [...new Set(pageResults.flatMap((page) => page.seo?.links || []))]
    .filter((url) => !url.startsWith('INVALID:'))
    .filter((url) => new URL(url).origin === origin)
    .slice(0, 150);
  const pageMap = new Map(pageResults.map((page) => [page.url, page]));
  const brokenLinks = [];
  for (const url of internalLinks) {
    const known = pageMap.get(url);
    const result = known || await safeFetch(`link:${url}`, url);
    const status = known ? known.status : result.status;
    if (status === 0 || status >= 400) brokenLinks.push({ url, status });
  }

  for (const page of pageResults) {
    if (page.status !== 200) errors.push(`${page.url}: HTTP ${page.status}`);
    if (!page.seo) continue;
    if (!page.seo.title) errors.push(`${page.url}: missing title`);
    if (!page.seo.description || page.seo.description.length < 70) errors.push(`${page.url}: missing or short description`);
    if (!page.seo.canonical) errors.push(`${page.url}: missing canonical`);
    else if (new URL(page.seo.canonical, page.url).href !== page.url) errors.push(`${page.url}: canonical mismatch (${page.seo.canonical})`);
    if (!page.seo.viewport) errors.push(`${page.url}: missing viewport`);
    if (page.seo.h1s.length !== 1) errors.push(`${page.url}: expected one H1, found ${page.seo.h1s.length}`);
    if (page.seo.schemaBlocks === 0) recommendations.push(`${page.url}: add truthful JSON-LD if it describes visible content`);
    if (page.seo.schemaErrors.length) errors.push(`${page.url}: invalid JSON-LD`);
    if (/\bnoindex\b/i.test(page.seo.robots)) errors.push(`${page.url}: sitemap URL is noindex`);
  }

  if (home.status !== 200) errors.push(`Homepage unavailable: HTTP ${home.status}`);
  if (sitemap.status !== 200) errors.push(`Sitemap unavailable: HTTP ${sitemap.status}`);
  if (!sitemapUrls.length) errors.push('Sitemap has no URLs');
  if (robots.status !== 200) errors.push(`robots.txt unavailable: HTTP ${robots.status}`);
  if (robotsInfo?.blocksAll) errors.push('robots.txt blocks the entire site');
  if (robotsInfo && !robotsInfo.declaresExpectedSitemap) errors.push('robots.txt does not declare the expected sitemap');
  if (login.finalUrl !== siteUrl || login.status !== 200) errors.push(`/login does not resolve to ${siteUrl}`);
  if (missing.status !== 404) errors.push(`Unknown URL returns ${missing.status}, expected 404`);
  if (brokenLinks.length) errors.push(`${brokenLinks.length} broken internal link(s)`);

  return {
    checkedAt: new Date().toISOString(),
    siteUrl,
    sitemapUrls,
    robots: robotsInfo,
    pages: pageResults,
    brokenLinks,
    endpointStatus: Object.fromEntries(Object.entries(checks).map(([key, value]) => [key, {
      status: value.status,
      finalUrl: value.finalUrl,
      elapsedMs: value.elapsedMs,
      error: value.error,
    }])),
    errors: [...new Set(errors)],
    recommendations: [...new Set(recommendations)],
  };
}

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

export async function googleAccessToken(serviceAccountJson) {
  const account = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;
  if (!account.client_email || !account.private_key) throw new Error('Invalid Google service-account JSON');
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), account.private_key).toString('base64url');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Google OAuth failed: ${response.status} ${await response.text()}`);
  return (await response.json()).access_token;
}

async function googleJson(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Google API ${response.status}: ${await response.text()}`);
  return response.json();
}

async function searchAnalytics(token, siteUrl, range, filters = [], dimensions = []) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const body = {
    startDate: range.start,
    endDate: range.end,
    type: 'web',
    dataState: 'final',
    rowLimit: 25000,
    dimensions,
  };
  if (filters.length) body.dimensionFilterGroups = [{ groupType: 'and', filters }];
  return googleJson(url, token, { method: 'POST', body: JSON.stringify(body) });
}

function metrics(row = {}) {
  return {
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  };
}

function comparison(current, previous) {
  return {
    current,
    previous,
    change: {
      clicksPercent: percentChange(current.clicks, previous.clicks),
      impressionsPercent: percentChange(current.impressions, previous.impressions),
      ctrPoints: (current.ctr - previous.ctr) * 100,
      position: current.position - previous.position,
    },
  };
}

function keywordMap(rows = []) {
  const map = new Map();
  for (const row of rows) {
    const key = normalizeQuery(row.keys?.[0]);
    if (!SEED_QUERIES.includes(key)) continue;
    const current = map.get(key) || { clicks: 0, impressions: 0, ctrNumerator: 0, positionNumerator: 0 };
    current.clicks += row.clicks || 0;
    current.impressions += row.impressions || 0;
    current.ctrNumerator += (row.clicks || 0);
    current.positionNumerator += (row.position || 0) * (row.impressions || 0);
    map.set(key, current);
  }
  return map;
}

function keywordMetrics(map, key) {
  const value = map.get(key);
  if (!value || value.impressions === 0) return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  return {
    clicks: value.clicks,
    impressions: value.impressions,
    ctr: value.clicks / value.impressions,
    position: value.positionNumerator / value.impressions,
  };
}

export async function auditSearchConsole({ accessToken, serviceAccountJson, siteUrl = DEFAULT_SITE_URL, sitemapUrls = [] }) {
  if (!accessToken && !serviceAccountJson) {
    return { connected: false, error: 'Google Search Console cloud identity is not configured' };
  }
  const token = accessToken || await googleAccessToken(serviceAccountJson);
  const periods = completedPeriods();
  const india = [{ dimension: 'country', operator: 'equals', expression: 'ind' }];
  const mobile = [{ dimension: 'device', operator: 'equals', expression: 'MOBILE' }];
  const indiaMobile = [...india, ...mobile];

  const [overallCurrent, overallPrevious, indiaCurrent, indiaPrevious, mobileCurrent, mobilePrevious, queryCurrent, queryPrevious, sitemaps] = await Promise.all([
    searchAnalytics(token, siteUrl, periods.current),
    searchAnalytics(token, siteUrl, periods.previous),
    searchAnalytics(token, siteUrl, periods.current, india),
    searchAnalytics(token, siteUrl, periods.previous, india),
    searchAnalytics(token, siteUrl, periods.current, mobile),
    searchAnalytics(token, siteUrl, periods.previous, mobile),
    searchAnalytics(token, siteUrl, periods.current, indiaMobile, ['query']),
    searchAnalytics(token, siteUrl, periods.previous, indiaMobile, ['query']),
    googleJson(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`, token),
  ]);

  const currentKeywords = keywordMap(queryCurrent.rows);
  const previousKeywords = keywordMap(queryPrevious.rows);
  const keywords = Object.fromEntries(SEED_QUERIES.map((key) => [key, comparison(
    keywordMetrics(currentKeywords, key),
    keywordMetrics(previousKeywords, key),
  )]));

  const inspections = [];
  for (const url of sitemapUrls.slice(0, 20)) {
    try {
      const data = await googleJson('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', token, {
        method: 'POST',
        body: JSON.stringify({ inspectionUrl: url, siteUrl, languageCode: 'en-US' }),
      });
      const result = data.inspectionResult || {};
      inspections.push({
        url,
        indexStatus: result.indexStatusResult || null,
        mobileUsability: result.mobileUsabilityResult || null,
        richResults: result.richResultsResult || null,
      });
    } catch (error) {
      inspections.push({ url, error: error.message });
    }
  }

  return {
    connected: true,
    periods,
    performance: {
      overall: comparison(metrics(overallCurrent.rows?.[0]), metrics(overallPrevious.rows?.[0])),
      india: comparison(metrics(indiaCurrent.rows?.[0]), metrics(indiaPrevious.rows?.[0])),
      mobile: comparison(metrics(mobileCurrent.rows?.[0]), metrics(mobilePrevious.rows?.[0])),
      keywords,
    },
    sitemaps: sitemaps.sitemap || [],
    inspections,
  };
}

export function buildAlerts(publicAudit, gsc) {
  const alerts = [];
  for (const error of publicAudit.errors) alerts.push({ severity: 'critical', type: 'technical', message: error });

  if (!gsc.connected) {
    alerts.push({ severity: 'warning', type: 'configuration', message: gsc.error });
    return alerts;
  }

  for (const [segment, data] of Object.entries({
    overall: gsc.performance.overall,
    india: gsc.performance.india,
    mobile: gsc.performance.mobile,
  })) {
    if (data.change.clicksPercent !== null && data.change.clicksPercent <= -30) {
      alerts.push({ severity: 'warning', type: 'clicks_drop', message: `${segment} clicks ${data.change.clicksPercent.toFixed(1)}%` });
    }
    if (data.change.impressionsPercent !== null && data.change.impressionsPercent <= -30) {
      alerts.push({ severity: 'warning', type: 'impressions_drop', message: `${segment} impressions ${data.change.impressionsPercent.toFixed(1)}%` });
    }
    if (data.change.position >= 2) {
      alerts.push({ severity: 'warning', type: 'position_drop', message: `${segment} average position worsened by ${data.change.position.toFixed(1)}` });
    }
  }

  for (const [query, data] of Object.entries(gsc.performance.keywords)) {
    const sample = Math.max(data.current.impressions, data.previous.impressions);
    if (sample >= 5 && data.change.position >= 2) {
      alerts.push({ severity: 'warning', type: 'keyword_regression', message: `${query}: position worsened by ${data.change.position.toFixed(1)}` });
    }
  }

  for (const sitemap of gsc.sitemaps) {
    if ((sitemap.errors || 0) > 0 || sitemap.isPending) {
      alerts.push({ severity: 'critical', type: 'sitemap', message: `${sitemap.path}: ${sitemap.errors || 0} errors, pending=${Boolean(sitemap.isPending)}` });
    }
  }

  for (const inspection of gsc.inspections) {
    if (inspection.error) {
      alerts.push({ severity: 'warning', type: 'inspection', message: `${inspection.url}: ${inspection.error}` });
      continue;
    }
    const status = inspection.indexStatus || {};
    if (status.verdict && status.verdict !== 'PASS') {
      alerts.push({ severity: 'warning', type: 'indexing', message: `${inspection.url}: ${status.coverageState || status.verdict}` });
    }
    if (status.robotsTxtState === 'DISALLOWED') {
      alerts.push({ severity: 'critical', type: 'robots', message: `${inspection.url}: blocked by robots.txt` });
    }
    if (status.pageFetchState && status.pageFetchState !== 'SUCCESSFUL') {
      alerts.push({ severity: 'critical', type: 'crawl', message: `${inspection.url}: ${status.pageFetchState}` });
    }
  }

  return alerts;
}

export function fingerprintAlerts(alerts) {
  const stable = alerts.map((alert) => `${alert.severity}|${alert.type}|${alert.message}`).sort().join('\n');
  return crypto.createHash('sha256').update(stable).digest('hex').slice(0, 16);
}
