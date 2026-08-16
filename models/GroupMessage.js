import mongoose from 'mongoose'
import reactionSchema from './shared/reactionSchema'
 
const groupMessageSchema = new mongoose.Schema({ 
  groupId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'GroupChat', 
    required: true 
  }, 
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }, 
  content: { 
    type: String, 
    trim: true, 
    maxlength: 2000, 
    default: '' 
  }, 
  type: { 
    type: String, 
    enum: [ 
      'text',       // normal message 
      'image',      // image message 
      'system'      // "Ayush added Priya to the group" 
     ], 
    default: 'text' 
  }, 
  imageUrl: { 
    type: String, 
    default: ''    // For image messages 
  }, 
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupMessage',
    default: null
  }, 
  reactions: { 
    type: [reactionSchema], 
    default: [] 
  }, 
  isDeleted: { 
    type: Boolean, 
    default: false  // soft delete — shows "Message deleted" 
  }, 
  deletedAt: { type: Date, default: null } 
 
}, { timestamps: true }) 
 
// ━━━ Indexes ━━━ 
// Main query: get messages for a group, newest first 
groupMessageSchema.index({ groupId: 1, createdAt: -1 }) 
// Cursor-based pagination 
groupMessageSchema.index({ groupId: 1, _id: -1 }) 
// Sender's messages 
groupMessageSchema.index({ sender: 1, createdAt: -1 }) 
 
export default mongoose.models.GroupMessage || 
  mongoose.model('GroupMessage', groupMessageSchema) 
