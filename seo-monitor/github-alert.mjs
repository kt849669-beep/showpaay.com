import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const report = JSON.parse(fs.readFileSync(path.join(here, 'output', 'latest.json'), 'utf8'));
const summary = fs.readFileSync(path.join(here, 'output', 'summary.md'), 'utf8');
const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;

if (!token || !repository) {
  console.log('GitHub alert sync skipped: token or repository missing.');
  process.exit(0);
}

const [owner, repo] = repository.split('/');
const title = '[SEO Monitor] showpayy.com alert';
const marker = `<!-- seo-monitor-fingerprint:${report.alertFingerprint} -->`;

async function api(endpoint, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}${endpoint}`, {
    ...options,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  if (response.status === 204) return null;
  return response.json();
}

const issues = await api('/issues?state=open&per_page=100');
const issue = issues.find((entry) => !entry.pull_request && entry.title === title);

if (!report.alerts.length) {
  if (issue) {
    await api(`/issues/${issue.number}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: `Recovery detected at ${report.generatedAt}. All monitored alert thresholds are clear.` }),
    });
    await api(`/issues/${issue.number}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed' }) });
    console.log(`Closed recovered SEO alert issue #${issue.number}.`);
  } else {
    console.log('No active SEO alerts.');
  }
  process.exit(0);
}

const alertBody = `${marker}\n\n${summary}`;
if (!issue) {
  const created = await api('/issues', {
    method: 'POST',
    body: JSON.stringify({ title, body: alertBody }),
  });
  console.log(`Created SEO alert issue #${created.number}.`);
  process.exit(0);
}

const comments = await api(`/issues/${issue.number}/comments?per_page=100`);
const latestBody = comments.length ? comments[comments.length - 1].body : issue.body;
if (latestBody?.includes(marker)) {
  console.log(`SEO alert issue #${issue.number} already has this fingerprint.`);
  process.exit(0);
}

await api(`/issues/${issue.number}/comments`, {
  method: 'POST',
  body: JSON.stringify({ body: alertBody }),
});
console.log(`Updated SEO alert issue #${issue.number}.`);
