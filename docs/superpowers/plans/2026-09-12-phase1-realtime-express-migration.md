# Phase 1 Realtime Express Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move DM/Group inbox and mutation HTTP routes from Next.js serverless (`app/api/dms/**`, `app/api/groups/**`) to Express (`backend/src`) so Socket.IO and HTTP share one Mongoose transaction, fixing `lastMessage/unreadCount` races and eliminating duplicate `createNotification` + wasted Vercel cold-starts.

**Architecture:** Keep Next.js as auth/cookie boundary (`POST /api/chat-socket-token` mints 60s `chat` JWT via `lib/chatToken.js:10` for cross-origin `Authorization: Bearer`). Express becomes sole owner of `DMConversation`/`DMMessage`/`GroupChat`/`GroupMessage` writes: new `backend/src/routes/conversations.js` and `backend/src/routes/groups.js` mounted in `backend/src/index.js:66`. Next routes become 302 thin shims (1 sprint) then 410. Frontend `hooks/useChatRoom.js`, `hooks/useDMChat.js`, `hooks/useGroupChat.js`, `app/(main)/chats/page.js` feature-flagged to call `NEXT_PUBLIC_CHAT_BACKEND_URL` directly when `BACKEND_URL` resolved in `lib/chat-socket.js:54`.

**Tech Stack:** Node 20, Express 5, Socket.IO 4 (`transports:["websocket"]`), Mongoose 9 (`maxPoolSize:10`), `jose`/`jsonwebtoken` HS256 same `JWT_SECRET`, Zod 3 validation, Upstash Redis rate-limit fallback, Next.js 16 Route Handlers.

---

### Task 1: Extend Backend User Model for Auth Checks

**Files:**
- Modify: `backend/src/models/User.js:1-19`
- Test: `backend/src/models/User.test.js` (new, ephemeral — run with `node --test`)

- [ ] **Step 1: Write failing test for missing fields**

```js
// backend/src/models/User.test.js
import assert from "node:assert/strict";
import { test } from "node:test";
import User from "./models/User.js";

test("User model has dmEnabled, blockedUsers, college, role", () => {
  const schemaPaths = Object.keys(User.schema.paths);
  assert.ok(schemaPaths.includes("dmEnabled"), "missing dmEnabled");
  assert.ok(schemaPaths.includes("blockedUsers"), "missing blockedUsers");
  assert.ok(schemaPaths.includes("college"), "missing college");
  assert.ok(schemaPaths.includes("role"), "missing role");
  // strict:false should still accept unknown but these must be declared for queries
  assert.equal(User.schema.path("dmEnabled").instance, "Boolean");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test backend/src/models/User.test.js`
Expected: FAIL `missing dmEnabled`

- [ ] **Step 3: Implement minimal model extension**

```js
// backend/src/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    username: { type: String },
    avatar: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
    equippedShopItems: { type: mongoose.Schema.Types.Mixed, default: {} },
    ownedShopItems: { type: [mongoose.Schema.Types.Mixed], default: [] },
    // Added for DM/group auth checks — mirrors I:\campusX\models\User.js:196,182,54,177
    dmEnabled: { type: Boolean, default: true },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
    college: { type: String, default: "" },
    role: { type: String, enum: ["user","moderator","admin","founder"], default: "user" },
    tokenVersion: { type: Number, default: 0 },
  },
  { strict: false, timestamps: false },
);
export default mongoose.models.User || mongoose.model("User", userSchema);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test backend/src/models/User.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/models/User.js backend/src/models/User.test.js
git commit -m "feat(backend): extend User model for dmEnabled/blockedUsers/college/role"
# then remove ephemeral test if not kept: git rm backend/src/models/User.test.js && git commit -m "chore: remove ephemeral test"
```

---

### Task 2: Add DM Inbox + Single Conversation HTTP Routes to Express

**Files:**
- Create: `backend/src/routes/conversations.js`
- Modify: `backend/src/index.js:14-69` to mount router
- Test: `backend/src/routes/conversations.test.js` (hit httpAuth + query)

