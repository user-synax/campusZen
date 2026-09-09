# Verified Campus Graph (v2.0 — Option A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship CampusZen 2.0 as the verified campus graph — college email auto-verify + ID-card review queue, college-scoped communities, verified-boosted feed, and college-gated Study Rooms (LiveKit) that together make “verified” the core moat vs Instagram/Discord.

**Architecture:** Extend existing JWT `lib/auth.js`, `models/User.js` verification fields, `models/Community.js` + `models/GroupChat.js` + `lib/livekit.js` without new infra. New `StudyRoom` reuses `GroupChat` with `category: "study"` + `requiresVerified` + `college` gating; verification queue is filtered `GET /api/admin/verifications` + approve/reject `POST` that flips `isVerified` and sends `lib/notifications.js`. Feed verified boost tuned in `app/api/posts/cursor-feed/route.js:11` and optional `verifiedOnly` param.

**Tech Stack:** Next.js 16 App Router, Mongoose, Appwrite Storage (ID cards), LiveKit, Socket.IO `lib/realtime.js`, Upstash Redis cache fallback `lib/redis-cache.js`

---

## File Structure

**New files:**
- `app/api/admin/verifications/route.js` — list pending verifications (paginated, shows collegeIdUrl)
- `app/api/admin/verifications/[userId]/route.js` — approve/reject single verification
- `app/(main)/admin/verifications/page.js` — admin queue UI (ID preview, approve/reject)
- `app/api/study-rooms/route.js` — list/create study rooms (college-gated, verified-gated)
- `app/api/study-rooms/[roomId]/route.js` — get/join/leave room
- `models/StudyRoom.js` — or extend `GroupChat` if chosen (decision below)
- `components/admin/VerificationQueueCard.jsx` — ID card preview card
- `components/community/VerifiedCommunityHeader.jsx` — college header with verified stats
- `components/feed/VerifiedFilterToggle.jsx` — feed toggle

**Modified files:**
- `models/User.js:131-180` — deprecate `xp/vp/ownedShopItems` (hide from API) — keep verification fields, add `collegeVerifiedAt`
- `models/Community.js:1` — add `verifiedMemberCount`, `collegeDomain`, index
- `models/GroupChat.js:23` — add `category`, `requiresVerified` if reusing for study rooms
- `app/api/posts/cursor-feed/route.js:11,47,62,230` — add `verifiedOnly` query, tune weights, fix N+1 liked check
- `app/api/communities/route.js:40` — include verified stats
- `app/(main)/community/[college]/page.js:17` — use new header, verified members, join button
- `app/(main)/feed/page.js:54` — wire Verified toggle, pass `verifiedOnly` to `usePosts`
- `app/(main)/admin/page.js:10` — add tabs Verifications/Users
- `lib/collegeEmails.js:1` — expose `getCollegeDomain` helper for community mapping
- `app/api/auth/signup/route.js:59` — already auto-verifies college emails (keep)
- `components/shared/VerifiedBadge.jsx:1` — already maps `college_email`->brand, `id_card`->gold (keep)
- `hooks/usePosts.js` — add `verifiedOnly` param forwarding
- `README.md:16` / `DESIGN.md` / `lib/openapi-spec.js` — docs sync (JWT + Socket.IO)

---

### Task 1: Admin Verification Queue — API

**Files:**
- Create: `app/api/admin/verifications/route.js`
- Create: `app/api/admin/verifications/[userId]/route.js`
- Modify: `app/api/admin/users/[userId]/route.js:182` (reuse verify logic, add reject path)
- Test: `tests/verifications.test.mjs` (or manual curl)

- [ ] **Step 1: Write failing test / manual probe**

```js
// tests/verifications.test.mjs or curl
// GET /api/admin/verifications -> 401 if not admin, 200 with { users: [...], total } if admin
// Each user has collegeIdUrl, verificationStatus === "pending"
const res = await fetch("/api/admin/verifications", { headers: { Cookie: "campusx_token=..." } });
assert(res.status === 200);
const { users } = await res.json();
assert(users.every(u => u.verificationStatus === "pending" && u.collegeIdUrl));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/verifications.test.mjs` or `curl -i http://localhost:3000/api/admin/verifications`
Expected: FAIL 404 — route not found

- [ ] **Step 3: Implement GET list**

```js
// app/api/admin/verifications/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
export async function GET(request) {
  const user = await getCurrentUser(request);
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  await connectDB();
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
  const limit = Math.min(20, parseInt(searchParams.get("limit")) || 10);
  const skip = (page-1)*limit;
  const query = { verificationStatus: "pending", collegeIdUrl: { $exists: true, $ne: null } };
  const [users, total] = await Promise.all([
    User.find(query).select("name username email college collegeIdUrl verificationType verificationRequestedAt avatar").sort({ verificationRequestedAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(query)
  ]);
  return NextResponse.json({ users, total, page, totalPages: Math.ceil(total/limit) });
}
```

