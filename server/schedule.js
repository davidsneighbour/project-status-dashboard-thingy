// Repos are grouped by how long ago they were checked.
// Bucket 0 is "today" (needs attention now), larger bucket index means later.
// defaultInactivityDays is the due age, so only N-1 future buckets exist.
// With default=7: checked 0d/1d ago -> day-6, checked 7+d ago (or never) -> day-0.
export function effectiveState(state, defaultInactivityDays = 7, nowMs = Date.now()) {
    const repoDays = Math.max(0, Number(state.inactivity_days ?? defaultInactivityDays) || 0);
    const maxFutureOffset = Math.max(0, defaultInactivityDays - 1);

    if (!state.priority_set_at) {
        return {
            column: 'day-0',
            checkedAgeDays: null,
            boardOffset: 0,
            dueInDays: 0,
            needsCheckToday: true,
        };
    }

    const ageDays = Math.max(0, (nowMs - new Date(state.priority_set_at).getTime()) / 86400000);
    const wholeDays = Math.floor(ageDays);
    const rawOffset = repoDays - wholeDays;
    const boardOffset = Math.max(0, Math.min(maxFutureOffset, rawOffset));

    return {
        column: `day-${boardOffset}`,
        checkedAgeDays: wholeDays,
        boardOffset,
        dueInDays: Math.max(0, rawOffset),
        needsCheckToday: rawOffset <= 0,
    };
}
