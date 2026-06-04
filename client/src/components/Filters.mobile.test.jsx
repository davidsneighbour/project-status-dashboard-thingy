import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { TagFilter } from './TagFilter.jsx';
import { PriorityFilter } from './PriorityFilter.jsx';
import { setMobileViewport, setDesktopViewport } from '../test/viewport.js';

const tags = [{ tag: 'infra', count: 2 }, { tag: 'docs', count: 1 }];

describe('TagFilter / PriorityFilter bottom sheets (mobile)', () => {
  beforeEach(() => setMobileViewport());

  it('renders the tag filter panel as a bottom sheet on mobile', () => {
    render(<TagFilter available={tags} value={{ tags: [], mode: 'any' }} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Filter by tag' }));
    const dialog = screen.getByRole('dialog', { name: 'Filter by tag' });
    expect(dialog.className).toMatch(/bottom-0/);
    expect(dialog.className).toMatch(/inset-x-0/);
    // Same content: the tags are still listed.
    expect(screen.getByText('#infra')).toBeInTheDocument();
  });

  it('renders the priority filter panel as a bottom sheet on mobile', () => {
    render(<PriorityFilter value={[]} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Filter by priority' }));
    const dialog = screen.getByRole('dialog', { name: 'Filter by priority' });
    expect(dialog.className).toMatch(/bottom-0/);
    expect(screen.getByText('P1')).toBeInTheDocument();
  });
});

describe('TagFilter / PriorityFilter stay anchored popovers on desktop', () => {
  beforeEach(() => setDesktopViewport());

  it('keeps the tag filter as a fixed-width popover', () => {
    render(<TagFilter available={tags} value={{ tags: [], mode: 'any' }} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Filter by tag' }));
    const dialog = screen.getByRole('dialog', { name: 'Filter by tag' });
    expect(dialog.className).toMatch(/w-56/);
    expect(dialog.className).not.toMatch(/bottom-0/);
  });
});