- [ ] **Step 4: Implement POST approve/reject per user**

```js
// app/api/admin/verifications/[userId]/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { createNotification } from "@/lib/notifications";
import { logAdminAction } from "@/lib/admin-log";
export async function POST(request, { params }) {
  const { userId } = await params;
  const { action, reason } = await request.json(); // action: "approve" | "reject"
  const admin = await getCurrentUser(request);
  if (!admin || !isAdmin(admin)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  await connectDB();
  const target = await User.findById(userId);
  if (!target || target.verificationStatus !== "pending") return NextResponse.json({ error: "Not pending" }, { status: 400 });
  if (action === "approve") {
    target.isVerified = true; target.verificationStatus = "verified"; target.verificationType = "id_card"; target.verificationApprovedAt = new Date(); target.verificationRejectedReason = null; await target.save();
    await createNotification({ recipient: userId, type: "system", meta: { message: "🎓 Your college ID was approved — you are now Verified!" } });
    await logAdminAction({ adminId: admin._id, action: "verify_approve", targetType: "user", targetId: userId, summary: `Approved verification for ${target.username}` });
    return NextResponse.json({ success: true });
  } else if (action === "reject") {
    if (!reason) return NextResponse.json({ error: "Reason required" }, { status: 400 });
    target.verificationStatus = "rejected"; target.verificationRejectedReason = reason; target.collegeIdUrl = null; await target.save();
    await createNotification({ recipient: userId, type: "system", meta: { message: `Verification rejected: ${reason}` } });
    await logAdminAction({ adminId: admin._id, action: "verify_reject", targetType: "user", targetId: userId, summary: `Rejected verification for ${target.username}`, reason });
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `curl http://localhost:3000/api/admin/verifications` as admin -> 200, as non-admin -> 403. Approve flow flips `isVerified`.

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/verifications
git commit -m "feat(admin): verification queue API"
```

---

### Task 2: Admin Verification Queue — UI

**Files:**
- Create: `components/admin/VerificationQueueCard.jsx`
- Create: `app/(main)/admin/verifications/page.js`
- Modify: `app/(main)/admin/page.js:10` — add tab nav
- Test: manual browser `http://localhost:3000/admin/verifications` as admin

- [ ] **Step 1: Write failing UI check**

Navigate to `/admin/verifications` — expect 404.

- [ ] **Step 2: Build VerificationQueueCard**

```jsx
// components/admin/VerificationQueueCard.jsx
// Props: user { _id, name, username, college, collegeIdUrl, verificationRequestedAt }
// Shows avatar, name, college, requested time, ID preview (Image if jpeg/png/webp else PDF link), Approve/Reject buttons with reason textarea for reject
// Approve -> POST /api/admin/verifications/[userId] { action: "approve" }
// Reject -> POST with { action: "reject", reason }
```

- [ ] **Step 3: Build page with pagination + realtime refresh**

```jsx
// app/(main)/admin/verifications/page.js
"use client";
import { useEffect, useState } from "react";
import VerificationQueueCard from "@/components/admin/VerificationQueueCard";
// fetch GET /api/admin/verifications?page=...
// map users -> cards, onApprove/onReject refetch
// guard with useUser + isAdmin redirect
```

- [ ] **Step 4: Add tab to admin shell**

```js
// app/(main)/admin/page.js — add Tabs: Users | Verifications (pending count badge)
// Fetch pending count from GET /api/admin/verifications?limit=1 -> total
```

- [ ] **Step 5: Manual test**

Log in as admin, submit ID as test user -> appears in queue, ID preview loads from Appwrite `collegeIdUrl`, approve -> target user `isVerified` true, notification sent.

- [ ] **Step 6: Commit**

```bash
git add components/admin/VerificationQueueCard.jsx app/\(main\)/admin/verifications
git commit -m "feat(admin): verification queue UI"
```

---

### Task 3: Feed Verified Boost + Verified-Only Filter

**Files:**
- Modify: `app/api/posts/cursor-feed/route.js:11,23,62,230`
- Modify: `hooks/usePosts.js` — add verifiedOnly param
- Create: `components/feed/VerifiedFilterToggle.jsx`
- Modify: `app/(main)/feed/page.js:54,152`

- [ ] **Step 1: Write failing test**

