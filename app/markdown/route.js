import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
    const markdown = `# CampusZen Project Overview
## CampusZen — Student-first social platform

CampusZen is a student-only social platform built for Indian college communities. It focuses on verified onboarding, safe campus discovery, collaborative tools, and real-time social features tailored to students.

## Key Information
- **Project Name:** CampusZen (campusX)
- **Tagline:** Student-first social platform for Indian colleges
- **Mission:** Safe, verified campus communities for networking, resource sharing, and study collaboration

## Current Status
- Active development with weekly updates; CI and lint/test scripts present ("jest", "eslint")
- Production-ready features: feed, DMs, group chat, resources, events, push notifications, gamification, admin moderation
- Deployments: configured for Vercel (primary) with deployment manifests for Netlify available

## Technical Snapshot
- **Framework:** Next.js 16+ (App Router)
- **Frontend:** React 19, Tailwind CSS 4, shadcn/ui, Radix UI, Framer Motion, GSAP
- **Backend & APIs:** Next.js API routes (Node.js)
- **Database:** MongoDB (Mongoose)
- **Realtime:** Pusher Channels (live chat, notifications, feed updates)
- **Cache & Rate Limiting:** Redis / Upstash
- **File Uploads & Storage:** UploadThing, Cloudinary
- **Auth & Security:** JWT-based sessions, HTTP-only cookies, Google OAuth, OTP flows, sanitization and rate-limits
- **Notifications:** Web Push, in-app Pusher notifications, Nodemailer for emails

## Core Product Areas
- Authentication & Student Verification: email/Google sign-in, OTP verification, admin review paths
- Feed & Content: rich posts, images/GIFs, polls (Pro), hashtags, cursor-based feed, moderation checks
- Chat: 1:1 DMs, group chats, typing indicators, read receipts, global auto-joined group
- Resources & Events: upload/share study materials, event creation and RSVP flows, admin approval for resources
- Gamification: XP, levels, badges, leaderboards (Redis-backed)
- Notifications: realtime and push with deduplication and user preferences
- Admin & Moderation: blocked-content tracking, reports, user bans, IP bans, role-based access control (RBAC)

## Integrations
- Pusher, UploadThing, Cloudinary, Giphy, Google OAuth, Nodemailer, Appwrite (functions/integrations), Redis/Upstash

## Developer Notes
- Local dev: 'npm run dev' (Node 18+)
- Tests: 'npm run test' (Jest)
- Linting: 'npm run lint' (ESLint)
- Environment: 'MONGODB_URI', 'JWT_SECRET', Pusher and UploadThing keys, optional Redis and Cloudinary values

## Project Structure (short)
- 'app' — Next.js App Router pages and APIs
- 'components/' — UI building blocks (admin, chat, feed, tools)
-'lib/' — Core server utilities (auth, db, notifications, pusher, moderation)
- 'models/' — Mongoose models

## Roadmap & Priorities
- Improve moderation accuracy and admin tooling
- Expand Pro billing and poll features
- Performance tuning for feeds and leaderboards
- Deeper analytics and discovery features

## Contact
- Support: usersynax@gmail.com
---
Keywords: student social network, college community, verified students, campus resources, collaborative coding, India
`;

    return new NextResponse(markdown, {
        headers: {
            "Content-Type": "text/markdown; charset=utf-8",
        },
    });
}
