# CampusZen — Latest Project Analysis Report

> **Generated:** 2026-07-20 (automated static analysis, no files modified)
> **Repository:** `https://github.com/user-synax/campusX.git`
> **Local path:** `D:\campusX`
> **Current branch:** `main`
> **Latest commit:** `c088793` — *Update Profile ring based on level and moved badge from profile avatar to before name*

This report is a from-scratch, deep analysis of the entire codebase, cross-referencing the actual source against the existing docs (`README.md`, `PROJECT_STATUS.md`, `PROJECT_REPORT.md`, `DESIGN.md`). Where the docs disagree with the code, the **code is treated as the source of truth** and the discrepancy is flagged.

---

## 1. Executive Summary

CampusZen (formerly *campusX*) is a **large, full-featured student social platform** built on Next.js 16 (App Router) and React 19. It is effectively a "Twitter/Instagram for Indian colleges" with gamification, real-time chat, admin moderation, a public developer-tools hub, and an extensive landing/marketing site.

| Metric | Value |
|---|---|
| Source files (`app/`, `components/`, `lib/`, `hooks/`, `utils/`, `models/`, `context/`) | **538** |
| Approx. lines of source code | **~61,000** |
| API route handlers (`app/api/**/route.js`) | **~150** |
| Mongoose models | **33** |
| Custom React hooks | **14** |
| UI primitives in `components/ui` | **~35** |
| Public tools pages (`/tools/*`) | **60+** |
| Project test files | **0** (only `node_modules` tests exist) |
| `TODO`/`FIXME`/`HACK` markers in source | 14 |

**Maturity:** Feature-complete to the point of being sprawling. The product scope is ambitious (auth, feed, chat, clips, events, resources, notifications, gamification, admin, analytics, billing, founder tools, Reddit import, public tool suite, Appwrite storage). However, it carries **significant architectural debt**: a mid-migration dual-auth system, doc/code drift, dead/placeholder routes, and an inconsistent tech narrative.

---

## 2. Branding & Naming — Active Migration

The project is mid-rename from **campusX → campusZen**:

- `package.json` → `"name": "campuszen"`
- `README.md` / `DESIGN.md` → refer to "CampusZen"
- **`middleware.js`** still checks a legacy cookie named `campusx_token` (and `lib/auth.js` still sets `campusx_token`)
- `CLAUDE.md`, `PROJECT_REPORT.md`, `PROJECT_STATUS.md` still say "campusX"
- Git remote URL is still `user-synax/campusX.git`

**Implication:** The brand rename is incomplete in code (cookie names, middleware, docs) and in infra (repo URL). This is cosmetic but will confuse contributors and is a latent inconsistency.

---

## 3. Technology Stack (verified from `package.json` & code)

| Layer | Technology (actual) | Notes |
|---|---|---|
| Framework | **Next.js 16.2.0** (App Router) | `reactCompiler: true` enabled in `next.config.mjs` |
| UI | **React 19.2.4** | |
| Styling | **Tailwind CSS 4.2.2** + PostCSS + `@tailwindcss/postcss` | `tailwind.config.js` still references v3-style `content` globs (pages/components/app) — works but legacy config style |
| Components | **Radix UI** primitives + shadcn/ui-style wrappers in `components/ui` | ~35 UI primitives |
| Animation | **Framer Motion 12**, **GSAP 3.14**, `motion` | Both Framer Motion and GSAP present — overlapping responsibilities |
| Realtime | **Pusher Channels** (`pusher` + `pusher-js`) | 110 references in source |
| Database | **MongoDB + Mongoose 9** | 33 models |
| Cache / Rate-limit | **Upstash Redis** (`@upstash/redis`) | Leaderboards, caching, rate limiting |
| File uploads | **UploadThing** (`uploadthing`) + **Appwrite Storage** | Cloudinary was removed (git history: `730d4bd Removed cloudinary`), but 3 stale references remain |
| Auth | **Better Auth** (`better-auth` + `@better-auth/mongo-adapter`) + **Appwrite Auth** + legacy **JWT** (`jose`, `bcryptjs`) | Three auth mechanisms coexist — see §6 |
| Notifications | **Web Push** (`web-push`) + **Nodemailer** + Pusher realtime | |
| Editor / Collab | **@monaco-editor/react**, **yjs**, **y-protocols**, **y-monaco**, **@tldraw/tldraw** | Collaborative editor + whiteboard |
| Email | **Nodemailer** + Resend-style config (`RESEND_API_KEY` in config) | `lib/mailer.js`, `lib/otp-mailer.js` |
| Analytics | **Vercel Analytics** + **Vercel Speed Insights** | |
| AI | **OpenRouter** (`OPENROUTER_API_KEY`, model `openai/gpt-4o-mini`) | Used by `lib/reddit/ai.js` |
| Validation | **Zod** | |
| GIF | **Giphy** (`@giphy/js-fetch-api`) | |
| Hosting / Deploy | **Vercel** (`vercel.json`) + **Netlify** (`netlify.toml`) + **ShipStudio** (`.shipstudio/`) | Three deploy targets configured |

