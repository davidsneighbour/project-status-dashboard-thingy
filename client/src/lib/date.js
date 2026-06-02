export function timeAgo(iso, nowMs = Date.now()) {
    if (!iso) return 'never';
    const s = (nowMs - new Date(iso).getTime()) / 1000;
    const units = [
        ['y', 31536000],
        ['mo', 2592000],
        ['w', 604800],
        ['d', 86400],
        ['h', 3600],
        ['m', 60],
    ];
    for (const [u, secs] of units) {
        if (s >= secs) return `${Math.floor(s / secs)}${u} ago`;
    }
    return 'just now';
}

export function calendarLabel(offset, now = new Date()) {
    if (offset === 0) return { title: 'Today', subtitle: 'needs review' };

    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date);

    if (offset === 1) return { title: weekday, subtitle: 'tomorrow' };
    if (offset === 2) return { title: weekday, subtitle: 'day after tomorrow' };
    return { title: weekday, subtitle: `in ${offset} days` };
}
