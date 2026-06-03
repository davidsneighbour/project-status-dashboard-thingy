// Pure report builder over the board payload (buildPayload() output). Each
// report normalises to a tabular shape { kind, title, generatedAt, columns,
// rows } so the json/markdown/csv formatters below stay generic.

export const REPORT_KINDS = ['summary', 'due', 'never-reviewed', 'stale', 'owners', 'languages', 'archived', 'active'];

const tagStr = (r) => (r.tags || []).map((t) => `#${t}`).join(' ');
const dateOnly = (iso) => (iso ? String(iso).slice(0, 10) : '');
const checkedLabel = (r) =>
  r.checkedAgeDays == null ? 'never' : r.checkedAgeDays === 0 ? 'today' : `${r.checkedAgeDays}d ago`;

function summaryRows(repos) {
  const active = repos.filter((r) => !r.ignored);
  const owners = new Set(repos.map((r) => r.owner).filter(Boolean));
  const tags = new Set();
  for (const r of repos) for (const t of r.tags || []) tags.add(t);
  return [
    ['total repos', repos.length],
    ['due today', active.filter((r) => r.needsCheckToday).length],
    ['never reviewed', active.filter((r) => r.checkedAgeDays == null).length],
    ['ignored', repos.filter((r) => r.ignored).length],
    ['archived', repos.filter((r) => r.archived).length],
    ['forks', repos.filter((r) => r.fork).length],
    ['owners', owners.size],
    ['tags', tags.size],
  ];
}

export function buildReport(kind, repos, opts = {}) {
  const generatedAt = opts.now || new Date().toISOString();
  const report = (title, columns, rows) => ({ kind, title, generatedAt, columns, rows });

  switch (kind) {
    case 'summary':
      return report('Summary', ['metric', 'value'], summaryRows(repos));

    case 'due': {
      const list = repos.filter((r) => r.needsCheckToday && !r.ignored);
      return report('Due today', ['repo', 'owner', 'last checked', 'tags'], list.map((r) => [r.full_name, r.owner || '', checkedLabel(r), tagStr(r)]));
    }

    case 'never-reviewed': {
      const list = repos.filter((r) => r.checkedAgeDays == null && !r.ignored);
      return report('Never reviewed', ['repo', 'owner', 'pushed', 'tags'], list.map((r) => [r.full_name, r.owner || '', dateOnly(r.pushed_at), tagStr(r)]));
    }

    case 'stale': {
      const days = Math.max(0, Number(opts.days ?? 180) || 0);
      const cutoff = Date.parse(generatedAt) - days * 86400000;
      const list = repos
        .filter((r) => !r.ignored && r.pushed_at && Date.parse(r.pushed_at) < cutoff)
        .sort((a, b) => Date.parse(a.pushed_at) - Date.parse(b.pushed_at));
      return report(`Stale — no push in ${days}d`, ['repo', 'owner', 'pushed', 'language'], list.map((r) => [r.full_name, r.owner || '', dateOnly(r.pushed_at), r.language || '']));
    }

    case 'owners': {
      const map = new Map();
      for (const r of repos) {
        const o = r.owner || '—';
        const e = map.get(o) || { repos: 0, due: 0, archived: 0 };
        e.repos += 1;
        if (r.needsCheckToday) e.due += 1;
        if (r.archived) e.archived += 1;
        map.set(o, e);
      }
      const rows = [...map.entries()]
        .sort((a, b) => b[1].repos - a[1].repos || a[0].localeCompare(b[0]))
        .map(([o, e]) => [o, e.repos, e.due, e.archived]);
      return report('Per owner', ['owner', 'repos', 'due today', 'archived'], rows);
    }

    case 'languages': {
      const map = new Map();
      for (const r of repos) {
        const l = r.language || '—';
        map.set(l, (map.get(l) || 0) + 1);
      }
      const rows = [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([l, c]) => [l, c]);
      return report('Languages', ['language', 'repos'], rows);
    }

    case 'archived': {
      const list = repos.filter((r) => r.archived).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      return report('Archived', ['repo', 'owner', 'pushed'], list.map((r) => [r.full_name, r.owner || '', dateOnly(r.pushed_at)]));
    }

    case 'active': {
      const list = repos.filter((r) => (r.open_issues_count || 0) > 0).sort((a, b) => (b.open_issues_count || 0) - (a.open_issues_count || 0));
      return report('Open issues / PRs', ['repo', 'owner', 'open', 'stars'], list.map((r) => [r.full_name, r.owner || '', r.open_issues_count || 0, r.stargazers_count || 0]));
    }

    default:
      throw new Error(`unknown report "${kind}". Available: ${REPORT_KINDS.join(', ')}`);
  }
}

export function toMarkdown(report) {
  const esc = (v) => String(v ?? '').replace(/\|/g, '\\|');
  const head = `## ${report.title}\n\n_${report.generatedAt}_\n`;
  if (report.rows.length === 0) return `${head}\n_No matching repositories._\n`;
  const header = `| ${report.columns.join(' | ')} |`;
  const sep = `| ${report.columns.map(() => '---').join(' | ')} |`;
  const body = report.rows.map((row) => `| ${row.map(esc).join(' | ')} |`).join('\n');
  return `${head}\n${header}\n${sep}\n${body}\n`;
}

export function toCsv(report) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `${[report.columns, ...report.rows].map((row) => row.map(esc).join(',')).join('\n')}\n`;
}
