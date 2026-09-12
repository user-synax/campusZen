import mongoose from "mongoose";
import DMConversation from "../models/DMConversation.js";
import DMMessage from "../models/DMMessage.js";
import GroupChat from "../models/GroupChat.js";
import GroupMessage from "../models/GroupMessage.js";
import User from "../models/User.js";
import { resolveBubbleTheme } from "./bubbleTheme.js";
import { notifyChatMessage } from "./notify.js";
import { getIo } from "../io.js";
import { messageSendSchema } from "../validation/chat.js";

// mirrors lib/sanitize.js:sanitizeText and groups.js local helper
function sanitizeText(input) {
  if (!input || typeof input !== "string") return "";
  let clean = input.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
  clean = clean.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "");
  clean = clean.replace(/<[^>]*>?/gm, "");
  clean = clean
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
  return clean.trim();
}

async function buildOutgoing(messageDoc, { clientId, conversationId, groupId }) {
  await messageDoc.populate({
    path: "replyTo",
    populate: { path: "sender", select: "name username" },
  });
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

/**
 * Unified HTTP + socket message sender.
 * Validates via Zod, creates DMMessage/GroupMessage, updates lastMessage/unreadCount
 * with CORRECT single-object arrayFilters, builds outgoing (populate replyTo + bubbleTheme),
 * notifies via notifyChatMessage, and emits via getIo() to dm:/group: + user: rooms.
 *
 * @param {object} opts
 * @param {"dm"|"group"} opts.kind
 * @param {string} opts.id - conversationId or groupId
 * @param {string} opts.senderId - authenticated user id
 * @param {string} [opts.content]
 * @param {"text"|"image"} [opts.type]
 * @param {string} [opts.imageUrl]
 * @param {string|null} [opts.replyTo]
 * @param {string} [opts.clientId]
 * @returns {Promise<object>} outgoing message payload
 */
export async function sendMessage({ kind, id, senderId, content, type, imageUrl, replyTo, clientId }) {
  let parsed;
  try {
    parsed = messageSendSchema.parse({
      kind,
      id,
      content: content ?? "",
      type: type ?? "text",
      imageUrl: imageUrl ?? "",
      replyTo: replyTo ?? null,
      clientId,
    });
  } catch (err) {
    const msg = err.errors?.[0]?.message || err.issues?.[0]?.message || "Invalid message payload";
    const error = new Error(msg);
    error.status = 400;
    throw error;
  }

  if (parsed.kind === "dm") {
    const conversation = await DMConversation.findOne({
      _id: parsed.id,
      "participants.userId": senderId,
      isActive: true,
    });
    if (!conversation) {
      const error = new Error("Conversation not found");
      error.status = 403;
      throw error;
    }

    const sanitizedContent = parsed.type === "text" ? sanitizeText(parsed.content) : "";

    const msg = await DMMessage.create({
      conversationId: parsed.id,
      sender: senderId,
      content: parsed.type === "text" ? sanitizedContent : "",
      type: parsed.type,
      imageUrl: parsed.type === "image" ? parsed.imageUrl : "",
      replyTo: parsed.replyTo || null,
    });

    const outgoing = await buildOutgoing(msg, {
      clientId: parsed.clientId,
      conversationId: parsed.id,
    });

    const lastMessage = {
      content: parsed.type === "text" ? sanitizedContent.slice(0, 60) : "📷 Image",
      senderName: outgoing.sender.name,
      sentAt: new Date(),
      type: parsed.type,
    };

    await DMConversation.findByIdAndUpdate(
      parsed.id,
      {
        lastMessage,
        $inc: {
          messageCount: 1,
          "participants.$[elem].unreadCount": 1,
        },
      },
      {
        arrayFilters: [
          {
            "elem.userId": { $ne: new mongoose.Types.ObjectId(senderId) },
            "elem.isMuted": { $ne: true },
          },
        ],
      }
    );

    // Emit — ensure every participant's socket is in the conversation room,
    // then single emit to the room (mirrors socket/index.js handleDmSend).
    try {
      const io = getIo();
      for (const p of conversation.participants) {
        io.in(`user:${String(p.userId)}`).socketsJoin(`dm:${parsed.id}`);
      }
      io.to(`dm:${parsed.id}`).emit("message:new", outgoing);
    } catch (_) {
      // getIo may throw before server start; best-effort only
    }

    const other = conversation.participants.find((p) => String(p.userId) !== String(senderId));
    if (other && !other.isMuted) {
      notifyChatMessage({
        kind: "dm",
        sender: senderId,
        recipient: other.userId,
        convId: parsed.id,
        preview: parsed.type === "text" ? sanitizedContent.slice(0, 100) : "📷 Image",
        senderName: outgoing.sender.name,
      });
    }

    return outgoing;
  }

  // kind === "group"
  const group = await GroupChat.findOne({
    _id: parsed.id,
    "members.userId": senderId,
    isActive: true,
  });
  if (!group) {
    const error = new Error("Group not found or not a member");
    error.status = 403;
    throw error;
  }

  const sanitizedContent = parsed.type === "text" ? sanitizeText(parsed.content) : "";

  const msg = await GroupMessage.create({
    groupId: parsed.id,
    sender: senderId,
    content: parsed.type === "text" ? sanitizedContent : "",
    type: parsed.type,
    imageUrl: parsed.type === "image" ? parsed.imageUrl : "",
    replyTo: parsed.replyTo || null,
  });

  const outgoing = await buildOutgoing(msg, {
    clientId: parsed.clientId,
    groupId: parsed.id,
  });

  const lastMessage = {
    content: parsed.type === "text" ? sanitizedContent.slice(0, 60) : "📷 Image",
    senderName: outgoing.sender.name,
    sentAt: new Date(),
    type: parsed.type,
  };

  await GroupChat.findByIdAndUpdate(
    parsed.id,
    {
      lastMessage,
      $inc: {
        messageCount: 1,
        "members.$[elem].unreadCount": 1,
      },
    },
    {
      arrayFilters: [
        {
          "elem.userId": { $ne: new mongoose.Types.ObjectId(senderId) },
          "elem.isMuted": { $ne: true },
        },
      ],
    }
  );

  // Single emit to group room + fan-out to member user rooms (sidebar/unread badge)
  // Mirrors socket/index.js handleGroupSend
  try {
    const io = getIo();
    for (const m of group.members) {
      io.in(`user:${String(m.userId)}`).socketsJoin(`group:${parsed.id}`);
    }
    io.to(`group:${parsed.id}`).emit("message:new", outgoing);

    const senderIdStr = String(senderId);
    for (const m of group.members) {
      if (String(m.userId) === senderIdStr) continue;
      io.to(`user:${String(m.userId)}`).emit("message:new", outgoing);
    }
  } catch (_) {}

  const senderIdStr = String(senderId);
  const recipientIds = group.members
    .filter((m) => String(m.userId) !== senderIdStr && !m.isMuted)
    .map((m) => m.userId);
  for (const recipientId of recipientIds) {
    notifyChatMessage({
      kind: "group",
      sender: senderId,
      recipient: recipientId,
      groupId: parsed.id,
      groupName: group.name,
      preview: parsed.type === "text" ? sanitizedContent.slice(0, 100) : "📷 Image",
      senderName: outgoing.sender.name,
    });
  }

  return outgoing;
}

// Alias for plan's naming — both supported
export const unifiedSend = sendMessage;
export default sendMessage;
