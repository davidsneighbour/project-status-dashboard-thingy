import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// db.js reads DATA_DIR at import time, so point it at a throwaway dir BEFORE
// the app (and its SQLite singleton) are imported.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-dash-routes-'));
process.env.DATA_DIR = tmpDir;
process.env.DEFAULT_INACTIVITY_DAYS = '7';
process.env.SYNC_ON_STARTUP = 'false';
process.env.SYNC_AUTO = 'false';
process.env.GITHUB_TOKEN = 'test-token';

// Keep GitHub offline and deterministic. refreshRepos() resolves to this list.
vi.mock('./github.js', () => ({
  rateLimit: {
    limit: 5000, remaining: 4999, used: 1, reset: null, lastChecked: null, authInvalid: false,
  },
  fetchAllRepos: vi.fn(),
  parseRateLimitHeaders: vi.fn(),
}));

const { fetchAllRepos } = await import('./github.js');
const { app, refreshRepos } = await import('./index.js');

const REPO = { id: 101, full_name: 'me/alpha', name: 'alpha', language: 'JavaScript' };

beforeAll(async () => {
  fetchAllRepos.mockResolvedValue([REPO]);
  await refreshRepos(); // seeds repoCache + creates the repo_state row
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('GET /api/repos', () => {
  it('returns the expected metadata keys and the seeded repo', async () => {
    const res = await request(app).get('/api/repos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
      repos: expect.any(Array),
      cacheReady: true,
      defaultInactivityDays: 7,
      tokenPresent: true,
      rateLimit: expect.any(Object),
    }));
    expect(res.body).toHaveProperty('lastFetch');
    expect(res.body.repos.find((r) => r.id === REPO.id)).toBeTruthy();
  });
});

describe('POST /api/repos/:id/check', () => {
  it('rejects negative daysAgo with 400', async () => {
    const res = await request(app).post(`/api/repos/${REPO.id}/check`).send({ daysAgo: -1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/non-negative/);
  });

  it('rejects non-finite daysAgo with 400', async () => {
    const res = await request(app).post(`/api/repos/${REPO.id}/check`).send({ daysAgo: 'soon' });
    expect(res.status).toBe(400);
  });

  it('accepts daysAgo: 0 and lands the repo in the furthest future column', async () => {
    const res = await request(app).post(`/api/repos/${REPO.id}/check`).send({ daysAgo: 0 });
    expect(res.status).toBe(200);
    const board = await request(app).get('/api/repos');
    const repo = board.body.repos.find((r) => r.id === REPO.id);
    expect(repo.column).toBe('day-6'); // checked now, default 7 -> max offset 6
  });

  it('accepts daysAgo >= threshold and returns the repo to Today', async () => {
    await request(app).post(`/api/repos/${REPO.id}/check`).send({ daysAgo: 7 });
    const board = await request(app).get('/api/repos');
    const repo = board.body.repos.find((r) => r.id === REPO.id);
    expect(repo.column).toBe('day-0');
  });
});

describe('POST /api/repos/:id/inactivity', () => {
  it('rejects a negative override with 400', async () => {
    const res = await request(app).post(`/api/repos/${REPO.id}/inactivity`).send({ days: -3 });
    expect(res.status).toBe(400);
  });

  it('rejects a non-finite override with 400', async () => {
    const res = await request(app).post(`/api/repos/${REPO.id}/inactivity`).send({ days: 'lots' });
    expect(res.status).toBe(400);
  });

  it('accepts null (reset to default)', async () => {
    const res = await request(app).post(`/api/repos/${REPO.id}/inactivity`).send({ days: null });
    expect(res.status).toBe(200);
  });

  it('accepts a valid number and persists the override', async () => {
    const res = await request(app).post(`/api/repos/${REPO.id}/inactivity`).send({ days: 14 });
    expect(res.status).toBe(200);
    const board = await request(app).get('/api/repos');
    const repo = board.body.repos.find((r) => r.id === REPO.id);
    expect(repo.effective_inactivity_days).toBe(14);
  });
});

describe('POST /api/repos/:id/priority', () => {
  it('rejects a priority outside 1|2|3|null with 400', async () => {
    const res = await request(app).post(`/api/repos/${REPO.id}/priority`).send({ priority: 5 });
    expect(res.status).toBe(400);
  });

  it('accepts a valid priority', async () => {
    const res = await request(app).post(`/api/repos/${REPO.id}/priority`).send({ priority: 1 });
    expect(res.status).toBe(200);
  });

  it('accepts null (clear)', async () => {
    const res = await request(app).post(`/api/repos/${REPO.id}/priority`).send({ priority: null });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/repos/:id/touch', () => {
  it('resets the check timestamp and returns ok', async () => {
    const res = await request(app).post(`/api/repos/${REPO.id}/touch`).send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('POST /api/reorder', () => {
  it('persists ordered ids', async () => {
    const res = await request(app).post('/api/reorder').send({ orderedIds: [REPO.id] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('tolerates a missing / non-array orderedIds', async () => {
    const res = await request(app).post('/api/reorder').send({});
    expect(res.status).toBe(200);
  });
});

describe('POST /api/refresh', () => {
  it('returns 500 { ok:false } when the GitHub fetch throws', async () => {
    fetchAllRepos.mockRejectedValueOnce(new Error('boom'));
    const res = await request(app).post('/api/refresh');
    expect(res.status).toBe(500);
    expect(res.body).toEqual(expect.objectContaining({ ok: false, error: expect.stringMatching(/boom/) }));
  });

  it('returns ok with a count on success', async () => {
    fetchAllRepos.mockResolvedValueOnce([REPO]);
    const res = await request(app).post('/api/refresh');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ ok: true, count: 1 }));
  });
});
