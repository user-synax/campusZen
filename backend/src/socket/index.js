import mongoose from "mongoose";
import DMConversation from "../models/DMConversation.js";
import DMMessage from "../models/DMMessage.js";
import GroupChat from "../models/GroupChat.js";
import GroupMessage from "../models/GroupMessage.js";
import User from "../models/User.js";
import { resolveBubbleTheme } from "../lib/bubbleTheme.js";
import { notifyChatMessage } from "../lib/notify.js";
import { markOnline, markOffline, isOnline } from "../presence.js";
import {
    messageSendSchema,
    typingSchema,
    readSchema,
} from "../validation/chat.js";

// Cache of minimal public user info (id/name/username/avatar) for presence +
// typing payloads. Populated on each connection.
const userInfoCache = new Map();

async function ensureUserInfo(userId) {
    if (userInfoCache.has(userId)) return userInfoCache.get(userId);
    try {
        const u = await User.findById(userId).lean();
        if (u) {
            const info = {
                id: String(u._id),
                name: u.name,
                username: u.username,
                avatar: u.avatar,
            };
            userInfoCache.set(userId, info);
            return info;
        }
    } catch (err) {
        // ignore — presence just won't have a name
    }
    const fallback = { id: userId, name: "", username: "", avatar: "" };
    userInfoCache.set(userId, fallback);
    return fallback;
}

async function buildOutgoing(messageDoc, { clientId, conversationId, groupId }) {
    await messageDoc.populate({
        path: "replyTo",
        populate: { path: "sender", select: "name username" },
    });
    // Fetch the sender's full user doc (incl. shop inventory) so the equipped
    // chat-bubble theme can be resolved, mirroring the Next.js message routes.
    // NOTE: messageDoc.sender is an ObjectId here (not a populated doc).
    const senderUser = await User.findById(messageDoc.sender).lean();
    const doc = messageDoc.toObject();
    const bubbleTheme = resolveBubbleTheme(senderUser);
    const sender = {
        _id: String(messageDoc.sender),
        name: senderUser?.name,
        username: senderUser?.username,
        avatar: senderUser?.avatar,
        isVerified: senderUser?.isVerified || false,
        bubbleTheme,
    };
    return {
        ...doc,
        sender,
        clientId,
        reactions: doc.reactions || [],
        ...(conversationId ? { conversationId } : {}),
        ...(groupId ? { groupId } : {}),
    };
}

async function handleDmSend(io, socket, payload, ack) {
    const conversation = await DMConversation.findOne({
        _id: payload.id,
        "participants.userId": socket.userId,
        isActive: true,
    });
    if (!conversation) {
        return ack?.({ ok: false, error: "Conversation not found" });
    }

    const msg = await DMMessage.create({
        conversationId: payload.id,
        sender: socket.userId,
        content: payload.type === "text" ? payload.content : "",
        type: payload.type,
        imageUrl: payload.type === "image" ? payload.imageUrl : "",
        replyTo: payload.replyTo || null,
    });

    const outgoing = await buildOutgoing(msg, {
        clientId: payload.clientId,
        conversationId: payload.id,
    });

    const lastMessage = {
        content:
            payload.type === "text"
                ? payload.content.slice(0, 60)
                : "📷 Image",
        senderName: outgoing.sender.name,
        sentAt: new Date(),
        type: payload.type,
    };

    await DMConversation.findByIdAndUpdate(payload.id, {
        lastMessage,
        $inc: {
            messageCount: 1,
            "participants.$[elem].unreadCount": 1,
        },
    }, {
        arrayFilters: [
            {
                "elem.userId": { $ne: new mongoose.Types.ObjectId(socket.userId) },
                "elem.isMuted": { $ne: true },
            },
        ],
    });

    io.to(`dm:${payload.id}`).emit("message:new", outgoing);

    const other = conversation.participants.find(
        (p) => p.userId.toString() !== socket.userId,
    );
    if (other && !other.isMuted) {
        notifyChatMessage({
            kind: "dm",
            sender: socket.userId,
            recipient: other.userId,
            convId: payload.id,
            preview:
                payload.messageType === "text"
                    ? payload.content.slice(0, 100)
                    : "📷 Image",
            senderName: outgoing.sender.name,
        });
    }

    // Deliver to the recipient's personal room so their sidebar/unread badge
    // updates in real time even when they're not in the conversation room.
    if (other) {
        io.to(`user:${String(other.userId)}`).emit("message:new", outgoing);
    }

    ack?.({ ok: true, message: outgoing });
}

