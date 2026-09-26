function studyDayKey(date = new Date()) {
    const shifted = new Date(date.getTime() - (20 * 60 * 60 * 1000));
    return shifted.toISOString().slice(0, 10);
}

function splitDurationByStudyDay(startAt, endAt) {
    const startMs = new Date(startAt).getTime();
    const endMs = new Date(endAt).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return [];

    const totalSeconds = Math.floor((endMs - startMs) / 1000);
    if (totalSeconds <= 0) return [];

    const portions = [];
    let cursor = startMs;
    let allocatedSeconds = 0;
    while (cursor < endMs) {
        const studyDay = studyDayKey(new Date(cursor));
        const nextBoundary = Date.parse(`${studyDay}T20:00:00.000Z`) + (24 * 60 * 60 * 1000);
        const segmentEnd = Math.min(endMs, nextBoundary);
        const seconds = Math.floor((segmentEnd - cursor) / 1000);
        portions.push({ studyDay, seconds });
        allocatedSeconds += seconds;
        cursor = segmentEnd;
    }

    portions[portions.length - 1].seconds += totalSeconds - allocatedSeconds;
    return portions.filter(portion => portion.seconds > 0);
}

module.exports = { studyDayKey, splitDurationByStudyDay };