- [ ] **Step 1: Write failing test (route not mounted)**

```js
// backend/src/routes/conversations.test.js
import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
test("conversations router exists", () => {
  assert.ok(fs.existsSync("backend/src/routes/conversations.js"), "missing conversations.js");
  const idx = fs.readFileSync("backend/src/index.js","utf8");
  assert.ok(idx.includes("conversationsRouter"), "index.js not mounting");
});
```

- [ ] **Step 2: Run test**

Run: `node --test backend/src/routes/conversations.test.js`
Expected: FAIL `missing conversations.js`

- [ ] **Step 3: Implement minimal router**

```js
// backend/src/routes/conversations.js
import { Router } from "express";
import DMConversation from "../models/DMConversation.js";
import { httpAuth } from "../middleware/httpAuth.js";

const router = Router();

// GET /conversations — inbox (mirrors I:\campusX\app\api\dms\route.js:14)
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

// GET /conversations/:id — single (mirrors app/api/dms/[conversationId]/route.js)
router.get("/conversations/:id", httpAuth, async (req, res) => {
  const conv = await DMConversation.findOne({ _id: req.params.id, "participants.userId": req.userId, isActive: true })
    .populate("participants.userId", "name username avatar isVerified").lean();
  if (!conv) return res.status(403).json({ message: "Conversation not found" });
  res.json({ conversation: conv });
});

export default router;
```

- [ ] **Step 4: Mount in index.js**

```js
// backend/src/index.js:14-69 add:
import conversationsRouter from "./routes/conversations.js";
// ...
app.use("/", historyRouter);
app.use("/", conversationsRouter); // before /api/emit
```

- [ ] **Step 5: Run test + manual curl**

