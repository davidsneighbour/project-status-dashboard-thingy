import { describe, expect, it } from 'vitest';
import { buildDayColumns, defaultFilters, filterRepos, groupRepos } from './board.js';

const repos = [
    { id: 1, name: 'own-live', description: 'alpha', language: 'JS', fork: false, archived: false, column: 'day-0', position: 2 },
    { id: 2, name: 'fork-live', description: 'beta', language: 'TS', fork: true, archived: false, column: 'day-1', position: 1 },
    { id: 3, name: 'own-archived', description: 'gamma', language: 'Go', fork: false, archived: true, column: 'day-2', position: 0 },
];

describe('filterRepos', () => {
    it('includes all repos with default filters', () => {
        expect(filterRepos(repos, '', defaultFilters)).toHaveLength(3);
    });

    it('applies inclusive union visibility filters', () => {
        const filtered = filterRepos(repos, '', { showOwn: true, showForks: false, showArchived: false });
        expect(filtered.map((repo) => repo.id)).toEqual([1]);
    });

    it('matches search term against name/description/language', () => {
        expect(filterRepos(repos, 'go', defaultFilters).map((repo) => repo.id)).toEqual([3]);
    });
});

describe('buildDayColumns', () => {
    it('builds expected day columns from inactivity days', () => {
        const columns = buildDayColumns(4, (offset) => ({ title: `d${offset}`, subtitle: `s${offset}` }));
        expect(columns.map((column) => column.key)).toEqual(['day-0', 'day-1', 'day-2', 'day-3']);
        expect(columns[0].accent).toBe('rose');
        expect(columns[1].accent).toBe('amber');
        expect(columns[3].accent).toBe('sky');
        expect(columns[0].daysAgoTarget).toBe(4);
        expect(columns[3].daysAgoTarget).toBe(1);
    });
});

describe('groupRepos', () => {
    it('groups by column and sorts by position then name', () => {
        const columns = [
            { key: 'day-0' },
            { key: 'day-1' },
            { key: 'day-2' },
        ];
        const grouped = groupRepos(
            [
                repos[0],
                { ...repos[0], id: 4, name: 'aaa', column: 'day-0', position: 2 },
                repos[1],
                repos[2],
            ],
            columns
        );

        expect(grouped['day-0'].map((repo) => repo.id)).toEqual([4, 1]);
        expect(grouped['day-1'].map((repo) => repo.id)).toEqual([2]);
        expect(grouped['day-2'].map((repo) => repo.id)).toEqual([3]);
    });
});
