import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettingsDialog } from './SettingsDialog.jsx';

const defaults = { defaultInactivityDays: 7, syncIntervalMinutes: 60, githubOwners: '' };
const settings = { defaultInactivityDays: 14, syncIntervalMinutes: 30, githubOwners: 'myorg' };

describe('SettingsDialog', () => {
  it('renders with current settings pre-filled', () => {
    render(<SettingsDialog settings={settings} defaults={defaults} onSave={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByLabelText('Default review cycle (days)')).toHaveValue(14);
    expect(screen.getByLabelText('Auto-sync interval (minutes)')).toHaveValue(30);
    expect(screen.getByLabelText('GitHub owners (comma-separated)')).toHaveValue('myorg');
  });

  it('uses defaults when settings prop is null', () => {
    render(<SettingsDialog settings={null} defaults={defaults} onSave={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByLabelText('Default review cycle (days)')).toHaveValue(7);
    expect(screen.getByLabelText('Auto-sync interval (minutes)')).toHaveValue(60);
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<SettingsDialog settings={settings} defaults={defaults} onSave={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<SettingsDialog settings={settings} defaults={defaults} onSave={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSave with parsed values on submit', async () => {
    const onSave = vi.fn().mockResolvedValue();
    render(<SettingsDialog settings={settings} defaults={defaults} onSave={onSave} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Default review cycle (days)'), { target: { value: '21' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      defaultInactivityDays: 21,
      syncIntervalMinutes: 30,
      githubOwners: 'myorg',
      reportSchedule: null,
    }));
  });

  it('shows a validation error for out-of-range review cycle', () => {
    render(<SettingsDialog settings={settings} defaults={defaults} onSave={vi.fn()} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Default review cycle (days)'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('alert').textContent).toMatch(/Review cycle/);
  });

  it('shows a validation error for out-of-range sync interval', () => {
    render(<SettingsDialog settings={settings} defaults={defaults} onSave={vi.fn()} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Auto-sync interval (minutes)'), { target: { value: '9999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('alert').textContent).toMatch(/Sync interval/);
  });
});
