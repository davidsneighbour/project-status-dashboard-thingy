import { useState } from 'react';

// Action bar shown while one or more repos are selected. Each action applies to
// the whole selection (via App's bulkActions) and then clears it.
export function BulkBar({ count, actions, onClear }) {
  const [tag, setTag] = useState('');

  const submitTag = () => {
    const v = tag.trim();
    if (v) {
      actions.tag(v);
      setTag('');
    }
  };

  const btn = 'rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-200 hover:bg-neutral-800';

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900/80 px-3 py-2"
    >
      <span className="text-[11px] font-semibold text-neutral-200" aria-live="polite">
        {count} selected
      </span>
      <span className="mx-1 h-4 w-px bg-neutral-800" aria-hidden="true" />
      <button className={btn} onClick={actions.checkedNow}>Checked now</button>
      <button className={btn} onClick={actions.moveToday}>Move to Today</button>
      <button className={btn} onClick={actions.clear}>Clear check</button>
      <button className={btn} onClick={actions.ignore}>Ignore</button>
      <button className={btn} onClick={actions.unignore}>Unignore</button>
      <span className="ml-1 flex items-center gap-1">
        <input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submitTag();
            }
          }}
          placeholder="tag..."
          aria-label="Bulk tag"
          className="w-24 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-[11px] text-neutral-100 outline-hidden focus:border-neutral-500"
        />
        <button className={btn} disabled={tag.trim() === ''} onClick={submitTag}>
          Add tag
        </button>
      </span>
      <button
        onClick={onClear}
        className="ml-auto rounded-md px-2 py-1 text-[11px] text-neutral-400 hover:text-neutral-200"
      >
        Deselect
      </button>
    </div>
  );
}