**Notable redundancies / contradictions:**
- `PROJECT_REPORT.md` claims **"Server-Sent Events (SSE)"** for realtime. **False** — there are 0 SSE references; realtime is entirely **Pusher** (110 refs). This is a documentation error.
- `PROJECT_REPORT.md` claims **Cloudinary** is the image host. Cloudinary was **removed** (commit `730d4bd`); uploads now use UploadThing + Appwrite. 3 stale `cloudinary` string references remain in code.
- Both **Framer Motion** and **GSAP** are used for animation — two heavy animation libraries doing overlapping work.
- **Three** host/deploy configs (Vercel, Netlify, ShipStudio) exist simultaneously.

---

## 4. Project Structure

```
campusX/
├── app/
│   ├── (auth)/        login, signup, verify-student
│   ├── (main)/        feed, chats, community, events, resources, clips,
│   │                  notifications, profile, settings, billing, customize,
│   │                  analytics, leaderboard, ranks, bookmarks, search, tools/*
│   ├── (public)/      landing page, privacy, terms
│   ├── api/           ~150 route handlers (admin, auth, posts, dms, groups,
│   │                  notifications, clips, events, resources, users, push, etc.)
│   ├── layout.js, globals.css, error.js, not-found.js, sitemap.js, robots.js
├── components/
│   ├── admin/  auth/  chat/  clips/  events/  feed/  landing/  layout/
│   ├── notifications/  post/  profile/  resources/  shared/  tools/  ui/  user/
│   └── reactBits/  (shinyText, etc.)
├── lib/             auth, db, cache, redis, pusher, notifications, gamification,
│                     ranks, rbac, admin, appwrite, mailer, reddit/, sanitize, etc.
├── models/          33 Mongoose schemas
├── hooks/           14 custom hooks (useDMChat, useGroupChat, useNotifications, ...)
├── utils/           contentModeration, schemas, validators, formatters, hashtags
├── context/         CatContext, NotificationContext, ThemeContext
├── scripts/         seed.js, seed-global-group(.mjs), test-* mjs scripts
├── public/          static assets
├── docs/            (doc artifacts)
└── config files     next.config.mjs, tailwind.config.js, middleware.js,
                     jest.config.js, babel.config.jest.js, components.json,
                     vercel.json, netlify.toml, .env.example
```

### 4.1 Route Groups & Conventions
- `(auth)`, `(main)`, `(public)` are **parallel route groups** (parentheses = no URL segment).
- Dynamic segments use bracket folders: `[postId]`, `[groupId]`, `[username]`, `[eventId]`, `[college]`, `[tag]`, `[clipId]`, `[conversationId]`, `[resourceId]`, `[notificationId]`, `[userId]`, `[id]`, `[ip]`.
- Many route folders contain `.gitkeep` placeholders: `app/api/posts/like/.gitkeep`, `app/api/posts/create/.gitkeep`, `app/api/follow/.gitkeep`, plus several page-level `.gitkeep` (login, signup, profile, community). These indicate **scaffolded-but-empty routes** — e.g. `app/(auth)/login/page.js` exists but `app/api/posts/like/route.js` is represented only by a `.gitkeep`, meaning the like endpoint likely lives at a different path or is unimplemented.