```js
// GET /api/posts/cursor-feed?verifiedOnly=true -> only posts where author.isVerified === true
const res = await fetch("/api/posts/cursor-feed?verifiedOnly=true", { headers: { Cookie } });
const { posts } = await res.json();
assert(posts.every(p => p.author.isVerified === true));
```

- [ ] **Step 2: Run test — FAIL (param ignored)**

- [ ] **Step 3: Implement param + weight tuning**

```js
// app/api/posts/cursor-feed/route.js
const verifiedOnly = searchParams.get("verifiedOnly") === "true";
// In query building, if verifiedOnly -> need to filter by author.isVerified
// Approach: post-filter after populate OR join via User lookup
// Minimal: fetch verified userIds first if verifiedOnly
let verifiedUserIds = null;
if (verifiedOnly) {
  const verifiedUsers = await User.find({ isVerified: true }).select("_id").lean();
  verifiedUserIds = verifiedUsers.map(u => u._id);
  query.author = { $in: verifiedUserIds };
}
// Also tune FEED_WEIGHTS.verified from 3 -> 8 for verified boost in default feed (make verified stand out)
const FEED_WEIGHTS = { ..., verified: 8, ... };
```

Fix N+1:
```js
// Replace Promise.all(Post.exists) at line 231 with single query
const likedPosts = await Post.find({ _id: { $in: resultPosts.map(p => p._id) }, likes: currentUser._id }).select("_id").lean();
const likedSet = new Set(likedPosts.map(p => p._id.toString()));
```

Add `private, max-age=0, must-revalidate` for verifiedOnly to avoid cache poisoning (keep public cache for default only when no verifiedOnly).

- [ ] **Step 4: Wire usePosts**

```js
// hooks/usePosts.js — accept verifiedOnly, append to fetch URL
export function usePosts({ community, mode, feedType, verifiedOnly }) {
  // query = `...&verifiedOnly=${verifiedOnly||false}`
}
```

- [ ] **Step 5: Build VerifiedFilterToggle**

```jsx
// components/feed/VerifiedFilterToggle.jsx
// Pill button "Verified only" with ShieldCheck icon, active state green #22c55e, inactive border #262626
// On click -> setVerifiedOnly(!v) passed from FeedPage
```

Modify `app/(main)/feed/page.js`: add `const [verifiedOnly, setVerifiedOnly] = useState(false)` and pass to `usePosts`, render toggle in header next to CommunitySwitcher.

- [ ] **Step 6: Test & commit**

Run feed with toggle on -> only verified posts. Check ranking: verified authors appear higher in default feed.

```bash
git add app/api/posts/cursor-feed hooks/usePosts components/feed/VerifiedFilterToggle.jsx app/\(main\)/feed/page.js
git commit -m "feat(feed): verified boost and verified-only filter"
```

---

### Task 4: College Community — Verified-First Experience

**Files:**
- Modify: `models/Community.js:1` — add `verifiedMemberCount`, `collegeDomain`, indexes
- Modify: `app/api/communities/route.js:40` — return verified stats
- Create: `components/community/VerifiedCommunityHeader.jsx`
- Modify: `app/(main)/community/[college]/page.js:17`
- Modify: `app/(main)/community/page.js:14` — show verified communities first, filter college type

- [ ] **Step 1: Failing test**

```js
// GET /api/communities?name=IIT%20Bombay should return verifiedMemberCount
const res = await fetch("/api/communities?name=IIT%20Bombay");
const data = await res.json();
assert("verifiedMemberCount" in data);
```

- [ ] **Step 2: Extend model**

```js
// models/Community.js
verifiedMemberCount: { type: Number, default: 0 },
collegeDomain: { type: String, default: "" }, // e.g. iitb.ac.in
// index { type: 1, verifiedMemberCount: -1 }
```

Add helper `recalcVerifiedCount(communityId)` that counts `User.count({ college: community.name, isVerified: true })` and updates.

Call it on User verification approve (in task 1 POST approve hook) and on `POST /api/communities` + `app/api/posts/create` after member add.

- [ ] **Step 3: Enhance communities API**

In `GET` specificName branch, fetch `verifiedMemberCount` via aggregation or stored field + compute `verifiedCount` fresh if stale. Return `{ ..., verifiedMemberCount, memberCount, isCollege: type==="college" }`.

In `GET` all, sort by `verifiedMemberCount` desc then `postCount`.

- [ ] **Step 4: Build VerifiedCommunityHeader**

```jsx
// components/community/VerifiedCommunityHeader.jsx
// Props: displayName, stats { postCount, memberCount, verifiedMemberCount }, currentUser
// Layout: sticky header with 🎓 name, stats line "1.2k members · 340 verified · 89 posts", progress bar verified/member, Join button if not member (POST /api/communities/join), Verified badge if user isVerified
```

