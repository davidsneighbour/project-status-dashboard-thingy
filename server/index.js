import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import db from './db.js';
import { fetchAllRepos, rateLimit } from './github.js';
import { effectiveState } from './schedule.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const DEFAULT_INACTIVITY_DAYS = Number(process.env.DEFAULT_INACTIVITY_DAYS || 7);
const SYNC_ON_STARTUP = process.env.SYNC_ON_STARTUP !== 'false';
const SYNC_AUTO = process.env.SYNC_AUTO !== 'false';
const SYNC_INTERVAL_MINUTES = Math.max(1, Number(process.env.SYNC_INTERVAL_MINUTES || 60));

const app = express();
app.use(express.json());

// ---- GitHub repo cache -----------------------------------------------------
let repoCache = [];
let lastFetch = null;
let lastError = null;
let cacheReady = false; // false until the first successful GitHub fetch completes

async function refreshRepos() {
  repoCache = await fetchAllRepos();
  lastFetch = new Date().toISOString();
  lastError = null;
  cacheReady = true;

  // Make sure every repo has a state row so settings can be attached later.
  const insert = db.prepare(
    `INSERT OR IGNORE INTO repo_state (repo_id, full_name, updated_at) VALUES (?, ?, ?)`
  );
  const now = new Date().toISOString();
  const tx = db.transaction((repos) => {
    for (const r of repos) insert.run(r.id, r.full_name, now);
  });
  tx(repoCache);
  return repoCache;
}

function buildPayload() {
  const states = db.prepare('SELECT * FROM repo_state').all();
  const byId = new Map(states.map((s) => [s.repo_id, s]));
  return repoCache.map((r) => {
    const s = byId.get(r.id) || { priority: null, priority_set_at: null, inactivity_days: null, position: 0 };
    return {
      ...r,
      priority: s.priority,
      priority_set_at: s.priority_set_at,
      inactivity_days: s.inactivity_days,
      effective_inactivity_days: s.inactivity_days ?? DEFAULT_INACTIVITY_DAYS,
      position: s.position ?? 0,
      ...effectiveState(s, DEFAULT_INACTIVITY_DAYS),
    };
  });
}

// ---- Prepared statements ---------------------------------------------------
const setPriorityStmt = db.prepare(`
  INSERT INTO repo_state (repo_id, full_name, priority, priority_set_at, updated_at)
  VALUES (@id, @full_name, @priority, @set_at, @now)
  ON CONFLICT(repo_id) DO UPDATE SET
    priority = excluded.priority,
    priority_set_at = excluded.priority_set_at,
    updated_at = excluded.updated_at
`);
const setCheckedStmt = db.prepare(`
  INSERT INTO repo_state (repo_id, full_name, priority, priority_set_at, updated_at)
  VALUES (@id, @full_name, 1, @set_at, @now)
  ON CONFLICT(repo_id) DO UPDATE SET
    priority = 1,
    priority_set_at = excluded.priority_set_at,
    updated_at = excluded.updated_at
`);
const touchStmt = db.prepare(`UPDATE repo_state SET priority_set_at = ?, updated_at = ? WHERE repo_id = ?`);
const inactivityStmt = db.prepare(`
  INSERT INTO repo_state (repo_id, full_name, inactivity_days, updated_at)
  VALUES (@id, @full_name, @days, @now)
  ON CONFLICT(repo_id) DO UPDATE SET
    inactivity_days = excluded.inactivity_days,
    updated_at = excluded.updated_at
`);
const positionStmt = db.prepare(`UPDATE repo_state SET position = ?, updated_at = ? WHERE repo_id = ?`);

const findRepo = (id) => repoCache.find((r) => r.id === id);

// ---- API -------------------------------------------------------------------
app.get('/api/repos', (req, res) => {
  if (!cacheReady) {
    console.log('[/api/repos] cache not ready yet — GitHub fetch still in progress');
  }
  res.json({
    repos: buildPayload(),
    cacheReady,
    lastFetch,
    lastError,
    defaultInactivityDays: DEFAULT_INACTIVITY_DAYS,
    username: process.env.GITHUB_USERNAME || null,
    tokenPresent: Boolean(process.env.GITHUB_TOKEN),
    rateLimit: { ...rateLimit },
  });
});

