import { Router } from "express";
import DMConversation from "../models/DMConversation.js";
import DMMessage from "../models/DMMessage.js";
import GroupChat from "../models/GroupChat.js";
import GroupMessage from "../models/GroupMessage.js";
import User from "../models/User.js";
import { resolveBubbleTheme } from "../lib/bubbleTheme.js";
import { httpAuth } from "../middleware/httpAuth.js";
import { historyQuerySchema } from "../validation/chat.js";

// Mirror of the Next.js GET /api/dms/[id]/messages and /api/groups/[id]/messages
// pagination contract: limit=30, cursor (exclusive _id), returns
// { messages, hasMore, nextCursor } with messages oldest-first.
async function fetchHistory({ model, convModel, idField, msgField, id, userId, cursor, limit }) {
    const membershipQuery = { _id: id, isActive: true };
    membershipQuery[idField] = userId;
    const conv = await convModel.findOne(membershipQuery).lean();
    if (!conv) return null;

    // Message docs are keyed by conversationId / groupId (NOT the membership field).
    const query = { [msgField]: id };
    if (cursor) query._id = { $lt: cursor };

    const raw = await model
        .find(query)
        .sort({ _id: -1 })
        .limit(limit + 1)
        .populate("sender", "name username avatar isVerified")
        .populate({
            path: "replyTo",
            populate: { path: "sender", select: "name username" },
        })
        .lean();

    const hasMore = raw.length > limit;
    const page = raw.slice(0, limit);
    const messages = [...page].reverse();

    await attachBubbleThemes(messages);

    const nextCursor = hasMore
        ? String(page[page.length - 1]._id)
        : null;

    return { messages, hasMore, nextCursor };
}

async function attachBubbleThemes(messages) {
    const senderIds = [
        ...new Set(
            messages
                .map((m) => m.sender?._id?.toString())
                .filter(Boolean),
        ),
    ];
    if (senderIds.length === 0) return;
    const users = await User.find({ _id: { $in: senderIds } }).lean();
    const byId = new Map(users.map((u) => [u._id.toString(), u]));
    for (const m of messages) {
        const sid = m.sender?._id?.toString();
        if (sid && byId.has(sid)) {
            m.sender.bubbleTheme = resolveBubbleTheme(byId.get(sid));
        }
    }
}

const router = Router();

router.get("/conversations/:id/messages", httpAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { cursor, limit } = historyQuerySchema.parse(req.query);
        const data = await fetchHistory({
            model: DMMessage,
            convModel: DMConversation,
            idField: "participants.userId",
            msgField: "conversationId",
            id,
            userId: req.userId,
            cursor,
            limit,
        });
        if (!data) return res.status(403).json({ message: "Conversation not found" });
        return res.json(data);
    } catch (err) {
        return res.status(400).json({ error: "Bad request" });
    }
});

router.get("/groups/:id/messages", httpAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { cursor, limit } = historyQuerySchema.parse(req.query);
        const data = await fetchHistory({
            model: GroupMessage,
            convModel: GroupChat,
            idField: "members.userId",
            msgField: "groupId",
            id,
            userId: req.userId,
            cursor,
            limit,
        });
        if (!data) return res.status(403).json({ message: "Group not found or not a member" });
        return res.json(data);
    } catch (err) {
        return res.status(400).json({ error: "Bad request" });
    }
});

export default router;
