import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';
import { api } from './api.js';

vi.mock('./api.js', () => ({
  api: {
    list: vi.fn(),
    refresh: vi.fn(),
    setPriority: vi.fn(),
    setChecked: vi.fn(),
    touch: vi.fn(),
    setInactivity: vi.fn(),
    reorder: vi.fn(),
  },
}));

const card = (over) => ({
  id: 1, name: 'r', full_name: 'me/r', html_url: 'https://x/r', description: '',
  private: false, archived: false, fork: false, language: 'JS',
  pushed_at: '2026-06-01T00:00:00.000Z', checkedAgeDays: 0, dueInDays: 7,
  needsCheckToday: false, column: 'day-0', position: 0, ...over,
});

const payload = (repos) => ({
  repos,
  cacheReady: true,
  syncing: false,
  defaultInactivityDays: 7,
  lastFetch: '2026-06-03T00:00:00.000Z',
  username: null,
  owners: [],
  sourceWarnings: [],
  tokenPresent: true,
  lastError: null,
  rateLimit: { remaining: 1000, limit: 5000, used: 4000, authInvalid: false },
});

describe('card repo stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('shows star and open-issue counts when greater than zero', async () => {
    api.list.mockResolvedValue(payload([card({ id: 1, name: 'busy', stargazers_count: 12, open_issues_count: 3 })]));

    render(<App />);
    await screen.findByRole('link', { name: 'busy' });

    expect(screen.getByTitle('12 stargazers')).toHaveTextContent('12');
    expect(screen.getByTitle('3 open issues / PRs')).toHaveTextContent('3');
  });

  it('hides stats when counts are zero or missing', async () => {
    api.list.mockResolvedValue(payload([card({ id: 1, name: 'quiet', stargazers_count: 0, open_issues_count: 0 })]));

    render(<App />);
    await screen.findByRole('link', { name: 'quiet' });

    expect(screen.queryByTitle(/stargazers/)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/open issues/)).not.toBeInTheDocument();
  });
});

describe('within-column sort', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('reorders cards within a column by the selected sort and persists it', async () => {
    const { fireEvent } = await import('@testing-library/react');
    api.list.mockResolvedValue(payload([
      card({ id: 1, name: 'banana', column: 'day-0', position: 0 }),
      card({ id: 2, name: 'apple', column: 'day-0', position: 1 }),
    ]));

    render(<App />);
    await screen.findByRole('link', { name: 'banana' });

    // Default (manual) keeps position order: banana before apple.
    let links = screen.getAllByRole('link').map((a) => a.textContent);
    expect(links.indexOf('banana')).toBeLessThan(links.indexOf('apple'));

    fireEvent.change(screen.getByLabelText('Sort cards within columns'), { target: { value: 'name' } });

    links = screen.getAllByRole('link').map((a) => a.textContent);
    expect(links.indexOf('apple')).toBeLessThan(links.indexOf('banana'));
    expect(window.localStorage.getItem('repo-triage-sort')).toBe('name');
  });
});