### 4.2 Loading / Metadata / Error States
- Extensive `loading.js` and `metadata.js` files exist for SEO + Suspense (good practice).
- `not-found.js`, `error.js`, `global-error.js` present.
- `app/api/csp-violation-report/route.js` receives CSP violation reports (security-conscious).

---

## 5. Data Model (33 Mongoose Schemas)

| Model | Purpose |
|---|---|
| `User` | Central account: auth, profile, XP, follows, verification, bans, streaks, badges, chat privacy, founder data |
| `Post` | Feed posts (text/images/GIF/poll/Markdown) |
| `Comment` | Post comments |
| `Clip` / `ClipComment` / `ClipLike` / `ClipSave` | Short-form video content + interactions |
| `Event` | Campus events + RSVP |
| `Resource` | Study materials (admin-approved) |
| `Community` | College/topic communities |
| `Hashtag` | Trending tags |
| `DMConversation` / `DMMessage` | Direct messages |
| `GroupChat` / `GroupMessage` | Group chats |
| `Notification` | In-app notifications |
| `Badge` | Gamification badges |
| `Rank` (implied via `lib/ranks.js`) | Levels |
| `Report` | User reports on content |
| `BlockedContentAttempt` | Moderation violations log |
| `Otp` | OTP verification codes |
| `Verification` | Student verification requests |
| `PushSubscription` | Web-push registrations |
| `PromoCode` | Pro subscription promo codes |
| `Subscription` | Billing/Pro state |
| `Session` | Auth sessions |
| `TokenBlacklist` | (Declared; JWT force-logout uses `tokenVersion` on User instead — see §6) |
| `UserBan` / `IPBan` | Moderation bans |
| `LoginAttempt` / `LoginHistory` | Security/audit |
| `AdminLog` | Admin action audit trail |
| `Account` | (Likely Better-Auth account link) |

**User model highlights** (`models/User.js`): 33 top-level fields, many indexes (college, followers, totalXP, weeklyXP, verification, chat privacy, mute/block). Notably:
- `collegeEmail` has a **unique sparse index** — enforces one college-email per user.
- `appwriteUserId` + `googleId` unique sparse (supports dual auth migration).
- `tokenVersion` field exists for force-logout (referenced in `lib/auth.js`).
- `isBot` / `botType` — supports bot accounts (likely the Reddit import bots).
- `ChatRequest` is referenced (`receivedChatRequests` / `sentChatRequests` as `ref: "ChatRequest"`) but **no `ChatRequest.js` model file exists** in `models/` — a **broken model reference** (would throw a Mongoose "MissingSchemaError" if populated).

---

## 6. Authentication — Three Coexisting Systems (Highest-Risk Area)

The codebase contains **three authentication mechanisms** that overlap, indicating an in-progress migration:

1. **Legacy JWT** (`lib/auth.js`): HS256 JWT via `jose`, stored in HTTP-only cookie `campusx_token`. `getCurrentUserLegacy()` validates it, checks `tokenVersion` (force-logout), and checks active bans.
2. **Appwrite Auth** (`lib/appwrite/*`, `lib/auth.js` → `getCurrentUser()`): Reads Appwrite session cookie `a_session_<PROJECT_ID>`, looks up the linked Mongo `User` (by `appwriteUserId`), auto-creates users, auto-follows founder. **This is the primary path** in `getCurrentUser()`.
3. **Better Auth** (`better-auth`, `@better-auth/mongo-adapter`) + `app/api/auth/[...all]/route.js`: A third auth framework wired up but its relationship to the other two is unclear from middleware (middleware explicitly **skips** `/api/auth` routes).

