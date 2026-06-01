const GITHUB_API = 'https://api.github.com';

// ---- Shared rate-limit state -----------------------------------------------
// Exported so server/index.js can include it in every API response.
export const rateLimit = {
  limit: null,       // total requests allowed per window
  remaining: null,   // requests remaining in current window
  used: null,        // requests consumed
  reset: null,       // Unix timestamp (seconds) when the window resets
  lastChecked: null, // ISO timestamp of the last GitHub response we parsed
  authInvalid: false,// true after a 401 — set back to false on success
};

function parseRateLimitHeaders(res) {
  const h = (k) => res.headers.get(k);
  if (h('x-ratelimit-limit') !== null) rateLimit.limit = Number(h('x-ratelimit-limit'));
  if (h('x-ratelimit-remaining') !== null) rateLimit.remaining = Number(h('x-ratelimit-remaining'));
  if (h('x-ratelimit-used') !== null) rateLimit.used = Number(h('x-ratelimit-used'));
  if (h('x-ratelimit-reset') !== null) rateLimit.reset = Number(h('x-ratelimit-reset'));
  rateLimit.lastChecked = new Date().toISOString();
}

/**
 * Fetch ALL repositories the configured token can see.
 *
 * - Default (no GITHUB_USERNAME): the authenticated token owner's repos,
 *   including private + archived (this is what you almost certainly want).
 * - With GITHUB_USERNAME set: that user/org's PUBLIC repos only (GitHub will
 *   not expose someone else's private repos no matter the token).
 */
export async function fetchAllRepos() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is not set. Put it in ~/.env and start with: docker compose --env-file ~/.env up');
  }

  // Block immediately if we know the rate limit is exhausted.
  if (rateLimit.remaining === 0 && rateLimit.reset && Math.floor(Date.now() / 1000) < rateLimit.reset) {
    const secsLeft = Math.ceil(rateLimit.reset - Date.now() / 1000);
    const resetAt = new Date(rateLimit.reset * 1000).toLocaleTimeString();
    throw new Error(`GitHub API rate limit exhausted — resets at ${resetAt} (in ${secsLeft}s)`);
  }

  const username = (process.env.GITHUB_USERNAME || '').trim();
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'repo-dashboard',
  };

  const out = [];
  const perPage = 100;
  for (let page = 1; page <= 50; page++) {
    const url = username
      ? `${GITHUB_API}/users/${encodeURIComponent(username)}/repos?per_page=${perPage}&page=${page}&type=owner&sort=full_name`
      : `${GITHUB_API}/user/repos?per_page=${perPage}&page=${page}&affiliation=owner&visibility=all&sort=full_name`;

    const res = await fetch(url, { headers });
    parseRateLimitHeaders(res);

    if (res.status === 401) {
      rateLimit.authInvalid = true;
      const body = await res.text().catch(() => '');
      let msg = 'GitHub token is invalid or expired (401).';
      try {
        const parsed = JSON.parse(body);
        if (parsed.message) msg += ` GitHub says: "${parsed.message}"`;
      } catch { /* body wasn't JSON */ }
      throw new Error(msg);
    }

    if (res.status === 403) {
      const body = await res.text().catch(() => '');
      if (rateLimit.remaining === 0) {
        const resetAt = rateLimit.reset ? new Date(rateLimit.reset * 1000).toLocaleTimeString() : 'unknown';
        throw new Error(`GitHub API rate limit exhausted (403) — resets at ${resetAt}`);
      }
      throw new Error(`GitHub API 403 Forbidden: ${body.slice(0, 200)}`);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`);
    }

    const batch = await res.json();
    out.push(...batch);
    if (batch.length < perPage) break;
  }

  // Successful fetch — token is clearly valid.
  rateLimit.authInvalid = false;

  return out.map((r) => ({
    id: r.id,
    name: r.name,
    full_name: r.full_name,
    description: r.description,
    private: r.private,
    archived: r.archived,
    fork: r.fork,
    html_url: r.html_url,
    language: r.language,
    pushed_at: r.pushed_at,
    updated_at: r.updated_at,
    stargazers_count: r.stargazers_count,
    open_issues_count: r.open_issues_count,
  }));
}
