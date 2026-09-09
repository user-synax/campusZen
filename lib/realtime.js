import config from "./config";

/**
 * Server-side realtime emit client — replaces Pusher server SDK.
 *
 * Forwards events to the Socket.IO backend (Render), which fans them out to
 * rooms:
 *   - `user:<userId>`   → a specific user's personal room (all their sockets)
 *   - `dm:<convId>`     → a DM conversation room
 *   - `group:<groupId>` → a group chat room
 *   - `user_list`       → many user rooms in one call (with optional joinUsers)
 *
 * Event names follow the socket-native convention: notification:new, group:created,
 * message:deleted, message:reaction, etc.
 *
 * Fire-and-forget by design: realtime delivery must never fail the main
 * action. setRealtimeMode() lets tests/dev force failures to be loud.
 */

let mode = "fire-and-forget"; // "fire-and-forget" | "strict"

export function setRealtimeMode(next) {
    mode = next;
}

/**
 * Emit to one or more rooms via the chat backend's internal API.
 * @param {string|string[]} channel "user:<id>" | "dm:<id>" | "group:<id>" | "user_list"
 * @param {string} event     event name, e.g. "new-notification"
 * @param {object} payload   JSON-serializable payload
 * @param {object} [opts]    { userIds?: string[], joinUsers?: string[] }
 */
export async function emitRealtime(channel, event, payload = {}, opts = {}) {
    const body = JSON.stringify({
        channel: Array.isArray(channel) ? "user_list" : channel,
        type: event,
        payload,
        ...(Array.isArray(channel) ? { userIds: channel } : {}),
        ...(opts.joinUsers ? { joinUsers: opts.joinUsers } : {}),
    });

    try {
        const res = await fetch(`${config.realtime.emitUrl}/api/emit`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-internal-secret": config.realtime.secret,
            },
            body,
            signal: AbortSignal.timeout(4000),
        });
        if (!res.ok) {
            throw new Error(
                `emit failed (${res.status}): ${event} → ${JSON.stringify(channel)}`,
            );
        }
    } catch (err) {
        if (mode === "strict") throw err;
        // Silent by default — notification is in DB / action already succeeded.
        console.error("[realtime] emit failed:", err.message);
    }
}

/** Convenience wrappers for common emit targets. */
export async function emitToUser(userId, event, payload, opts = {}) {
    return emitRealtime(`user:${userId}`, event, payload, opts);
}

export async function emitToUsers(userIds, event, payload, opts = {}) {
    return emitRealtime(userIds, event, payload, opts);
}

export async function emitToDm(conversationId, event, payload, opts = {}) {
    return emitRealtime(`dm:${conversationId}`, event, payload, opts);
}

export async function emitToGroup(groupId, event, payload, opts = {}) {
    return emitRealtime(`group:${groupId}`, event, payload, opts);
}