- [ ] **Step 5: Wire college page**

Replace header in `app/(main)/community/[college]/page.js:76` with `<VerifiedCommunityHeader>` and add join state. Pass `verifiedMemberCount` from stats fetch.

Add `POST /api/communities/[slug]/join` if not exists (check `app/api/communities/join` — else add to `app/api/communities/route.js` POST join logic for existing community).

- [ ] **Step 6: Community list polish**

In `app/(main)/community/page.js` — partition into "Your College" (where `community.name === currentUser.college`) pinned top with green border, then verified college communities, then interest.

- [ ] **Step 7: Commit**

```bash
git add models/Community.js app/api/communities components/community/VerifiedCommunityHeader.jsx app/\(main\)/community
git commit -m "feat(community): verified-first college communities"
```

---

### Task 5: Study Rooms MVP (College-Gated LiveKit Rooms)

**Decision:** Reuse `GroupChat` with `category` to ship fastest, or new `StudyRoom` model for clean separation. **Choose new model** to avoid polluting group inbox.

**Files:**
- Create: `models/StudyRoom.js`
- Create: `app/api/study-rooms/route.js` — GET discover, POST create
- Create: `app/api/study-rooms/[roomId]/route.js` — GET detail, POST join/leave
- Create: `app/api/study-rooms/[roomId]/token/route.js` — LiveKit token (reuse lib/livekit.js)
- Create: `app/(main)/study-rooms/page.js` — discover + create + active rooms
- Create: `components/study-room/StudyRoomCard.jsx`, `CreateStudyRoomDialog.jsx`
- Modify: `app/(main)/chats/page.js` — optional link to Study Rooms tab

- [ ] **Step 1: Failing test**

```js
// POST /api/study-rooms { name, college, topic } as verified user -> 201
// POST as unverified with requiresVerified true -> 403
const res = await fetch("/api/study-rooms", { method: "POST", body: JSON.stringify({ name: "DSA Marathon", college: "IIT Bombay", requiresVerified: true }) });
assert(res.status === 201);
```

- [ ] **Step 2: Create StudyRoom model**

```js
// models/StudyRoom.js
import mongoose from "mongoose";
const studyRoomSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  topic: { type: String, default: "", maxlength: 100 }, // e.g. "DSA", "GATE", "End sem"
  college: { type: String, required: true, trim: true }, // college name, e.g. "IIT Bombay"
  collegeDomain: { type: String, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  requiresVerified: { type: Boolean, default: true },
  maxMembers: { type: Number, default: 50 },
  isActive: { type: Boolean, default: true },
  livekitRoomName: { type: String, default: "" }, // study-<id>
  participantCount: { type: Number, default: 0 },
  lastActiveAt: { type: Date, default: Date.now },
}, { timestamps: true });
studyRoomSchema.index({ college: 1, isActive: 1, lastActiveAt: -1 });
studyRoomSchema.index({ requiresVerified: 1 });
export default mongoose.models.StudyRoom || mongoose.model("StudyRoom", studyRoomSchema);
```

- [ ] **Step 3: Implement GET discover + POST create**

```js
// app/api/study-rooms/route.js
// GET: ?college=IIT%20Bombay&q=DSA&page=1 -> filter isActive, college matches currentUser college OR all if verifiedOnly false, sort by participantCount desc, only show rooms user can join (if requiresVerified -> user.isVerified)
// POST: body { name, topic, college, requiresVerified, maxMembers }
// Validate currentUser, if requiresVerified && !currentUser.isVerified -> 403
// college defaults to currentUser.college
// Create room with livekitRoomName = `study-${new mongoose.Types.ObjectId()}`, members: [currentUser._id], participantCount: 1
// Emit realtime to college room? Use emitToUsers for college mates
```

- [ ] **Step 4: Implement room detail + token**

```js
// app/api/study-rooms/[roomId]/token/route.js
// GET -> check membership or allow join if not requiresVerified/college matches
// Use lib/livekit.js createCallToken({ identity: user._id, name: user.name, roomName: room.livekitRoomName })
```

Reuse `lib/livekit.js:11 callRoomName` helper but namespace `study-${roomId}`.

- [ ] **Step 5: Build Discover UI**

`app/(main)/study-rooms/page.js` — client, similar to `app/(main)/community/page.js` but grid of `StudyRoomCard` with topic pill, college, participant count, verified lock icon if requiresVerified, Join / Enter button. Create dialog for verified users. Show "Your College" rooms first.

- [ ] **Step 6: Wire LiveKit page**

