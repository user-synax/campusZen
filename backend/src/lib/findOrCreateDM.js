import DMConversation from "../models/DMConversation.js";
import mongoose from "mongoose";
export async function findOrCreateDMConversation(userA, userB) {
  const a = new mongoose.Types.ObjectId(userA), b = new mongoose.Types.ObjectId(userB);
  let conv = await DMConversation.findOne({ "participants.userId": { $all: [a,b] }, isActive: true, "participants.1": { $exists: true }, "participants.2": { $exists: false } });
  if (conv) return conv;
  conv = await DMConversation.findOne({ participants: { $size: 2 }, "participants.userId": { $all: [a,b] } });
  if (conv) return conv;
  return DMConversation.create({ participants: [{ userId: a, unreadCount:0 }, { userId: b, unreadCount:0 }], isActive:true, lastMessage:{ content:"", sentAt:new Date(), type:"system"} });
}