**Risks:**
- `middleware.js` only checks `campusx_token` and `a_session_*` — it does **not** validate Better Auth sessions, nor does it verify token validity (only presence). Protected routes are gated by cookie *existence*, not by verifying the session — a user with an expired/forged cookie name could pass the middleware (though API routes presumably re-check via `getCurrentUser`).
- `lib/auth.js` `checkRateLimit` uses an **in-memory `Map`** (`loginAttempts`) — **not shared across serverless instances**. On Vercel/Netlify (multiple lambdas), rate limiting is effectively per-instance and easily bypassed. This contradicts `PROJECT_STATUS.md`'s claim of "Rate limiting on login attempts by both IP and email."
- `blacklistAllUserTokens()` (force logout) is implemented via `tokenVersion` increment, but the comment admits the TokenBlacklist model approach is unused.

---

## 7. Core Feature Areas (verified)

### 7.1 Feed & Content
- `PostComposer` (create posts), `PostCard`, `PostDetailClient`, `CommentSection`.
- Rich content: text, up to **6 images** (README says 6; `PROJECT_REPORT.md` wrongly says 4), GIFs (Giphy), polls, Markdown, link previews.
- **Content moderation** (`utils/contentModeration.js`): whitespace normalization + leetspeak handling to defeat bypass; violations logged to `BlockedContentAttempt`.
- **Smart feed**: cursor-based pagination (`/api/posts/cursor-feed`), ranking heuristics; trending + hashtag endpoints.
- Reactions beyond like (funny/wow/sad/respect/fire — per `PROJECT_REPORT.md`).

### 7.2 Gamification (`lib/gamification.js` + `lib/ranks.js`)
- **XP awards** (`lib/ranks.js` `XP_AWARDS`): post 300, follow 100, like 20, comment 50, daily_login 50, event_rsvp 500, resource_upload 1000.
  - ⚠️ **Doc mismatch:** `PROJECT_STATUS.md` / `README.md` list *different, much smaller* values (post 20, follow 10, like 5, comment 10, daily 50, rsvp 15, resource 30). The code values are 10–30× larger. The docs are stale.
- **Leveling:** `FORMULA_BASED` progression: `XP = 1000 * level^1.2`. `calculateLevelFromXP()` loops to compute level.
- **Ranks:** `RANK_MAPPING` from Rookie (L1) → Immortal (L90), each with a `/assets/ranks/*.png` badge image (these PNGs are not present in the repo — broken image references likely).
- **Badges:** `PREDEFINED_BADGES` (First Steps, Social Butterfly [follow 50], Streak Master [7-day], Content Creator [10 posts], Community Hero [L10]). `shouldUnlockBadge` has **incomplete logic** — the `post` action only unlocks at `count===1`; the "Content Creator (10 posts)" badge can **never** unlock because there's no post counter (comment states "we'd need a counter"). This is a **latent bug**.
- **Daily XP limits** (`DAILY_XP_LIMITS`): like 100/day, follow 50/day, comment 30/day — anti-exploitation, enforced via Redis; gracefully skips if Redis down.
- **Leaderboards:** Redis-backed (global/college/weekly) with **MongoDB fallback** in `getLeaderboard()`.

### 7.3 Real-time Chat (Pusher)
- DM + Group chats; global auto-join group (`scripts/seed-global-group`).
- Typing indicators, read receipts, chat privacy (everyone/verified/college/followers/none), DM toggle, chat requests.
- Client state via `useDMChat`, `useGroupChat`, `useChatUnreadCount` (aggregates both, Pusher-driven).
- Admin can read DMs (`components/admin/AdminDMMessages.js`, `/api/admin/dms`).

### 7.4 Notifications
- Types: like, comment, follow, mention, repost, reaction, poll vote, comment like, group invite, event reminder, resource approved/rejected, badge earned, level up, system.
- `createNotification()` (lib/notifications.js) → Mongo + Pusher private channel. Web-push via `sendPushToUser`. Deduplication on undo (unlike/unfollow).
- Client: `useNotifications`, `NotificationBell`, push permission banners.

### 7.5 Admin & Moderation
- Dashboard (`/admin`): users, verifications, content, resources, DMs, promo codes, logs, security.
- IP bans, suspicious activity, reported content, blocked-content attempts.
- `lib/rbac.js` / `rbac-utils.js` role checks (user/moderator/admin/founder).
- `lib/admin-log.js` audit trail. A dedicated `admin` API tree (≈20 routes).

