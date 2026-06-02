import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api.js';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('api wrapper contract', () => {
    it('calls list endpoint with GET', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ json: async () => ({ ok: true }) });

        await api.list();

        expect(fetchMock).toHaveBeenCalledWith('/api/repos');
    });

    it('posts refresh endpoint', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ json: async () => ({ ok: true }) });

        await api.refresh();

        expect(fetchMock).toHaveBeenCalledWith('/api/refresh', { method: 'POST' });
    });

    it('posts check payload to check endpoint', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ json: async () => ({ ok: true }) });

        await api.setChecked(42, 3);

        expect(fetchMock).toHaveBeenCalledWith('/api/repos/42/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ daysAgo: 3 }),
        });
    });

    it('posts inactivity payload to inactivity endpoint', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ json: async () => ({ ok: true }) });

        await api.setInactivity(42, 14);

        expect(fetchMock).toHaveBeenCalledWith('/api/repos/42/inactivity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ days: 14 }),
        });
    });

    it('posts priority payload to priority endpoint', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ json: async () => ({ ok: true }) });

        await api.setPriority(42, null);

        expect(fetchMock).toHaveBeenCalledWith('/api/repos/42/priority', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priority: null }),
        });
    });

    it('posts ordered ids to reorder endpoint', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ json: async () => ({ ok: true }) });

        await api.reorder([3, 2, 1]);

        expect(fetchMock).toHaveBeenCalledWith('/api/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderedIds: [3, 2, 1] }),
        });
    });
});
