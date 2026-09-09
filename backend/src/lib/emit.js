// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Internal HTTP emit API — the single realtime layer.
// The Next.js app POSTs events here; we fan out to Socket.IO rooms.
//
// Auth: shared secret via `x-internal-secret` header (INTERNAL_SECRET env),
// must match CHAT_BACKEND_SECRET on the Next.js side.
//
// Channel kinds:
//   user:<id>       → emitted to the recipient's personal room
//                     (notification:new, group:created, vc-started, ...)
//   dm:<id>         → conversation room (auto-joined by all participants)
//   group:<id>      → group room (auto-joined by all members)
//   type:"user_list"→ helper to emit to many user rooms at once
//   type:"user_list"→ helper to emit to many user rooms at once
// ━━━━━━━━━━━━━━━━━━━━━━━━━ shared secret via `x-internal-secret` header
import { Router } from "express";
import { getIo } from "../io.js";
import config from "../config.js";
import { internalRateLimit } from "../middleware/rateLimit.js";

const router = Router();

function authorized(req) {
    return (
        req.headers["x-internal-secret"] === config.internalSecret &&
        !!config.internalSecret
    );
}

router.post("/emit", internalRateLimit, (req, res) => {
    if (!authorized(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const { channel, type, payload } = req.body || {};

    if (!channel || typeof channel !== "string") {
        return res
            .status(400)
            .json({ ok: false, error: "channel (string) is required" });
    }
    if (!type || typeof type !== "string") {
        return res
            .status(400)
            .json({ ok: false, error: "type (string) is required" });
    }

    let rooms;
    if (channel === "user_list") {
        const userIds = req.body?.userIds;
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res
                .status(400)
                .json({ ok: false, error: "userIds array is required" });
        }
        if (userIds.length > 200) {
            return res
                .status(400)
                .json({ ok: false, error: "max 200 userIds per emit" });
        }
        rooms = userIds.map((id) => `user:${id}`);
    } else if (
        channel.startsWith("user:") ||
        channel.startsWith("dm:") ||
        channel.startsWith("group:")
    ) {
        rooms = [channel];
    } else {
        return res.status(400).json({
            ok: false,
            error: "channel must be user:*, dm:*, group:*, or user_list",
        });
    }

    // Optional: ensure these users' sockets have joined the target room before
    // emitting (covers members whose socket connected before the dm:/group:
    // room existed, e.g. a brand-new conversation). Idempotent.
    const joinUsers = Array.isArray(req.body?.joinUsers) ? req.body.joinUsers : [];

    const io = getIo();
    let delivered = 0;
    for (const room of rooms) {
        if (room.startsWith("dm:") || room.startsWith("group:")) {
            for (const uid of joinUsers) {
                if (uid) io.in(`user:${uid}`).socketsJoin(room);
            }
        }
        delivered += io.to(room).emit(type, payload);
    }

    return res.json({ ok: true, delivered });
});

export default router;
