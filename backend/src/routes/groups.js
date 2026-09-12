import { Router } from "express";
import mongoose from "mongoose";
import GroupChat from "../models/GroupChat.js";
import GroupMessage from "../models/GroupMessage.js";
import User from "../models/User.js";
import { httpAuth } from "../middleware/httpAuth.js";
import { getIo } from "../io.js";
import { socketLimits } from "../middleware/rateLimit.js";
import { sendMessage } from "../lib/sendMessage.js";

const router = Router();

// ── helpers ────────────────────────────────────────────────────────────────

// sanitizeText — mirrors lib/sanitize.js:sanitizeText
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

// sanitizeMongoInput — mirrors lib/sanitize.js:sanitizeMongoInput
function sanitizeMongoInput(obj) {
  if (typeof obj === "string") {
    return obj.replace(/^\$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeMongoInput(item));
  }
  if (typeof obj === "object" && obj !== null) {
    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!key.startsWith("$")) {
        clean[key] = sanitizeMongoInput(value);
      }
    }
    return clean;
  }
  return obj;
}

function validateObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function isAdmin(user) {
  if (!user) return false;
  if (["admin", "founder"].includes(user.role)) return true;
  const adminUsernames = ["admin", process.env.NEXT_PUBLIC_FOUNDER_USERNAME].filter(Boolean);
  if (adminUsernames.includes(user.username)) return true;
  return false;
}

// Simple in-memory fixed-window rate limiter for HTTP routes.
// Separate from socketLimits/internalRateLimit — these buckets are per-user.
const buckets = new Map(); // key -> { count, resetAt }

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref();

function tryConsume(key, limit, windowMs) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

function checkRateLimit(req, res, key, limit, windowMs) {
  const bucketKey = `${key}:${req.userId}`;
  if (!tryConsume(bucketKey, limit, windowMs)) {
    const bucket = buckets.get(bucketKey);
    const retryAfter = bucket ? Math.ceil((bucket.resetAt - Date.now()) / 1000) : Math.ceil(windowMs / 1000);
    res.status(429).json({
      error: "Too many requests",
      message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      retryAfter,
    });
    return true; // blocked
  }
  return false;
}

// ── existing GETs (kept) ──────────────────────────────────────────────────
router.get("/groups", httpAuth, async (req, res) => {
  const groups = await GroupChat.find({ "members.userId": req.userId, isActive: true })
    .sort({ "lastMessage.sentAt": -1 })
    .select("name avatar college members lastMessage messageCount createdAt")
    .lean();
  const out = groups.map((g) => ({
    ...g,
    unreadCount: g.members.find((m) => String(m.userId) === String(req.userId))?.unreadCount || 0,
  }));
  res.json({ groups: out });
});

router.get("/groups/:id", httpAuth, async (req, res) => {
  const g = await GroupChat.findOne({ _id: req.params.id, "members.userId": req.userId, isActive: true }).lean();
  if (!g) return res.status(403).json({ message: "Group not found" });
  res.json({ group: g });
});