### 7.6 Events & Resources
- Events with RSVP + reminders; Resources with admin approval, browse/save/my-uploads.
- `AdminResourceCard`, `ResourceUploadModal`.

### 7.7 Billing / Pro
- `isPro` gated features (polls, more images, customization, priority support).
- `/billing`, `/api/billing/*`, `lib/subscription.js` (`refreshUserProStatus`), promo-code redemption (`/api/billing/redeem`, admin promo routes).
- ⚠️ `middleware.js` protects `/wallet` and `/shop` routes, but **no `wallet` or `shop` pages exist** in `app/` — dead route guards referencing non-existent surfaces. Also referenced: `AdminShopManager` component exists but no corresponding route.

### 7.8 Founder Tools
- Broadcast, roadmap, profile-view analytics (`User.founderData`).
- `/api/founder/*` (broadcast, pin, profile-view, roadmap).

### 7.9 Reddit Import
- `lib/reddit/` (ai, bots, config, duplicates, fetch) + `/api/reddit-import`.
- Fetches Reddit RSS via `rss2json.com`, uses OpenRouter AI to paraphrase/avoid duplicate content, posts as bot accounts. A **content-ingestion automation** feature.

### 7.10 Public Tools Hub (`/tools/*`)
- **60+ pages** of developer/text/SEO/color utilities: UUID, ULID, QR, JWT, hash, regex, query converter, HTML previewer, PHP serializer, case converter, slug, ASCII, lorem ipsum, morse, reading-time, rot13, sort/dedupe, whitespace, chmod, css cursor/specificity, data-url, svg-css, svg-to-react, json-to-code, html-jsx, scss-formatter, semver, faker, copyright, keyboard, line-counter, responsive-fonts, url-parser, and a whole SEO suite (meta tag gen/check, broken-link, alt-text, html-tag-counter, social-share, slug) and color suite (picker, contrast, gradient, blindness, convert, meaning, relationship, validator).
- Layouts: `ToolLayout`, `TextToolLayout`, `SeoToolLayout`, `ColorToolLayout`.
- Substantial, self-contained, and well-organized — a strong differentiator.

### 7.11 Landing / Marketing (`app/(public)/`, `components/landing/`)
- Hero, Features, WhyStudentsChoose, ProductShowcase, Stats, TechStack, Navbar, Footer, `WelcomeVideoOverlay`, `FloatingCat`, `reactBits/shinyText`, GSAP-driven sections.
- `DESIGN.md` documents a **Framer-style dark-canvas design system** (black surfaces, white display type, single blue accent, gradient spotlight cards). Note: `DESIGN.md` is actually a Framer marketing-site design spec (likely a reference/inspiration doc), not CampusZen's own tokens — its `accent-blue` `#4ba9e1` has a typo (`##4ba9e1` with double `#`).

---

## 8. Security Posture