app.post('/api/refresh', async (req, res) => {
  try {
    await refreshRepos();
    res.json({ ok: true, count: repoCache.length, repos: buildPayload(), cacheReady, lastFetch });
  } catch (e) {
    lastError = String(e.message || e);
    res.status(500).json({ ok: false, error: lastError });
  }
});

app.post('/api/repos/:id/priority', (req, res) => {
  const id = Number(req.params.id);
  const { priority } = req.body;
  if (priority !== null && ![1, 2, 3].includes(priority)) {
    return res.status(400).json({ error: 'priority must be 1, 2, 3 or null' });
  }
  const now = new Date().toISOString();
  setPriorityStmt.run({
    id,
    full_name: findRepo(id)?.full_name ?? null,
    priority,
    set_at: priority === null ? null : now,
    now,
  });
  res.json({ ok: true });
});

app.post('/api/repos/:id/check', (req, res) => {
  const id = Number(req.params.id);
  let { daysAgo } = req.body || {};
  daysAgo = Number(daysAgo ?? 0);
  if (!Number.isFinite(daysAgo) || daysAgo < 0) {
    return res.status(400).json({ error: 'daysAgo must be a non-negative number' });
  }

  const now = new Date();
  const checkedAt = new Date(now.getTime() - daysAgo * 86400000).toISOString();
  const nowIso = now.toISOString();

  setCheckedStmt.run({
    id,
    full_name: findRepo(id)?.full_name ?? null,
    set_at: checkedAt,
    now: nowIso,
  });
  res.json({ ok: true });
});

// "I looked" — keeps the assigned priority but resets the inactivity timer.
app.post('/api/repos/:id/touch', (req, res) => {
  const now = new Date().toISOString();
  touchStmt.run(now, now, Number(req.params.id));
  res.json({ ok: true });
});

app.post('/api/repos/:id/inactivity', (req, res) => {
  const id = Number(req.params.id);
  let { days } = req.body;
  if (days !== null) {
    days = Number(days);
    if (!Number.isFinite(days) || days < 0) return res.status(400).json({ error: 'days must be a non-negative number or null' });
  }
  inactivityStmt.run({ id, full_name: findRepo(id)?.full_name ?? null, days, now: new Date().toISOString() });
  res.json({ ok: true });
});

app.post('/api/reorder', (req, res) => {
  const { orderedIds } = req.body || {};
  const now = new Date().toISOString();
  const tx = db.transaction((ids) => ids.forEach((id, i) => positionStmt.run(i, now, Number(id))));
  tx(Array.isArray(orderedIds) ? orderedIds : []);
  res.json({ ok: true });
});

// ---- Static client (built by Vite) ----------------------------------------
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
}

function startServer() {
  app.listen(PORT, async () => {
    console.log(`\n  Repo Triage Dashboard → http://localhost:${PORT}\n`);
    console.log(`  Sync on startup: ${SYNC_ON_STARTUP} | Auto-sync: ${SYNC_AUTO} every ${SYNC_INTERVAL_MINUTES}m`);

    if (SYNC_ON_STARTUP) {
      try {
        await refreshRepos();
        console.log(`  Loaded ${repoCache.length} repositories from GitHub.`);
      } catch (e) {
        lastError = String(e.message || e);
        console.warn(`  Initial GitHub fetch failed: ${lastError}`);
      }
    }

    if (SYNC_AUTO) {
      setInterval(async () => {
        try {
          await refreshRepos();
          console.log(`  [auto-sync] Refreshed ${repoCache.length} repos from GitHub.`);
        } catch (e) {
          lastError = String(e.message || e);
          console.warn(`  [auto-sync] GitHub fetch failed: ${lastError}`);
        }
      }, SYNC_INTERVAL_MINUTES * 60 * 1000);
    }
  });
}

// Only boot the HTTP server + sync loop when run directly (node index.js).
// When imported by tests, the app is exported untouched so routes can be
// exercised with supertest against an in-process instance.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) startServer();

export { app, refreshRepos, buildPayload };
