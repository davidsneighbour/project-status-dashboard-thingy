import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';
import { api } from './api.js';

vi.mock('./api.js', () => ({
  api: {
    list: vi.fn(),
    refresh: vi.fn(),
    setPriority: vi.fn(),
    clearSchedule: vi.fn(),
    setChecked: vi.fn(),
    touch: vi.fn(),
    setInactivity: vi.fn(),
    reorder: vi.fn(),
    setIgnored: vi.fn(),
    addNotice: vi.fn(),
    addTag: vi.fn(),
    removeTag: vi.fn(),
  },
}));

const card = (id, name) => ({
  id, name, full_name: `me/${name}`, html_url: `https://x/${name}`, description: '',
  private: false, archived: false, fork: false, language: 'JS',
  pushed_at: '2026-06-01T00:00:00.000Z', checkedAgeDays: 0, dueInDays: 7,
  needsCheckToday: false, column: 'day-0', position: id, tags: [], priority: null,
});

const payload = {
  repos: [card(1, 'alpha'), card(2, 'beta')],
  cacheReady: true, syncing: false, defaultInactivityDays: 7,
  lastFetch: '2026-06-03T00:00:00.000Z', username: null, owners: [],
  sourceWarnings: [], tokenPresent: true, lastError: null,
  rateLimit: { remaining: 1000, limit: 5000, used: 4000, authInvalid: false },
};

describe('toast + undo for ignore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    api.list.mockResolvedValue(payload);
    api.setIgnored.mockResolvedValue({ ok: true });
  });

  it('shows an undo toast after ignoring a repo from the card menu', async () => {
    render(<App />);
    await screen.findByRole('link', { name: 'alpha' });

    fireEvent.click(screen.getAllByRole('button', { name: 'Open repository settings' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Ignore repo' }));

    expect(await screen.findByText('Ignored alpha')).toBeInTheDocument();
    await waitFor(() => expect(api.setIgnored).toHaveBeenCalledWith(1, true));

    // Undo unignores it.
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(api.setIgnored).toHaveBeenCalledWith(1, false));
  });

  it('offers undo after a bulk ignore and restores every repo', async () => {
    render(<App />);
    await screen.findByRole('link', { name: 'alpha' });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select alpha' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select beta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ignore' }));

    expect(await screen.findByText('2 repos ignored')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

    await waitFor(() => {
      expect(api.setIgnored).toHaveBeenCalledWith(1, false);
      expect(api.setIgnored).toHaveBeenCalledWith(2, false);
    });
  });

  it('dismisses the toast with the close button', async () => {
    render(<App />);
    await screen.findByRole('link', { name: 'alpha' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Open repository settings' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Ignore repo' }));

    await screen.findByText('Ignored alpha');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByText('Ignored alpha')).not.toBeInTheDocument();
  });
});
