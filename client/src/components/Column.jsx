import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { cx, ACCENT, ICON } from '../lib/constants.js';
import { repoMatchesQuery } from '../lib/board.js';
import { RepoCard } from './RepoCard.jsx';

export function Column({ col, repos, onDropColumn, schedulable = true, ...cardProps }) {
  const acc = ACCENT[col.accent];
  const ColSearchIcon = ICON.search;
  const [over, setOver] = useState(false);
  const [cq, setCq] = useState('');

  const visible = useMemo(() => repos.filter((r) => repoMatchesQuery(r, cq)), [repos, cq]);
  const filtering = cq.trim() !== '';

  return (
    <div role="group" aria-label={`${col.title} column, ${repos.length} repositories`} className="flex h-full w-72 shrink-0 flex-col">
      <div className={cx('mb-2 flex items-center justify-between rounded-lg border bg-neutral-900/40 px-3 py-2', acc.edge)}>
        <div className="flex min-w-0 items-center gap-2">
          <span className={cx('h-2 w-2 shrink-0 rounded-full', acc.dot)} />
          <span className={cx('truncate text-sm font-semibold', acc.head)}>{col.title}</span>
          <span className="truncate text-[11px] text-neutral-600">{col.subtitle}</span>
        </div>
        <span className="shrink-0 rounded-full bg-neutral-800 px-2 py-0.5 text-[11px] tabular-nums text-neutral-300">
          {filtering ? `${visible.length}/${repos.length}` : repos.length}
        </span>
      </div>

      <label className="relative mb-2 block">
        <ColSearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-600" aria-hidden="true" />
        <input
          value={cq}
          onChange={(e) => setCq(e.target.value)}
          placeholder="filter column..."
          aria-label={`Filter ${col.title} column`}
          className="w-full rounded-md border border-neutral-800 bg-neutral-950 pl-7 pr-7 py-1 text-[11px] text-neutral-100 outline-hidden focus:border-neutral-600"
        />
        {cq && (
          <button
            type="button"
            onClick={() => setCq('')}
            aria-label={`Clear ${col.title} filter`}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-neutral-600 hover:text-neutral-200"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        )}
      </label>

      <div
        onDragOver={(e) => {
          if (!schedulable) return;
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (!schedulable) return;
          e.preventDefault();
          setOver(false);
          const id = Number(e.dataTransfer.getData('text/plain'));
          if (id) onDropColumn(id, col.daysAgoTarget);
        }}
        className={cx(
          'flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-lg border border-dashed p-2 transition-colors',
          over ? 'border-neutral-500 bg-neutral-900/60' : 'border-neutral-800/60'
        )}
      >
        {visible.map((r) => (
          <RepoCard key={r.id} repo={r} column={col} schedulable={schedulable} {...cardProps} />
        ))}
        {repos.length === 0 && (
          <div className="grid flex-1 place-items-center text-center text-xs text-neutral-700">{schedulable ? 'drag here' : 'empty'}</div>
        )}
        {repos.length > 0 && visible.length === 0 && (
          <div className="grid flex-1 place-items-center text-center text-xs text-neutral-700">no matches</div>
        )}
      </div>
    </div>
  );
}