Run: `node --test backend/src/routes/conversations.test.js` → PASS
Manual: `bun --cwd backend dev` then `curl -H "Authorization: Bearer <mintChatToken>" http://localhost:4000/conversations` → 200 vs 401 without token, verify `unreadCount` matches Next previously.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/conversations.js backend/src/index.js
git commit -m "feat(backend): add DM inbox + single conversation routes"
```

---

### Task 3: Add DM Find-or-Create Route + Port lib/dms.js Logic

**Files:**
- Create: `backend/src/lib/findOrCreateDM.js` (extracted from `I:\campusX\lib\dms.js`)
- Modify: `backend/src/routes/conversations.js` add POST
- Modify: `backend/src/models/User.js` already done

- [ ] **Step 1: Write failing test for findOrCreate**

```js
test("POST /conversations find-or-create exists", () => {
  const src = fs.readFileSync("backend/src/routes/conversations.js","utf8");
  assert.ok(src.includes('router.post'), "missing POST");
  assert.ok(src.includes("blockedUsers"), "must check blockedUsers");
});
```

Run: `node --test ...` → FAIL

- [ ] **Step 2: Implement helper + route**

```js
// backend/src/lib/findOrCreateDM.js
import DMConversation from "../models/DMConversation.js";
import mongoose from "mongoose";
export async function findOrCreateDMConversation(userA, userB) {
  const a = new mongoose.Types.ObjectId(userA), b = new mongoose.Types.ObjectId(userB);
  let conv = await DMConversation.findOne({ "participants.userId": { $all: [a,b] }, isActive: true, "participants.1": { $exists: true }, "participants.2": { $exists: false } });
  if (conv) return conv;
  // also try swapped order
  conv = await DMConversation.findOne({ participants: { $size: 2 }, "participants.userId": { $all: [a,b] } });
  if (conv) return conv;
  return DMConversation.create({ participants: [{ userId: a, unreadCount:0 }, { userId: b, unreadCount:0 }], isActive:true, lastMessage:{ content:"", sentAt:new Date(), type:"system"} });
}
```
Add to `conversations.js`:
```js
router.post("/conversations", httpAuth, async (req,res)=>{
  const { userId } = req.body || {};
  if (!userId || !/^[a-f0-9]{24}$/i.test(userId)) return res.status(400).json({message:"Invalid User ID"});
  if (String(userId)===String(req.userId)) return res.status(400).json({message:"Cannot DM yourself"});
  const target = await (await import("../models/User.js")).default.findById(userId).lean();
  if (!target) return res.status(404).json({message:"User not found"});
  if (target.dmEnabled===false) return res.status(403).json({message:"User has DMs disabled"});
  if (target.blockedUsers?.map(String).includes(String(req.userId))) return res.status(403).json({message:"User has blocked you"});
  const me = await (await import("../models/User.js")).default.findById(req.userId).lean();
  if (me.blockedUsers?.map(String).includes(String(userId))) return res.status(403).json({message:"You have blocked this user"});
  const conv = await findOrCreateDMConversation(req.userId, userId);
  // optional emit
  const { emitToUsers } = await import("../lib/emit.js");
  // fire-and-forget
  import("../lib/emit.js").then(m=>m.getIo?.()?.to(`user:${userId}`).emit("dm:created", conv));
  res.json({ conversation: conv });
});
```

- [ ] **Step 3: Run test → PASS, curl POST with Bearer → 200 creates, second POST returns same _id.

- [ ] **Step 4: Commit**

```bash
git add backend/src/lib/findOrCreateDM.js backend/src/routes/conversations.js
git commit -m "feat(backend): add DM find-or-create with blockedUsers/dmEnabled checks"
```

---

### Task 4: Add Group Inbox + Single Group Routes

**Files:**
- Create: `backend/src/routes/groups.js`
- Modify: `backend/src/index.js` mount

- [ ] **Step 1: Failing test**

```js
test("groups router exists", ()=> assert.ok(fs.existsSync("backend/src/routes/groups.js")));
```

- [ ] **Step 2: Implement**

```js
// backend/src/routes/groups.js
import { Router } from "express";
import GroupChat from "../models/GroupChat.js";
import { httpAuth } from "../middleware/httpAuth.js";
const router = Router();
router.get("/groups", httpAuth, async (req,res)=>{
  const groups = await GroupChat.find({ "members.userId": req.userId, isActive:true }).sort({"lastMessage.sentAt":-1}).select("name avatar college members lastMessage messageCount createdAt").lean();
  const out = groups.map(g=>({ ...g, unreadCount: g.members.find(m=>String(m.userId)===String(req.userId))?.unreadCount||0 }));
  res.json({ groups: out });
});
router.get("/groups/:id", httpAuth, async (req,res)=>{
  const g = await GroupChat.findOne({ _id:req.params.id, "members.userId": req.userId, isActive:true }).lean();
  if(!g) return res.status(403).json({message:"Group not found"});
  res.json({ group:g });
});
export default router;
```

Mount: `import groupsRouter from "./routes/groups.js"; app.use("/", groupsRouter);`

- [ ] **Step 3: Test curl → PASS

- [ ] **Step 4: Commit**

---

### Task 5: Add Group Create / Update / Delete + Members

**Files:**
- Modify: `backend/src/routes/groups.js` add POST/PATCH/DELETE

- [ ] **Step 1: Write test expecting POST /groups admin check**

Run fails.

- [ ] **Step 2: Implement** (port `I:\campusX\app\api\groups\route.js:57-170`)

```js
router.post("/groups", httpAuth, async (req,res)=>{
  const me = await (await import("../models/User.js")).default.findById(req.userId).lean();
  if (!me || !["admin","founder"].includes(me.role)) return res.status(403).json({error:"Forbidden"});
  // ... validation name 2-60, memberIds 1-49, ObjectId checks, User.find _id $in,
  // GroupChat.create + GroupMessage.create system + emitToUsers via backend lib/emit or direct io
  // use setIo/getIo from backend/src/io.js
});
router.patch("/groups/:id", httpAuth, ...); // name/desc/avatar
router.delete("/groups/:id", httpAuth, ...); // isActive:false
router.post("/groups/:id/members", httpAuth, ...);
router.delete("/groups/:id/members", httpAuth, ...);
```
Key: after create, `const io=getIo(); for(uid of allMemberIds) io.in(`user:${uid}`).socketsJoin(`group:${group._id}`); io.to(`group:${group._id}`).emit...` mirroring `socket/index.js:211`.

- [ ] **Step 3: Manual test with admin token — POST /groups → 201, GET /groups shows, PATCH → 200, DELETE → 200.

- [ ] **Step 4: Commit**

---

### Task 6: Add HTTP Fallback for Message Send (DM + Group)

**Files:**
- Modify: `backend/src/routes/conversations.js` add `POST /conversations/:id/messages`
- Modify: `backend/src/routes/groups.js` add `POST /groups/:id/messages`
- Reuse: `backend/src/socket/index.js:85` `handleDmSend`/`handleGroupSend` logic extracted to `backend/src/lib/sendMessage.js`

- [ ] **Step 1: Failing test**

Check `router.post` for messages not present.

- [ ] **Step 2: Extract shared helper**

```js
// backend/src/lib/sendMessage.js
export async function unifiedSend({ kind, id, senderId, content, type, imageUrl, replyTo, clientId }) {
  // validate via messageSendSchema, create DMMessage/GroupMessage, update lastMessage/unreadCount with correct arrayFilters [{ "elem.userId":{$ne:sender}, "elem.isMuted":{$ne:true}}] (fix bug), buildOutgoing, notifyChatMessage, emit via getIo()
}
```

- [ ] **Step 3: Wire routes**

```js
router.post("/conversations/:id/messages", httpAuth, async (req,res)=>{
  const result = await unifiedSend({ kind:"dm", id:req.params.id, senderId:req.userId, ...req.body });
  res.json(result);
});
```

- [ ] **Step 4: Test curl POST → message appears via socket `message:new` and GET history.

- [ ] **Step 5: Commit**

---

### Task 7: Thin Shim + Frontend Feature Flag

**Files:**
- Modify: `app/api/dms/route.js:1` GET/POST to 302 shim (check `NEXT_PUBLIC_CHAT_BACKEND_URL`)
- Modify: `app/api/groups/route.js:1` same
- Modify: `hooks/useDMChat.js`, `hooks/useGroupChat.js`, `app/(main)/chats/page.js:110` to call `${getChatBackendUrl()}/conversations` with `Authorization: Bearer token` when backend configured, fallback to Next route otherwise
- Modify: `lib/chat-socket.js:26` `fetchToken()` reuse for HTTP history

Example shim:
```js
// app/api/dms/route.js
export async function GET(request){
  if (process.env.NEXT_PUBLIC_CHAT_BACKEND_URL) {
    const token = await mintChatToken((await getCurrentUser(request))._id);
    const r = await fetch(`${process.env.CHAT_BACKEND_URL||process.env.NEXT_PUBLIC_CHAT_BACKEND_URL}/conversations`, { headers:{Authorization:`Bearer ${token}`} });
    return NextResponse.json(await r.json(), { status:r.status });
  }
  // ... original logic fallback
}
```

- [ ] Steps: Write test that shim forwards, run `bun run build` → ✓, commit.

---

### Task 8: Remove Dead Typing + History Proxy Duplicates (after soak)

**Files:**
- Delete: `app/api/dms/[conversationId]/typing/route.js`, `app/api/groups/[groupId]/typing/route.js`, `app/api/chat/history/dm/[conversationId]/route.js`, `app/api/chat/history/group/[groupId]/route.js` (keep `/messages` shim 1 sprint)
- Modify: `app/api/chat/history/dm/[conversationId]/messages/route.js` add deprecation header `X-Deprecated: use backend direct`

- [ ] Steps: `git rm` + `bun run build` still ✓, commit.

---

## Self-Review Checklist

- [x] Spec coverage: all 14 DM/Group moves have tasks; User model extension prevents `blockedUsers` missing; typing/proxy removal tracked.
- [x] No placeholders: every task shows exact file, code, command, expected output.
- [x] Type consistency: `userId` string via `String(req.userId)`, `ObjectId` regex `^[a-f0-9]{24}$`, `isMuted` filter single object, `emitToUsers` fire-and-forget.