async function handleGroupSend(io, socket, payload, ack) {
    const group = await GroupChat.findOne({
        _id: payload.id,
        "members.userId": socket.userId,
        isActive: true,
    });
    if (!group) return ack?.({ ok: false, error: "Group not found or not a member" });

    const msg = await GroupMessage.create({
        groupId: payload.id,
        sender: socket.userId,
        content: payload.type === "text" ? payload.content : "",
        type: payload.type,
        imageUrl: payload.type === "image" ? payload.imageUrl : "",
        replyTo: payload.replyTo || null,
    });

    const outgoing = await buildOutgoing(msg, {
        clientId: payload.clientId,
        groupId: payload.id,
    });

    const lastMessage = {
        content:
            payload.type === "text"
                ? payload.content.slice(0, 60)
                : "📷 Image",
        senderName: outgoing.sender.name,
        sentAt: new Date(),
        type: payload.type,
    };

    await GroupChat.findByIdAndUpdate(payload.id, {
        lastMessage,
        $inc: {
            messageCount: 1,
            "members.$[elem].unreadCount": 1,
        },
    }, {
        arrayFilters: [
            {
                "elem.userId": { $ne: new mongoose.Types.ObjectId(socket.userId) },
                "elem.isMuted": { $ne: true },
            },
        ],
    });

    io.to(`group:${payload.id}`).emit("message:new", outgoing);

    const senderIdStr = String(socket.userId);
    const recipientIds = group.members
        .filter((m) => m.userId.toString() !== senderIdStr && !m.isMuted)
        .map((m) => m.userId);
    for (const recipientId of recipientIds) {
        notifyChatMessage({
            kind: "group",
            sender: socket.userId,
            recipient: recipientId,
            groupId: payload.id,
            groupName: group.name,
            preview:
                payload.messageType === "text"
                    ? payload.content.slice(0, 100)
                    : "📷 Image",
            senderName: outgoing.sender.name,
        });
    }

    // Deliver to each member's personal room so their sidebar/unread badge
    // updates in real time even when they're not in the group room.
    for (const m of group.members) {
        if (m.userId.toString() === senderIdStr) continue;
        io.to(`user:${String(m.userId)}`).emit("message:new", outgoing);
    }

    ack?.({ ok: true, message: outgoing });
}

function handleTyping(io, socket, payload) {
    const info = userInfoCache.get(socket.userId) || { name: "", avatar: "" };
    const room = payload.kind === "dm" ? `dm:${payload.id}` : `group:${payload.id}`;
    const evt = payload.isTyping ? "typing:start" : "typing:stop";
        socket.to(room).emit(evt, {
            userId: socket.userId,
            userName: info.name,
            userAvatar: info.avatar,
            ...(payload.kind === "dm"
                ? { conversationId: payload.id }
                : { groupId: payload.id }),
        });
}

async function handleRead(io, socket, payload) {
    if (payload.kind === "dm") {
        await DMConversation.findOneAndUpdate(
            { _id: payload.id, "participants.userId": socket.userId },
            {
                $set: {
                    "participants.$.lastReadAt": new Date(),
                    "participants.$.unreadCount": 0,
                },
            },
        );
    } else {
        await GroupChat.findOneAndUpdate(
            { _id: payload.id, "members.userId": socket.userId },
            {
                $set: {
                    "members.$.lastReadAt": new Date(),
                    "members.$.unreadCount": 0,
                },
            },
        );
    }
    const room = payload.type === "dm" ? `dm:${payload.id}` : `group:${payload.id}`;
    socket.to(room).emit("read:receipt", {
        userId: socket.userId,
        ...(payload.type === "dm"
            ? { conversationId: payload.id }
            : { groupId: payload.id }),
    });
}