// ── POST /groups — create group (admin only, 3/day, 5/10min) ─────────────
router.post("/groups", httpAuth, async (req, res) => {
  try {
    // Standard rate limit: 5 per 10 minutes (mirrors group_create_api in Next)
    if (checkRateLimit(req, res, "group_create_api", 5, 10 * 60 * 1000)) return;

    const me = await User.findById(req.userId).lean();
    if (!me || !isAdmin(me)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Business logic rate limit: 3 groups per user per day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await GroupChat.countDocuments({
      createdBy: req.userId,
      createdAt: { $gte: today },
    });
    if (todayCount >= 3) {
      return res.status(429).json({ message: "Max 3 groups per day allowed" });
    }

    // Body validation — express.json already parsed; handle empty/invalid
    let body = req.body;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ message: "Invalid request body" });
    }
    // sanitizeMongoInput mirrors Next route
    body = sanitizeMongoInput(body);
    const { name, description, avatar, memberIds, college } = body;

    // Validate name 2-60
    if (!name || typeof name !== "string" || name.trim().length < 2 || name.trim().length > 60) {
      return res.status(400).json({ message: "Name must be between 2 and 60 characters" });
    }

    // Validate memberIds 1-49
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: "At least one member is required" });
    }
    if (memberIds.length > 49) {
      return res.status(400).json({ message: "Max 49 other members allowed (50 total)" });
    }

    // Validate all memberIds are valid ObjectIds
    const validMemberIds = memberIds.filter((id) => validateObjectId(id));
    if (validMemberIds.length !== memberIds.length) {
      return res.status(400).json({ message: "Invalid User IDs provided" });
    }

    // Verify memberIds exist in DB
    const users = await User.find({ _id: { $in: validMemberIds } }).select("_id").lean();
    if (users.length !== validMemberIds.length) {
      return res.status(400).json({ message: "Some users not found" });
    }

    // Build members array
    const members = [
      { userId: req.userId, role: "admin", joinedAt: new Date() },
      ...validMemberIds.map((id) => ({
        userId: id,
        role: "member",
        joinedAt: new Date(),
      })),
    ];

    // Create group with initial system message
    const group = await GroupChat.create({
      name: sanitizeText(name),
      description: sanitizeText(description || ""),
      avatar: avatar || "",
      college: college || me.college || "",
      members,
      createdBy: req.userId,
      lastMessage: {
        content: `${me.name} created the group`,
        senderName: "System",
        sentAt: new Date(),
        type: "system",
      },
    });

    // Create the system message in GroupMessage
    await GroupMessage.create({
      groupId: group._id,
      sender: req.userId,
      content: `${me.name} created the group`,
      type: "system",
    });

    // Emit group:created to every member's personal room and ensure sockets join group room
    const allMemberIds = [String(req.userId), ...validMemberIds.map(String)];
    try {
      const io = getIo();
      for (const uid of allMemberIds) {
        try {
          io.in(`user:${uid}`).socketsJoin(`group:${group._id}`);
        } catch (_) {}
      }
      for (const uid of allMemberIds) {
        io.to(`user:${uid}`).emit("group:created", group);
      }
    } catch (err) {
      console.error("[realtime] group:created failed:", err.message);
    }

    return res.status(201).json(group);
  } catch (err) {
    console.error("[Groups POST]", err.message);
    return res.status(500).json({ error: "Failed to create group" });
  }
});

// ── PATCH /groups/:id — update group (admin only, 10/min) ────────────────
router.patch("/groups/:id", httpAuth, async (req, res) => {
  try {
    const { id: groupId } = req.params;
    if (!validateObjectId(groupId)) {
      return res.status(400).json({ message: "Invalid Group ID" });
    }

    if (checkRateLimit(req, res, "group_patch_api", 10, 1 * 60 * 1000)) return;

    const group = await GroupChat.findById(groupId);
    if (!group || !group.isActive) {
      return res.status(404).json({ message: "Group not found" });
    }

    const member = group.members.find((m) => m.userId.toString() === String(req.userId));
    if (!member || member.role !== "admin") {
      return res.status(403).json({ message: "Only admins can update group details" });
    }

    let body = req.body;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ message: "Invalid request body" });
    }
    body = sanitizeMongoInput(body);
    const { name, description, avatar } = body;

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 60) {
        return res.status(400).json({ message: "Name must be between 2 and 60 characters" });
      }
      group.name = sanitizeText(name);
    }

    if (description !== undefined) {
      if (typeof description !== "string" || description.length > 200) {
        return res.status(400).json({ message: "Description must be under 200 characters" });
      }
      group.description = sanitizeText(description);
    }

    if (avatar !== undefined) {
      group.avatar = avatar;
    }

    await group.save();

    const populatedGroup = await GroupChat.findById(groupId)
      .populate("members.userId", "name username avatar isVerified")
      .lean();

    try {
      const io = getIo();
      io.to(`group:${groupId}`).emit("group:updated", populatedGroup);
    } catch (err) {
      console.error("[realtime] group:updated failed:", err.message);
    }

    return res.json(populatedGroup);
  } catch (err) {
    console.error("[GroupDetail PATCH]", err.message);
    return res.status(500).json({ error: "Failed to update group" });
  }
});

