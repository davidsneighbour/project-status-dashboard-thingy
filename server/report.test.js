import { describe, expect, it } from 'vitest';
import { buildReport, toCsv, toMarkdown, REPORT_KINDS } from './report.js';

const NOW = '2026-06-03T00:00:00.000Z';
const REPOS = [
  { id: 1, full_name: 'me/alpha', owner: 'me', needsCheckToday: true, checkedAgeDays: null, ignored: false, archived: false, fork: false, language: 'JavaScript', pushed_at: '2026-06-01T00:00:00.000Z', tags: ['infra'], open_issues_count: 4, stargazers_count: 9 },
  { id: 2, full_name: 'dnbhq/beta', owner: 'dnbhq', needsCheckToday: false, checkedAgeDays: 2, ignored: false, archived: true, fork: false, language: 'Go', pushed_at: '2024-01-01T00:00:00.000Z', tags: [], open_issues_count: 0, stargazers_count: 0 },
  { id: 3, full_name: 'me/hidden', owner: 'me', needsCheckToday: true, checkedAgeDays: null, ignored: true, archived: false, fork: true, language: 'Go', pushed_at: '2026-05-01T00:00:00.000Z', tags: [], open_issues_count: 1, stargazers_count: 0 },
];

describe('buildReport', () => {
  it('summary counts respect ignored repos', () => {
    const r = buildReport('summary', REPOS, { now: NOW });
    const map = Object.fromEntries(r.rows);
    expect(map['total repos']).toBe(3);
    expect(map['due today']).toBe(1); // ignored me/hidden excluded
    expect(map['never reviewed']).toBe(1);
    expect(map.ignored).toBe(1);
    expect(map.archived).toBe(1);
    expect(map.owners).toBe(2);
    expect(map.tags).toBe(1);
  });

  it('due lists only non-ignored repos needing review', () => {
    const r = buildReport('due', REPOS, { now: NOW });
    expect(r.rows.map((row) => row[0])).toEqual(['me/alpha']);
  });

  it('stale uses the days window and sorts oldest first', () => {
    const r = buildReport('stale', REPOS, { now: NOW, days: 180 });
    expect(r.title).toMatch(/180d/);
    expect(r.rows.map((row) => row[0])).toEqual(['dnbhq/beta']);
  });

  it('owners aggregates per owner', () => {
    const r = buildReport('owners', REPOS, { now: NOW });
    const me = r.rows.find((row) => row[0] === 'me');
    expect(me).toEqual(['me', 2, 2, 0]);
  });

  it('active lists repos with open issues, sorted desc', () => {
    const r = buildReport('active', REPOS, { now: NOW });
    expect(r.rows.map((row) => row[0])).toEqual(['me/alpha', 'me/hidden']);
  });

  it('throws on an unknown kind', () => {
    expect(() => buildReport('nope', REPOS)).toThrow(/unknown report/);
  });

  it('exposes the kind list', () => {
    expect(REPORT_KINDS).toContain('summary');
  });
});

describe('formatters', () => {
  const report = { kind: 'due', title: 'Due today', generatedAt: NOW, columns: ['repo', 'note'], rows: [['a/b', 'has | pipe']] };

  it('renders a markdown table and escapes pipes', () => {
    const md = toMarkdown(report);
    expect(md).toContain('| repo | note |');
    expect(md).toContain('has \\| pipe');
  });

  it('renders an empty markdown notice', () => {
    expect(toMarkdown({ ...report, rows: [] })).toMatch(/No matching repositories/);
  });

  it('renders csv with quoting for special characters', () => {
    const csv = toCsv({ ...report, rows: [['a,b', 'q"x']] });
    expect(csv).toContain('"a,b","q""x"');
  });
});