export function registerSocket(io) {
    io.on("connection", (socket) => {
        const userId = socket.userId;

        // Personal room: every socket joins `user:<id>` so the sidebar can
        // receive `message:new` even when the user is NOT in the conversation
        // or group room (e.g. they're on another page, not the chat screen).
        socket.join(`user:${userId}`);

        // ━━━ Incoming events — registered immediately so an emit arriving
        // right after "connect" (before the async room-joining below finishes)
        // is never dropped. ━━━
        socket.on("message:send", (payload, ack) => {
            let parsed;
            try {
                parsed = messageSendSchema.parse(payload);
            } catch (err) {
                return ack?.({ ok: false, error: "Invalid message payload" });
            }
            if (parsed.kind === "dm") {
                handleDmSend(io, socket, parsed, ack).catch(() =>
                    ack?.({ ok: false, error: "Send failed" }),
                );
            } else {
                handleGroupSend(io, socket, parsed, ack).catch(() =>
                    ack?.({ ok: false, error: "Send failed" }),
                );
            }
        });

        socket.on("typing:start", (payload) => {
            const parsed = typingSchema.safeParse({ ...payload, isTyping: true });
            if (parsed.success) handleTyping(io, socket, parsed.data);
        });
        socket.on("typing:stop", (payload) => {
            const parsed = typingSchema.safeParse({ ...payload, isTyping: false });
            if (parsed.success) handleTyping(io, socket, parsed.data);
        });

        socket.on("read:mark", (payload) => {
            const parsed = readSchema.safeParse(payload);
            if (parsed.success) {
                handleRead(io, socket, parsed.data).catch(() => {});
            }
        });

        // Client (e.g. the DM/Group list) can ask for a fresh presence snapshot
        // at any time — useful when it mounts after the initial connect snapshot.
        socket.on("presence:request", () => {
            sendPresenceSnapshots(socket, userId).catch(() => {});
        });

        // ━━━ Async setup: load rooms, join them, broadcast presence ━━━
        let dmRooms = [];
        let groupRooms = [];
        (async () => {
            const user = await ensureUserInfo(userId);

            const [conversations, groups] = await Promise.all([
                DMConversation.find({
                    "participants.userId": userId,
                    isActive: true,
                }).lean(),
                GroupChat.find({
                    "members.userId": userId,
                    isActive: true,
                }).lean(),
            ]);

            for (const c of conversations) {
                const room = `dm:${c._id}`;
                socket.join(room);
                const other = c.participants.find(
                    (p) => p.userId.toString() !== userId,
                );
                dmRooms.push({
                    room,
                    id: String(c._id),
                    otherId: other ? String(other.userId) : null,
                    isDm: true,
                });
            }
            for (const g of groups) {
                const room = `group:${g._id}`;
                socket.join(room);
                groupRooms.push({
                    room,
                    id: String(g._id),
                    memberIds: g.members.map((m) => String(m.userId)),
                    isDm: false,
                });
            }

            const wentOnline = markOnline(userId);

            if (wentOnline) {
                for (const r of [...dmRooms, ...groupRooms]) {
                    socket.to(r.room).emit("presence:online", {
                        user,
                        ...(r.isDm
                            ? { conversationId: r.id }
                            : { groupId: r.id }),
                    });
                }
            }

            // Initial presence snapshot for this socket (DMs included now).
            await sendPresenceSnapshots(socket, userId);
        })();

        // ━━━ Disconnect (grace period to avoid refresh flicker) ━━━
        socket.on("disconnect", () => {
            setTimeout(() => {
                const fullyOffline = markOffline(userId);
                if (fullyOffline) {
                    const info =
                        userInfoCache.get(userId) || {
                            id: userId,
                            name: "",
                            username: "",
                            avatar: "",
                        };
                    for (const r of [...dmRooms, ...groupRooms]) {
                        socket.to(r.room).emit("presence:offline", {
                            user: info,
                            ...(r.isDm
                                ? { conversationId: r.id }
                                : { groupId: r.id }),
                        });
                    }
                }
            }, 1500);
        });
    });
}

/**
 * Emit the current presence snapshot for every DM/group the user belongs to.
 * DMs report only the *other* participant (never the user themselves); groups
 * report every other online member. Called on connect and on presence:request.
 */
async function sendPresenceSnapshots(socket, userId) {
    const [conversations, groups] = await Promise.all([
        DMConversation.find({
            "participants.userId": userId,
            isActive: true,
        }).lean(),
        GroupChat.find({ "members.userId": userId, isActive: true }).lean(),
    ]);

    for (const c of conversations) {
        const other = c.participants.find(
            (p) => p.userId.toString() !== userId,
        );
        const otherId = other ? String(other.userId) : null;
        const online =
            otherId && isOnline(otherId) && userInfoCache.get(otherId)
                ? [userInfoCache.get(otherId)]
                : [];
        socket.emit("presence:snapshot", {
            conversationId: String(c._id),
            online,
        });
    }

    for (const g of groups) {
        const online = g.members
            .map((m) => String(m.userId))
            .filter((id) => id !== String(userId) && isOnline(id))
            .map((id) => userInfoCache.get(id))
            .filter(Boolean);
        socket.emit("presence:snapshot", { groupId: String(g._id), online });
    }
}