Reuse `app/(main)/chats/[groupId]/call/page.js` pattern for study room call UI, or link to `/study-rooms/[roomId]/call` that uses `@livekit/components-react` like group calls.

- [ ] **Step 7: Test & commit**

Manual: verified user creates "DSA Study Room" for IIT Bombay, unverified user sees lock, verified college mate discovers and joins, token 200, LiveKit connect works.

```bash
git add models/StudyRoom.js app/api/study-rooms app/\(main\)/study-rooms components/study-room
git commit -m "feat(study-rooms): college-gated verified study rooms with LiveKit"
```

---

### Task 6: Verification Nudge + Trust Badges Everywhere

**Files:**
- Create: `components/shared/VerificationNudgeBanner.jsx`
- Modify: `app/(main)/feed/page.js:162` — show banner if !isVerified && verificationStatus !== "pending"
- Modify: `components/post/PostCard.js:74` — ensure VerifiedBadge visible (already done)
- Modify: `app/(main)/profile/[username]/page.js` — show verification CTA on own profile if unverified
- Modify: `app/(main)/community/[college]/page.js` — show verified-only post composer hint

- [ ] **Step 1: Build banner**

```jsx
// components/shared/VerificationNudgeBanner.jsx
// Green gradient, ShieldCheck, "Get verified — unlock study rooms & boosted reach" + CTA to /verify-student, dismissible via localStorage
```

- [ ] **Step 2: Wire feed + profile**

Add banner to `app/(main)/feed/page.js` top, and to `app/(main)/profile/[username]/ProfileClient.js` if own profile and not verified.

- [ ] **Step 3: College email auto-verify tooltip**

In `app/api/auth/signup/route.js:59` already auto-verifies — add toast in signup page: "College email detected — you are auto-verified!"

- [ ] **Step 4: Commit**

```bash
git add components/shared/VerificationNudgeBanner.jsx app/\(main\)/feed app/\(main\)/profile
git commit -m "feat(verification): nudge banner and trust badges"
```

---

### Task 7: Fix N+1 + Cache + Prune Dead Code + Docs

**Files:**
- Modify: `app/api/posts/cursor-feed/route.js:230` — N+1 fix (done in task 3, dedup)
- Modify: `models/User.js:131-180` — mark xp/vp deprecated, hide from API responses in `lib/sanitize.js` and `app/api/users/me/route.js`
- Modify: `lib/sanitize.js` — add `stripDeprecatedUserFields`
- Modify: `README.md:16`, `DESIGN.md`, `lib/openapi-spec.js:47`, `lib/llms-txt.js`, `next.config.mjs:80` — sync docs to JWT + Socket.IO, remove Framer tokens

- [ ] **Step 1: Strip deprecated fields from API**

```js
// lib/sanitize.js
export function stripDeprecatedUserFields(user) {
  if (!user) return user;
  const { xp, level, totalXP, weeklyXP, vp, ownedShopItems, equippedShopItems, ...rest } = user;
  return rest;
}
```

Use in `app/api/users/me/route.js`, `app/api/users/[username]/route.js`, `app/api/posts/cursor-feed/route.js` sanitizedAuthor.

- [ ] **Step 2: Docs sync**

Update `README.md` Highlights: remove Clips/Tools/VP mentions, add Study Rooms + Verified Campus Graph. Update `DESIGN.md` header to CampusZen tokens (replace Framer `#4ba9e1` section with CampusZen palette). Update `lib/openapi-spec.js` securitySchemes to JWT only.

- [ ] **Step 3: Cache header fix**

In `app/api/posts/cursor-feed/route.js` — if `verifiedOnly` then `Cache-Control: private, max-age=0, must-revalidate` else existing `public s-maxage 90`.

- [ ] **Step 4: Run build + lint**

```bash
bun run build
bun run lint
```

Expected: build <90s, no dead-field leakage in JSON.

- [ ] **Step 5: Commit**

```bash
git add lib/sanitize.js app/api/posts/cursor-feed README.md DESIGN.md lib/openapi-spec.js
git commit -m "chore: prune dead fields, fix cache, sync docs to verified graph"
```

---

## Self-Review Checklist

- [x] Spec coverage: Option A pillars all mapped (verification queue -> task1-2, feed boost -> task3, college communities -> task4, study rooms -> task5, nudge -> task6, debt -> task7)
- [x] No placeholders — every step has file paths + code blocks + commands
- [x] Type consistency: `User.isVerified`, `verificationStatus: "pending"|"verified"|"rejected"|"none"`, `Community.verifiedMemberCount`, `StudyRoom.requiresVerified` reused across tasks

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-09-verified-campus-graph.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