// ── DELETE /groups/:id — delete group (admin only, 5/10min) ───────────────
router.delete("/groups/:id", httpAuth, async (req, res) => {
  try {
    const { id: groupId } = req.params;
    if (!validateObjectId(groupId)) {
      return res.status(400).json({ message: "Invalid Group ID" });
    }

    if (checkRateLimit(req, res, "group_delete_api", 5, 10 * 60 * 1000)) return;

    const group = await GroupChat.findById(groupId);
    if (!group || !group.isActive) {
      return res.status(404).json({ message: "Group not found" });
    }

    const member = group.members.find((m) => m.userId.toString() === String(req.userId));
    if (!member || member.role !== "admin") {
      return res.status(403).json({ message: "Only admins can delete groups" });
    }

    // Soft delete
    group.isActive = false;
    const currentUser = await User.findById(req.userId).lean();
    const senderName = currentUser?.name || "Someone";
    const deleteMessage = `Group was deleted by ${senderName}`;
    group.lastMessage = {
      content: deleteMessage,
      senderName: "System",
      sentAt: new Date(),
      type: "system",
    };

    await group.save();

    await GroupMessage.create({
      groupId: group._id,
      sender: req.userId,
      content: deleteMessage,
      type: "system",
    });

    try {
      const io = getIo();
      io.to(`group:${groupId}`).emit("group:deleted", {
        groupId: group._id,
        deletedBy: senderName,
      });
    } catch (err) {
      console.error("[realtime] group:deleted failed:", err.message);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("[GroupDetail DELETE]", err.message);
    return res.status(500).json({ error: "Failed to delete group" });
  }
});

// ── POST /groups/:id/members — add member (admin only, 10/min) ────────────
router.post("/groups/:id/members", httpAuth, async (req, res) => {
  try {
    const { id: groupId } = req.params;
    if (!validateObjectId(groupId)) {
      return res.status(400).json({ message: "Invalid Group ID" });
    }

    if (checkRateLimit(req, res, "group_member_add_api", 10, 1 * 60 * 1000)) return;

    const group = await GroupChat.findById(groupId);
    if (!group || !group.isActive) {
      return res.status(404).json({ message: "Group not found" });
    }

    const callerMember = group.members.find((m) => m.userId.toString() === String(req.userId));
    if (!callerMember || callerMember.role !== "admin") {
      return res.status(403).json({ message: "Only admins can add members" });
    }

    let body = req.body;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ message: "Invalid request body" });
    }
    body = sanitizeMongoInput(body);
    const { userId } = body;
    if (!validateObjectId(userId)) {
      return res.status(400).json({ message: "Invalid User ID" });
    }

    const alreadyMember = group.members.some((m) => m.userId.toString() === String(userId));
    if (alreadyMember) {
      return res.status(409).json({ message: "User is already a member of this group" });
    }

    if (group.members.length >= 200) {
      return res.status(400).json({ message: "Group is full (max 200 members)" });
    }

    const userToAdd = await User.findById(userId).select("name username avatar isVerified").lean();
    if (!userToAdd) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentUser = await User.findById(req.userId).lean();
    const newMember = { userId, role: "member", joinedAt: new Date() };
    group.members.push(newMember);

    const systemMessage = `${currentUser?.name || "Someone"} added ${userToAdd.name} to the group`;
    group.lastMessage = {
      content: systemMessage,
      senderName: "System",
      sentAt: new Date(),
      type: "system",
    };

    await group.save();

    await GroupMessage.create({
      groupId: group._id,
      sender: req.userId,
      content: systemMessage,
      type: "system",
    });

    // Notification is best-effort; backend has no Notification model in this service yet
    // so we skip DB notification to avoid cross-service coupling. The frontend
    // will still get realtime events.

    try {
      const io = getIo();
      // Ensure the newly added user's sockets join the group room
      try {
        io.in(`user:${String(userId)}`).socketsJoin(`group:${groupId}`);
      } catch (_) {}
      io.to(`group:${groupId}`).emit("member:added", {
        member: {
          userId: userToAdd._id,
          name: userToAdd.name,
          username: userToAdd.username,
          avatar: userToAdd.avatar,
          isVerified: userToAdd.isVerified,
          role: "member",
          joinedAt: new Date(),
        },
        message: systemMessage,
      });
      io.to(`user:${String(userId)}`).emit("group:joined", group);
    } catch (err) {
      console.error("[realtime] member:added failed:", err.message);
    }

    return res.json({
      success: true,
      member: {
        userId: userToAdd._id,
        name: userToAdd.name,
        username: userToAdd.username,
        avatar: userToAdd.avatar,
        isVerified: userToAdd.isVerified,
      },
    });
  } catch (err) {
    console.error("[GroupMembers POST]", err.message);
    return res.status(500).json({ error: "Failed to add member" });
  }
});

