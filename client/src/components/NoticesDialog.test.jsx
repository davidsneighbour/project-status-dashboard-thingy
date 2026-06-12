import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NoticesDialog } from './NoticesDialog.jsx';
import { api } from '../api.js';

vi.mock('../api.js', () => ({
  api: {
    allNotices: vi.fn(),
    repoNotices: vi.fn(),
    deleteNotice: vi.fn(),
  },
}));

const notice = { id: 7, repo_id: 1, full_name: 'me/alpha', body: 'hi there', created_at: '2026-05-01T00:00:00.000Z' };
const noop = () => {};

describe('NoticesDialog onDeleted callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.allNotices.mockResolvedValue({ notices: [notice] });
    api.deleteNotice.mockResolvedValue({ ok: true });
  });

  it('calls onDeleted with the deleted notice after confirmation', async () => {
    const onDeleted = vi.fn();
    render(<NoticesDialog scope="all" repos={[]} onClose={noop} onScopeChange={noop} onDeleted={onDeleted} />);

    expect(await screen.findByText('hi there')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete notice' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(api.deleteNotice).toHaveBeenCalledWith(7));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(notice));
  });

  it('does not throw when onDeleted is not provided', async () => {
    render(<NoticesDialog scope="all" repos={[]} onClose={noop} onScopeChange={noop} />);

    expect(await screen.findByText('hi there')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete notice' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(api.deleteNotice).toHaveBeenCalledWith(7));
    // No crash — onDeleted?.(notice) is a no-op when prop is absent.
  });
});
