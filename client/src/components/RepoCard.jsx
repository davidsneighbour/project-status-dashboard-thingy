import { useRef } from 'react';
import { cx, ICON, ownerColor, tagColor, PRIORITY_META } from '../lib/constants.js';
import { timeAgo } from '../lib/date.js';
import { Badge } from './Badge.jsx';
import { CardMenu } from './CardMenu.jsx';

export function RepoCard({ repo, column, menuOpenId, menuIntent, showOwner, density = 'comfortable', schedulable = true, fields = {}, selectedIds, onToggleSelect, onToggleMenu, onDragStartCard, onDropOnCard, ...handlers }) {
  // Field visibility: a field shows unless explicitly toggled off.
  const show = (k) => fields[k] !== false;
  const SettingsIcon = ICON.settings;
  const StarIcon = ICON.star;
  const IssueIcon = ICON.issues;
  const TagIcon = ICON.tag;
  const menuButtonRef = useRef(null);
  const ownerTint = showOwner && repo.owner ? ownerColor(repo.owner) : null;
  const compact = density === 'compact';
  const selected = selectedIds ? selectedIds.has(repo.id) : false;

  const dueText = repo.needsCheckToday ? 'review today' : `review in ${repo.dueInDays} days`;
  const cardLabel = `${repo.name}${repo.owner ? `, ${repo.owner}` : ''} — ${dueText}`;

  // Keyboard alternative to drag: [ pulls a card toward Today, ] pushes it
  // further out, one column at a time. Mirrors the drag target math. Only the
  // day-schedule board is schedulable; other groupings are read-only views.
  const onCardKeyDown = (e) => {
    if (!schedulable || (e.key !== '[' && e.key !== ']') || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    e.preventDefault();
    const span = Math.max(1, handlers.defaultInactivity || 7);
    const cur = repo.boardOffset ?? 0;
    const next = e.key === ']' ? Math.min(span - 1, cur + 1) : Math.max(0, cur - 1);
    if (next !== cur) handlers.onSetChecked(repo.id, span - next);
  };

  return (
    <div
      draggable={schedulable}
      role="group"
      aria-label={cardLabel}
      aria-keyshortcuts={schedulable ? '[ ]' : undefined}
      onKeyDown={onCardKeyDown}
      onDragStart={schedulable ? (e) => onDragStartCard(e, repo.id) : undefined}
      onDragOver={schedulable ? (e) => e.preventDefault() : undefined}
      onDrop={schedulable ? (e) => {
        e.stopPropagation();
        e.preventDefault();
        onDropOnCard(e, repo.id, column.daysAgoTarget);
      } : undefined}
      style={ownerTint ? { borderLeftColor: ownerTint, borderLeftWidth: 3 } : undefined}
      className={cx(
        'group relative rounded-lg border bg-neutral-900/70 hover:border-neutral-700',
        selected ? 'border-neutral-400 ring-1 ring-neutral-500' : 'border-neutral-800',
        compact ? 'p-2' : 'p-3'
      )}
    >
      <div className={cx('flex items-start justify-between gap-2', schedulable && 'cursor-grab')}>
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(repo.id)}
            aria-label={`Select ${repo.name}`}
            className="mt-0.5 shrink-0 accent-neutral-400"
          />
        )}
        <div className="min-w-0 flex-1">
          <a
            href={repo.html_url}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-sm font-medium text-neutral-100 hover:text-white hover:underline"
          >
            {repo.name}
          </a>
          {repo.description && <p className={cx('mt-0.5 text-xs text-neutral-500', compact ? 'line-clamp-1' : 'line-clamp-2')}>{repo.description}</p>}
        </div>
        <button
          ref={menuButtonRef}
          onClick={() => onToggleMenu(repo.id)}
          className="shrink-0 rounded-md px-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-100"
          aria-label="Open repository settings"
        >
          <SettingsIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {PRIORITY_META[repo.priority] && (
          <span
            className={cx('inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold', PRIORITY_META[repo.priority].chip)}
            title={PRIORITY_META[repo.priority].title}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PRIORITY_META[repo.priority].dot }} aria-hidden="true" />
            {PRIORITY_META[repo.priority].label}
          </span>
        )}
        {ownerTint && (
          <span
            className="inline-flex items-center gap-1 rounded-sm bg-neutral-800 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300"
            title={`owner: ${repo.owner}`}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ownerTint }} aria-hidden="true" />
            {repo.owner}
          </span>
        )}
        <Badge tone={repo.private ? 'amber' : 'emerald'}>{repo.private ? 'private' : 'public'}</Badge>
        {repo.archived ? <Badge tone="neutral">archived</Badge> : <Badge tone="sky">live</Badge>}
        {repo.fork && <Badge tone="neutral">fork</Badge>}
        {repo.language && show('language') && <Badge tone="violet">{repo.language}</Badge>}
        {repo.ignored && <Badge tone="neutral">ignored</Badge>}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {repo.tags?.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-sm bg-neutral-800 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300"
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tagColor(tag) }} aria-hidden="true" />
            #{tag}
          </span>
        ))}
        <button
          onClick={() => onToggleMenu(repo.id, 'tag')}
          className="inline-flex items-center gap-0.5 rounded-sm border border-dashed border-neutral-700 px-1.5 py-0.5 text-[10px] text-neutral-500 hover:border-neutral-600 hover:text-neutral-300"
          aria-label={`Add tag to ${repo.name}`}
        >
          <TagIcon className="h-2.5 w-2.5" aria-hidden="true" />
          tag
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-neutral-500">
        <span className="flex min-w-0 items-center gap-2">
          {show('pushed') && <span className="truncate">pushed {timeAgo(repo.pushed_at)}</span>}
          {show('stars') && repo.stargazers_count > 0 && (
            <span className="flex shrink-0 items-center gap-0.5 tabular-nums" title={`${repo.stargazers_count} stargazers`}>
              <StarIcon className="h-3 w-3" aria-hidden="true" />
              {repo.stargazers_count}
            </span>
          )}
          {show('issues') && repo.open_issues_count > 0 && (
            <span className="flex shrink-0 items-center gap-0.5 tabular-nums" title={`${repo.open_issues_count} open issues / PRs`}>
              <IssueIcon className="h-3 w-3" aria-hidden="true" />
              {repo.open_issues_count}
            </span>
          )}
        </span>
        <span className="shrink-0">
          {repo.checkedAgeDays == null
            ? 'not checked yet'
            : repo.checkedAgeDays === 0
            ? 'checked today'
            : `checked ${repo.checkedAgeDays}d ago`}
        </span>
      </div>

      <div className="mt-1 text-[11px] text-neutral-500">
        {repo.needsCheckToday ? (
          <span className="text-rose-300">review today</span>
        ) : (
          <span>review in {repo.dueInDays}d</span>
        )}
      </div>

      {repo.latest_notice && !compact && show('notice') && (
        <div className="mt-2 flex items-start justify-between gap-2 rounded-md bg-neutral-950 px-2 py-1.5">
          <p className="line-clamp-2 text-[11px] text-neutral-300">{repo.latest_notice.body}</p>
          <span className="shrink-0 text-[10px] tabular-nums text-neutral-600">{timeAgo(repo.latest_notice.created_at)}</span>
        </div>
      )}

      {menuOpenId === repo.id && (
        <CardMenu repo={repo} anchorRef={menuButtonRef} autoFocusTag={menuIntent === 'tag'} onClose={() => onToggleMenu(repo.id)} {...handlers} />
      )}
    </div>
  );
}
