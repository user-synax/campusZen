# CampusZen

<div align="center">

![Banner](https://capsule-render.vercel.app/api?type=waving&color=0f172a&height=280&section=header&text=CampusZen&fontSize=88&fontColor=ffffff&animation=fadeIn&fontAlignY=35&desc=Student-first%20social%20platform%20for%20Indian%20colleges&descSize=22&descAlignY=55)

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)](https://mongodb.com)
[![Pusher](https://img.shields.io/badge/Pusher-Realtime-300D4F?style=for-the-badge&logo=pusher)](https://pusher.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)

</div>

CampusZen is a student-focused social platform for Indian colleges. The app combines verified sign-in, campus communities, posts, clips, chats, resources, events, notifications, and admin moderation in one Next.js application.

## ✨ Highlights

- Verified student accounts with email/password, Google sign-in, OTP flows, and forgot-password recovery.
- Social feed with posts, comments, reactions, shares, bookmarks, hashtags, and trending discovery.
- Real-time direct messages and group chats with typing indicators and read states.
- Resources, events, and clips for campus content beyond the main feed.
- Notifications through in-app delivery, push subscriptions, and realtime updates.
- Admin and moderation tooling for content, users, security, reports, verifications, and promo codes.
- Public utility hub with developer-style tools for text, SEO, color, regex, UUIDs, JWTs, and more.

## 🧭 Core Product Areas

### 🔐 Authentication and Verification

- Email/password login and signup
- Google OAuth sign-in
- OTP verification and password reset flows
- Student verification via dedicated verification pages and admin review paths
- Secure session handling with HTTP-only cookies and JWT-based auth helpers

### 📰 Feed and Content

- Smart cursor-based feed with ranking heuristics
- Post creation with rich media support
- Post detail pages with comments, reactions, sharing, and reporting
- Hashtag pages and trending endpoints
- Bookmarks and post saving
- Clips for short-form content
- Community pages for college-specific discovery

### 💬 Chat and Realtime

- Direct messages
- Group chats
- Typing indicators and read receipts
- Realtime updates through Pusher channels
- Notification bell and push notification preferences

### 📚 Events and Resources

- Event creation and RSVP flows
- Resource uploads, browsing, saved resources, and personal uploads
- Resource moderation and admin review

### 👤 Profile and Account Management

- User profiles with avatar, banner, follow counts, and activity views
- Follow and follower management
- Settings, customization, billing, and account deletion flows
- Login history and security-related account controls

### 📈 Analytics and Discovery

- Search for posts, users, and trending content
- Leaderboard views
- Analytics dashboards for platform usage and moderation activity
- Founder-specific broadcasts and roadmap utilities

## 🛡️ Admin and Security

- Admin dashboard for users, verifications, content, resources, DMs, promo codes, logs, and security
- Blocked content review and reported content review
- User bans, IP bans, suspicious activity review, and moderation actions
- Rate limiting and sanitization utilities
- Push subscription management and web push support
- Role-based access control helpers

## 🧰 Public Tools Hub

CampusZen also includes a public tools section with utilities such as:

- Text tools like case conversion, slug generation, whitespace cleanup, reading time, delimiters, and compression
- SEO tools like meta tag generation, broken-link checking, social share previews, and alt-text checks
- Color tools like picker, contrast, gradient, blindness simulation, and relationship checks
- Developer tools like UUID, ULID, QR, JWT, hash, regex, query conversion, HTML preview, PHP serialization, and more

## Gamification

How to Earn XP : Users gain XP for:
- Creating posts: +20 XP
- Following users: +10 XP
- Liking content: +5 XP
- Commenting: +10 XP
- Daily login: +50 XP
- RSVPing to events: +15 XP
- Uploading resources: +30 XP

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router |
| UI | React 19 |
| Styling | Tailwind CSS 4, shadcn/ui, Radix UI |
| Database | MongoDB + Mongoose |
| Realtime | Pusher Channels |
| Cache and rate limiting | Redis / Upstash |
| File uploads | Appwrite Storage |
| Auth | Better Auth, JWT, bcryptjs, jose |
| Notifications | Web Push, Nodemailer |
| Motion and visuals | Framer Motion, GSAP, motion |
| Analytics | Vercel Analytics, Speed Insights |

## 📁 Project Structure

```text
app/
  (auth)/          Authentication flows
  (main)/          Main product surfaces
  (public)/        Public legal and marketing pages
  api/             Route handlers and backend endpoints
components/
  admin/           Admin console UI
  auth/            Authentication UI
  chat/            DM and group chat UI
  feed/            Feed utilities and widgets
  landing/         Homepage sections
  notifications/   Notification UI
  post/            Post composer and post actions
  resources/       Resource cards and uploads
  shared/          Shared primitives and helpers
  tools/           Public tools layouts
hooks/             Reusable client hooks
lib/               Auth, db, realtime, moderation, caching, and utilities
models/            Mongoose models
```

## 🚦 Key Routes

- `/` public landing page
- `/login`, `/signup`, `/verify-student`
- `/feed`, `/community`, `/chats`, `/notifications`, `/search`
- `/events`, `/resources`, `/clips`, `/bookmarks`, `/leaderboard`
- `/settings`, `/billing`, `/customize`, `/analytics`
- `/admin`, `/admin/resources`
- `/tools` and the nested public utility pages

## 🚀 Setup

### ✅ Prerequisites

- Node.js 18 or newer
- MongoDB Atlas or another MongoDB instance
- Pusher account
- Redis / Upstash for cache and rate limiting features

### 📦 Install

```bash
git clone https://github.com/user-synax/campusX.git
cd campusx
npm install
```

### 🔧 Environment Variables

```env
MONGODB_URI=
JWT_SECRET=

PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Depending on the features you enable, you may also need the Redis, Cloudinary, Web Push, Google OAuth, and email-related values used by the corresponding libraries in `lib/`.

### ▶️ Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## 🧪 Scripts

- `npm run dev` - start the development server
- `npm run build` - build for production
- `npm run start` - start the production server
- `npm run lint` - run the linter
- `npm run test` - run the Jest test suite
- `npm run seed` - seed the database
- `npm run seed:global-group` - seed the global chat group

## 🔒 Security Notes

- HTTP-only cookies are used for session safety.
- Input sanitization and route-level guards are used across the API surface.
- Rate limiting and IP banning are implemented for abusive behavior.
- Admin routes are protected through role-based access checks.
- Sensitive integrations are handled server-side.

## 📜 License

MIT License. See [LICENSE](LICENSE) for details.
