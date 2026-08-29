// In-memory presence: userId -> number of live socket connections for that user.
// Scoped per-process (no Redis) — same limitation as the Kivo reference project.
// Tracks only "is this user online at least once"; the count handles multi-tab.
const counts = new Map();

export function markOnline(userId) {
    const next = (counts.get(userId) || 0) + 1;
    counts.set(userId, next);
    return next === 1; // true if this connection made the user go from offline -> online
}

export function markOffline(userId) {
    const current = counts.get(userId) || 0;
    const next = current - 1;
    if (next <= 0) {
        counts.delete(userId);
        return true; // true if the user is now fully offline
    }
    counts.set(userId, next);
    return false;
}

export function isOnline(userId) {
    return counts.has(userId);
}
