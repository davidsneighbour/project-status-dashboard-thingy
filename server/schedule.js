// Repos are grouped by how long ago they were checked.
// Bucket 0 is "today" (needs attention now), larger bucket index means later.
// defaultInactivityDays is the due age, so only N-1 future buckets exist.
// With default=7: checked 0d/1d ago -> day-6, checked 7+d ago (or never) -> day-0.
export function effectiveState(state, defaultInactivityDays = 7, nowMs = Date.now()) {
    const repoDays = Math.max(0, Number(state.inactivity_days ?? defaultInactivityDays) || 0);
    const maxFutureOffset = Math.max(0, defaultInactivityDays - 1);

    // "Checked Nd ago" reflects when the repo was ACTUALLY reviewed, which is
    // independent of priority_set_at — that anchor is back-dated to position a
    // card in a future column, so it must not drive the checked-age display.
    const checkedAgeDays = state.checked_at
        ? Math.max(0, Math.floor((nowMs - new Date(state.checked_at).getTime()) / 86400000))
        : null;

    if (!state.priority_set_at) {
        return {
            column: 'day-0',
            checkedAgeDays,
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
        checkedAgeDays,
        boardOffset,
        dueInDays: Math.max(0, rawOffset),
        needsCheckToday: rawOffset <= 0,
    };
}