**Strengths:**
- HTTP-only, secure, sameSite=lax cookies for sessions (`lib/auth.js`).
- Comprehensive **CSP** in `middleware.js` (dev + prod variants) with `report-uri` to `/api/csp-violation-report`.
- `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (camera/mic/geo disabled), HSTS, `Origin-Agent-Cluster`.
- `lib/sanitize.js`, `utils/contentModeration.js`, route-level RBAC.
- IP bans + suspicious-activity logging.

**Weaknesses / Risks:**
- **Middleware only checks cookie presence**, not validity — relies on downstream API re-checks.
- **In-memory rate limiter** (`Map`) — ineffective on serverless multi-instance; rate-limit claims in docs are overstated. Use Redis (`lib/redis-rate-limit.js` exists — should be wired into login).
- `next.config.mjs` CSP allows `img-src ... https: http:` and remotePatterns `**` (all hosts) — **very permissive image loading**, weakening the CSP's image protections. `dangerouslyAllowSVG: true` with sandbox is acceptable but broad.
- Legacy `campusx_token` + dual auth increases attack surface and confusion.
- `crypto-js` and `jsonwebtoken` are dependencies alongside `jose` — possibly redundant crypto libs.
- `lib/config.js` declares `requiredEnvVars` but **only validates** `MONGODB_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID/SECRET` — many other required vars (Pusher, UploadThing, Appwrite, Redis, VAPID) are unvalidated, so misconfiguration fails silently at runtime.

---

## 9. Configuration & Environment

`.env.example` lists **43 variables** spanning: Mongo, JWT, Appwrite (endpoint/project/key/buckets/database), Pusher, UploadThing, VAPID/web-push, Giphy, Google OAuth, OpenRouter, Resend/email, Cloudinary (still listed though Cloudinary was removed — **stale env var**), Tldraw license, YT API, APK/contact URLs, admin/founder config, cron secret.

`lib/config.js` centralizes access but only hard-validates 4 vars. `appwrite/client.js` and `lib/appwrite.js` use a mix of SDK constructor and manual `X-Appwrite-Key` header (admin client) — inconsistent with the SDK's `.setKey()` method.

---

## 10. Deployment

- **Vercel** (`vercel.json` + Vercel Analytics/Speed Insights) — primary.
- **Netlify** (`netlify.toml` + `@netlify/plugin-nextjs`) — secondary config present.
- **ShipStudio** (`.shipstudio/` dir) — third deploy target.
- Multiple `vercel/...` and `copilot/...` remote branches indicate active CI/deploy experiments.

This triple-deployment setup is unusual; likely one is canonical and the others are leftover.

---

## 11. Testing & Quality

- `package.json` defines `test` (Jest with `--experimental-vm-modules`), `jest.config.js`, `babel.config.jest.js`, and dev deps `jest`, `@jest/globals`, `babel-jest`, `fast-check` (property testing).
- **However, there are ZERO project test files.** The `test` script would collect nothing from `app/components/lib`. `scripts/test-*.mjs` are one-off data-population/fetch scripts, not tests.
- No CI config (`.github/workflows`) observed.
- Lint script present (`next lint`); `eslint.config.mjs` exists.

**Gap:** A 60k-line codebase with extensive business logic (auth, gamification, moderation) has **no automated test coverage**. This is the single biggest quality risk.

---

## 12. Documentation Drift (Critical Findings)

| Topic | Docs say | Code says | Verdict |
|---|---|---|---|
| Realtime | SSE (PROJECT_REPORT.md) | Pusher (110 refs, 0 SSE) | **Docs wrong** |
| Image host | Cloudinary (PROJECT_REPORT.md) | UploadThing + Appwrite (Cloudinary removed `730d4bd`) | **Docs wrong** |
| XP values | post 20 / follow 10 / like 5 / comment 10 / rsvp 15 / resource 30 | post 300 / follow 100 / like 20 / comment 50 / rsvp 500 / resource 1000 | **Docs stale** (10–30× off) |
| Images per post | 4 (PROJECT_REPORT.md) | 6 (README, PostComposer) | **Docs wrong** |
| Brand name | CampusZen (README/DESIGN) | cookie/middleware still `campusx_token`; repo `campusX` | **Incomplete rename** |
| Env (Cloudinary) | `CLOUDINARY_*` in `.env.example` | Cloudinary removed | **Stale var** |
| Middleware routes | protects `/wallet`, `/shop` | no such pages exist | **Dead guards** |
| Badges | Social Butterfly = 10 follows (README) | Social Butterfly = 50 follows (code) | **Docs wrong** |
| ChatRequest model | referenced in User schema | no `ChatRequest.js` model | **Broken ref** |
| Rank badge images | `/assets/ranks/*.png` | PNGs absent from repo | **Broken assets** |
| Rate limiting | "by IP and email" (PROJECT_STATUS) | in-memory Map (per-instance) | **Overstated** |

---

## 13. Specific Code-Level Issues

1. **`shouldUnlockBadge` post-count badges never unlock** (`lib/gamification.js:273`) — no post counter exists, so "Content Creator" (10 posts) is unreachable.
2. **`ChatRequest` model missing** — `User.receivedChatRequests`/`sentChatRequests` reference a schema that doesn't exist; populating these will throw.
3. **Rank badge PNGs missing** — `RANK_MAPPING` points to `/assets/ranks/*.png` not in repo.
4. **In-memory rate limiter** — ineffective under serverless.
5. **Permissive CSP image rules** — `img-src https: http:` + `remotePatterns: ["**"]` undermine image isolation.
6. **Dual/incomplete auth** — Appwrite + legacy JWT + Better Auth; middleware only checks cookie presence.
7. **`TokenBlacklist` model declared but unused** — force-logout uses `tokenVersion` instead (dead model).
8. **`DESIGN.md` accent typo** — `accent-blue: "##4ba9e1"` (double `#`).
9. **`tailwind.config.js`** uses legacy v3 `content` globs though Tailwind v4 normally uses CSS-based `@source`; works but signals mixed-version config.
10. **Placeholder `.gitkeep` routes** — several API/page routes are scaffolded but empty (e.g. `app/api/posts/like/.gitkeep`).
11. **Both GSAP and Framer Motion** for animation — duplication / bundle bloat.
12. **Redundant crypto libs** (`crypto-js`, `jsonwebtoken`) alongside `jose`.

---

## 14. Strengths

- Huge, coherent feature set with consistent App Router structure and parallel route groups.
- Strong security baseline (CSP, secure cookies, sanitization, RBAC, audit logs).
- Gamification + leaderboards with Redis caching and graceful Mongo fallback.
- Comprehensive SEO/loading/error states.
- Well-organized public tools hub (60+ pages, reusable layouts).
- Thoughtful UX details (chat privacy, DM toggle, push-permission banners, floating cat, welcome video).
- Active, recent development (latest commit on branch `main`).

---

## 15. Recommendations (prioritized)

**P0 — Correctness / Security**
1. Replace in-memory login rate limiter with `lib/redis-rate-limit.js`.
2. Make middleware verify session validity (or trust API re-checks consistently) — don't gate only on cookie presence.
3. Add the missing `ChatRequest` model or remove the references.
4. Fix `shouldUnlockBadge` so multi-post/like badges can actually unlock (add counters).

**P1 — Consistency**
5. Complete the campusX→campusZen rename (cookie name, middleware, repo, CLAUDE.md, PROJECT_REPORT.md, PROJECT_STATUS.md).
6. Update docs to match code (SSE→Pusher, Cloudinary→UploadThing/Appwrite, XP values, image counts, badge thresholds).
7. Remove dead middleware guards (`/wallet`, `/shop`) or implement the pages.
8. Remove stale `.env.example` Cloudinary vars; add validation for Appwrite/Pusher/UploadThing/Redis/VAPID in `lib/config.js`.

**P2 — Quality / Maintainability**
9. Add a real Jest test suite (start with auth, gamification, moderation) — currently 0 tests.
10. Tighten CSP image rules; drop `remotePatterns: ["**"]`.
11. Consolidate animation libs (pick Framer Motion or GSAP).
12. Add missing rank badge PNGs or generate them dynamically.
13. Decide on a single canonical deploy target (Vercel vs Netlify vs ShipStudio).
14. Resolve the auth migration (Appwrite vs Better Auth vs legacy JWT) — pick one primary and deprecate the rest.

---

## 16. File Inventory (key counts)

- **API route handlers:** ~150 (`app/api/**/route.js`)
- **UI primitives:** ~35 (`components/ui/*`)
- **Landing components:** ~13 (`components/landing/*`)
- **Post components:** ~25 (`components/post/*`)
- **Chat components:** ~11 (`components/chat/*`)
- **Admin components:** ~11 (`components/admin/*`)
- **Notification components:** ~10
- **Tools pages:** 60+ (`app/main/tools/*`)
- **Mongoose models:** 33 (`models/*`)
- **Hooks:** 14 (`hooks/*`)
- **Lib modules:** ~55 (`lib/*` including `reddit/`, `appwrite/`)

---

*End of report. No source files were modified during analysis.*