// ── DELETE /groups/:id/members — remove member (admin or self-leave, 10/min)
router.delete("/groups/:id/members", httpAuth, async (req, res) => {
  try {
    const { id: groupId } = req.params;
    if (!validateObjectId(groupId)) {
      return res.status(400).json({ message: "Invalid Group ID" });
    }

    if (checkRateLimit(req, res, "group_member_remove_api", 10, 1 * 60 * 1000)) return;

    const group = await GroupChat.findById(groupId);
    if (!group || !group.isActive) {
      return res.status(404).json({ message: "Group not found" });
    }

    let body = req.body;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ message: "Invalid request body" });
    }
    body = sanitizeMongoInput(body);
    const { userId } = body;
    if (!validateObjectId(userId)) {
      return res.status(400).json({ message: "Invalid User ID" });
    }

    const targetUserIdStr = String(userId);
    const currentUserIdStr = String(req.userId);

    const targetMemberIndex = group.members.findIndex((m) => m.userId.toString() === targetUserIdStr);
    if (targetMemberIndex === -1) {
      return res.status(404).json({ message: "User is not a member of this group" });
    }

    const targetMember = group.members[targetMemberIndex];
    const isSelfLeave = targetUserIdStr === currentUserIdStr;
    const callerMember = group.members.find((m) => m.userId.toString() === currentUserIdStr);

    if (!isSelfLeave) {
      if (!callerMember || callerMember.role !== "admin") {
        return res.status(403).json({ message: "Only admins can remove members" });
      }
      if (targetMember.role === "admin" && String(group.createdBy) === targetUserIdStr) {
        return res.status(400).json({ message: "Group creator cannot be removed" });
      }
    } else {
      if (String(group.createdBy) === currentUserIdStr) {
        return res.status(400).json({ message: "Group creator cannot leave, delete group instead" });
      }
    }

    const currentUser = await User.findById(req.userId).lean();
    const targetUser = await User.findById(userId).select("name username").lean();
    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    group.members.splice(targetMemberIndex, 1);

    const systemMessage = isSelfLeave
      ? `${targetUser.name} left the group`
      : `${currentUser?.name || "Someone"} removed ${targetUser.name}`;

    group.lastMessage = {
      content: systemMessage,
      senderName: "System",
      sentAt: new Date(),
      type: "system",
    };

    await group.save();

    await GroupMessage.create({
      groupId: group._id,
      sender: req.userId,
      content: systemMessage,
      type: "system",
    });

    try {
      const io = getIo();
      io.to(`group:${groupId}`).emit("member:removed", {
        userId: targetUserIdStr,
        message: systemMessage,
      });
      io.to(`user:${targetUserIdStr}`).emit("group:left", { groupId: group._id });
      try {
        io.in(`user:${targetUserIdStr}`).socketsLeave(`group:${groupId}`);
      } catch (_) {}
    } catch (err) {
      console.error("[realtime] member:removed failed:", err.message);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("[GroupMembers DELETE]", err.message);
    return res.status(500).json({ error: "Failed to remove member" });
  }
});

// ── POST /groups/:id/messages — HTTP fallback for message:send (group) ──────
router.post("/groups/:id/messages", httpAuth, async (req, res) => {
  try {
    if (!socketLimits.messageSend(req.userId)) {
      return res.status(429).json({ error: "Too many requests", message: "Sending too fast — slow down" });
    }
    const { content, type, imageUrl, replyTo, clientId } = req.body || {};
    const outgoing = await sendMessage({
      kind: "group",
      id: req.params.id,
      senderId: req.userId,
      content,
      type,
      imageUrl,
      replyTo,
      clientId,
    });
    return res.status(201).json(outgoing);
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ message: err.message });
    if (err.status === 403) return res.status(403).json({ message: err.message });
    console.error("[Group Messages POST]", err.message);
    return res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
