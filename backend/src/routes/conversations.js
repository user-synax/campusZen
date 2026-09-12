import { Router } from "express";
import DMConversation from "../models/DMConversation.js";
import User from "../models/User.js";
import { httpAuth } from "../middleware/httpAuth.js";
import { findOrCreateDMConversation } from "../lib/findOrCreateDM.js";
import { getIo } from "../io.js";
import { socketLimits } from "../middleware/rateLimit.js";
import { sendMessage } from "../lib/sendMessage.js";
const router = Router();
router.get("/conversations", httpAuth, async (req, res) => {
  const conversations = await DMConversation.find({ "participants.userId": req.userId, isActive: true })
    .sort({ "lastMessage.sentAt": -1 })
    .populate("participants.userId", "name username avatar isVerified")
    .lean();
  const out = conversations.map(c => {
    const me = c.participants.find(p => String(p.userId._id) === String(req.userId));
    const other = c.participants.find(p => String(p.userId._id) !== String(req.userId))?.userId;
    return { ...c, otherParticipant: other, unreadCount: me?.unreadCount || 0, isMuted: me?.isMuted || false };
  });
  res.json({ conversations: out });
});
router.get("/conversations/:id", httpAuth, async (req, res) => {
  const conv = await DMConversation.findOne({ _id: req.params.id, "participants.userId": req.userId, isActive: true })
    .populate("participants.userId", "name username avatar isVerified").lean();
  if (!conv) return res.status(403).json({ message: "Conversation not found" });
  res.json({ conversation: conv });
});
router.post("/conversations", httpAuth, async (req, res) => {
  const { userId } = req.body || {};
  if (!userId || !/^[a-f0-9]{24}$/i.test(String(userId))) return res.status(400).json({ message: "Invalid User ID" });
  if (String(userId) === String(req.userId)) return res.status(400).json({ message: "Cannot DM yourself" });
  const target = await User.findById(userId).lean();
  if (!target) return res.status(404).json({ message: "User not found" });
  if (target.dmEnabled === false) return res.status(403).json({ message: "User has DMs disabled" });
  if (target.blockedUsers?.map(String).includes(String(req.userId))) return res.status(403).json({ message: "User has blocked you" });
  const me = await User.findById(req.userId).lean();
  if (me?.blockedUsers?.map(String).includes(String(userId))) return res.status(403).json({ message: "You have blocked this user" });
  const conversation = await findOrCreateDMConversation(req.userId, userId);
  try {
    const io = getIo();
    io.to(`user:${String(userId)}`).emit("dm:created", conversation);
    io.to(`user:${String(req.userId)}`).emit("dm:created", conversation);
  } catch (_) {}
  res.json({ conversation });
});
router.post("/conversations/:id/messages", httpAuth, async (req, res) => {
  try {
    if (!socketLimits.messageSend(req.userId)) {
      return res.status(429).json({ error: "Too many requests", message: "Sending too fast — slow down" });
    }
    const { content, type, imageUrl, replyTo, clientId } = req.body || {};
    const outgoing = await sendMessage({
      kind: "dm",
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
    console.error("[DM Messages POST]", err.message);
    return res.status(500).json({ error: "Failed to send message" });
  }
});
export default router;
