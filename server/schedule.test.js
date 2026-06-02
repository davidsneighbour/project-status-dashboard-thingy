import { describe, expect, it } from 'vitest';
import { effectiveState } from './schedule.js';

describe('effectiveState', () => {
    const nowMs = Date.UTC(2026, 0, 10, 12, 0, 0);

    it('returns day-0 for never checked repos', () => {
        const state = effectiveState({ priority_set_at: null, inactivity_days: null }, 7, nowMs);
        expect(state.column).toBe('day-0');
        expect(state.checkedAgeDays).toBeNull();
        expect(state.needsCheckToday).toBe(true);
    });

    it('returns future column for recent checks', () => {
        const checkedAt = new Date(nowMs - 2 * 86400000).toISOString();
        const state = effectiveState({ priority_set_at: checkedAt, inactivity_days: 7 }, 7, nowMs);
        expect(state.column).toBe('day-5');
        expect(state.dueInDays).toBe(5);
        expect(state.needsCheckToday).toBe(false);
    });

    it('returns day-0 when checked age is due or overdue', () => {
        const checkedAt = new Date(nowMs - 8 * 86400000).toISOString();
        const state = effectiveState({ priority_set_at: checkedAt, inactivity_days: 7 }, 7, nowMs);
        expect(state.column).toBe('day-0');
        expect(state.needsCheckToday).toBe(true);
    });

    it('clamps board offset to visible column count', () => {
        const checkedAt = new Date(nowMs).toISOString();
        const state = effectiveState({ priority_set_at: checkedAt, inactivity_days: 14 }, 7, nowMs);
        expect(state.column).toBe('day-6');
        expect(state.dueInDays).toBe(14);
    });

    it('supports inactivity values 0, 1, 7, 14 and null', () => {
        const checkedAt = new Date(nowMs).toISOString();

        const zeroDays = effectiveState({ priority_set_at: checkedAt, inactivity_days: 0 }, 7, nowMs);
        expect(zeroDays.column).toBe('day-0');
        expect(zeroDays.needsCheckToday).toBe(true);

        const oneDay = effectiveState({ priority_set_at: checkedAt, inactivity_days: 1 }, 7, nowMs);
        expect(oneDay.column).toBe('day-1');
        expect(oneDay.dueInDays).toBe(1);

        const sevenDays = effectiveState({ priority_set_at: checkedAt, inactivity_days: 7 }, 7, nowMs);
        expect(sevenDays.column).toBe('day-6');
        expect(sevenDays.dueInDays).toBe(7);

        const fourteenDays = effectiveState({ priority_set_at: checkedAt, inactivity_days: 14 }, 7, nowMs);
        expect(fourteenDays.column).toBe('day-6');
        expect(fourteenDays.dueInDays).toBe(14);

        const defaultFromNull = effectiveState({ priority_set_at: checkedAt, inactivity_days: null }, 7, nowMs);
        expect(defaultFromNull.column).toBe('day-6');
        expect(defaultFromNull.dueInDays).toBe(7);
    });
});
