# CampusZen Project Status

## Overview

CampusZen is a student-only social platform built for Indian college students. It uses Next.js 16+ with App Router, MongoDB, Pusher for realtime features, and UploadThing for file uploads.

## Core Features

### 1. User Authentication & Verification

- **Signup/Login**: Email/password or Google OAuth
- **College Verification**: Verified college email or ID card upload
- **User Roles**: User, Moderator, Admin, Founder
- **Security**: Password hashing, JWT, rate limiting

**How it works**:

- Users sign up with email/password or Google OAuth
- They can verify their identity using college email (OTP-based) or ID card (admin-approved)
- Verified users get a badge and access to verified-only features
- User sessions are managed with JWT tokens stored in HTTP-only cookies

### 2. Post Creation & Feed

- **Rich Content**: Text (max 2000 chars), images (up to 6), GIFs, polls (Pro feature), Markdown, link previews
- **Content Moderation**: Automated moderation checks for inappropriate content (sexual, violence, harmful, spam)
- **Interactions**: Likes, comments, reactions, shares
- **Smart Feed Algorithm**: Weighted scoring based on likes, comments, views, recency, connections
- **Communities**: College-specific and topic-based communities
- **Tags & Hashtags**: Content categorization

**How it works**:

- `PostComposer` component allows users to write posts, add images/GIFs/polls, and select communities/tags
- On submission, a moderation check is performed first using `checkContentModeration` utility
- Moderation normalizes text (removes whitespace, handles leetspeak) to prevent bypass tricks
- If blocked, the composer turns red, shows a warning, and logs a `BlockedContentAttempt`
- Valid posts are created and added to the feed
- Feed is fetched with cursor-based pagination and sorted by the smart algorithm

**Key files**:

- `components/post/PostComposer.js`
- `utils/contentModeration.js`
- `models/Post.js`
- `models/BlockedContentAttempt.js`

### 3. Gamification (XP, Levels, Badges)

- **XP Awards**: Post (20), follow (10), like (5), comment (10), daily login (50), event RSVP (15), resource upload (30)
- **Leveling Up**: 1000 XP per level
- **Badges**: First Post, Trendsetter (10 posts), Social Butterfly (10 follows), Weekly Warrior (7-day streak)
- **Leaderboards**: Global, college-specific, weekly (Redis-backed for performance, with MongoDB fallback)
- **Streaks**: Daily login streak tracking

**How it works**:

- When a user performs an action, `awardXP` is called to grant XP
- XP increments update the user's level and leaderboard positions
- `updateStreak` checks and updates the daily login streak
- `checkAndAwardBadges` verifies if criteria are met and awards badges
- Notifications are sent for level ups and badge awards
- Leaderboard data is cached in Redis for fast access

**Key files**:

- `lib/gamification.js`
- `models/User.js`
- `models/Badge.js`

### 4. Real-time Chat (DMs & Groups)

- **Direct Messages**: 1-on-1 conversations
- **Group Chats**: Create groups, invite members (max 200 members except global group)
- **Global Group**: Auto-joined by all users
- **Typing Indicators**: Show when someone is typing
- **Read Receipts**: Track last read message per user
- **Chat Privacy Settings**: Everyone, verified, college, followers, none
- **DM Toggle**: Users can disable DMs entirely

**How it works**:

- `DMConversation` and `GroupChat` models store conversation metadata
- `DMMessage` and `GroupMessage` store individual messages
- Pusher channels handle real-time events: new messages, typing, read receipts
- `useDMChat` and `useGroupChat` hooks manage client-side chat state
- `useChatUnreadCount` aggregates unread counts for both DMs and groups (updated via Pusher events)
- Chat requests are sent to users with privacy settings that require approval

**Key files**:

- `models/DMConversation.js`
- `models/DMMessage.js`
- `models/GroupChat.js`
- `models/GroupMessage.js`
- `hooks/useChatUnreadCount.js`
- `lib/pusher-server.js`
- `lib/pusher-client.js`

### 5. Notifications

- **Types**: Like, comment, follow, mention, repost, reaction, poll vote, comment like, group invite, event reminder, resource approved/rejected, badge earned, level up, system
- **Realtime Delivery**: Pusher for instant updates
- **Web Push**: Browser push notifications
- **Deduplication**: Prevents duplicate notifications (e.g., user likes, unlikes, likes again)
- **Notification Bell**: Shows unread count and list of notifications
- **In-app & Push**: Both in-app and push notifications are sent

**How it works**:

- `createNotification` function handles all notification creation
- Notifications are stored in MongoDB and sent via Pusher to the recipient's private channel
- Web push notifications are sent using `sendPushToUser`
- `getNotificationText`, `getNotificationIcon`, and `getNotificationURL` generate notification content and links
- `deleteNotification` removes notifications if the action is undone (e.g., unlike, unfollow)
- Client-side, `useNotifications` and `NotificationBell` handle display

**Key files**:

- `lib/notifications.js`
- `lib/web-push.js`
- `models/Notification.js`
- `components/notifications/NotificationBell.js`
- `hooks/useNotifications.js`

### 6. Admin Dashboard & Moderation

- **Blocked Content Attempts**: View and manage users who tried to post inappropriate content
- **Reported Content**: Manage user reports on posts and comments
- **User Management**: Ban/unban users, view user details
- **Resource Management**: Approve/reject uploaded resources
- **Analytics**: View platform analytics
- **Promo Codes**: Create and manage promo codes for Pro subscriptions
- **Security**: IP banning, suspicious activity logs

**How it works**:

- Admin-only API routes protect sensitive endpoints
- `AdminBlockedContent`, `AdminReportedContent`, etc., components provide admin UI
- `admin-log.js` tracks admin actions for audit purposes
- `rbac.js` handles role-based access control
- Moderation actions (ban, remove content, etc.) sync with user and content models

**Key files**:

- `components/admin/AdminBlockedContent.js`
- `lib/admin-log.js`
- `lib/rbac.js`
- `models/Report.js`

### 7. Pro Features

- **Poll Creation**: Create polls with multiple options
- **Image Uploads**: Upload up to 6 images per post
- **Profile Customization**: More options for profile customization
- **Priority Support**: Faster support response

**How it works**:

- `isPro` field on User model gates Pro features
- `PostComposer` shows lock icons and redirects to billing page for Pro features if user is not Pro
- `billing` API routes handle subscription management

### 8. Events

- **Create Events**: Create college or community events
- **RSVP**: RSVP to events
- **Event Reminders**: Notifications before events start

### 9. Resources

- **Upload Resources**: Share study materials, notes, etc.
- **Resource Library**: Browse and download resources
- **Moderation**: Resources require admin approval

### 10. Search & Discovery

- **Global Search**: Search posts, users, hashtags
- **Trending**: Discover trending posts and hashtags

## Tech Stack

- **Frontend**: Next.js 16+ (App Router), React 19, Tailwind CSS 4, Radix UI, Sonner, Framer Motion
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB with Mongoose ODM
- **Realtime**: Pusher Channels
- **File Upload**: UploadThing
- **Caching**: Redis (Upstash)
- **Email**: Nodemailer
- **Push Notifications**: Web Push API
- **Analytics**: Vercel Analytics & Speed Insights
- **Hosting**: Vercel

## Key Integrations

- **Pusher**: Real-time notifications, chat, feed updates
- **UploadThing**: Image and file uploads
- **Giphy**: GIF search and integration
- **Google OAuth**: Google sign-in
- **Nodemailer**: Email OTPs and notifications
- **Redis**: Leaderboards, caching, rate limiting

## Project Structure

```
campusZen/
├── app/
│   ├── (auth)/          # Authentication pages
│   ├── (main)/          # Main app pages (feed, chats, profile, etc.)
│   ├── (public)/        # Public pages (privacy, terms)
│   └── api/             # API routes
├── components/
│   ├── admin/           # Admin dashboard components
│   ├── chat/            # Chat components
│   ├── post/            # Post components
│   └── shared/          # Shared components
├── hooks/               # Custom React hooks
├── lib/                 # Core logic (auth, db, notifications, etc.)
├── models/              # Mongoose models
└── utils/               # Utility functions
```

## Recent Updates

- Added content moderation with whitespace normalization and leetspeak handling
- Implemented chat notifications (DM and group messages) with unified `createNotification`
- Updated `useChatUnreadCount` to aggregate both DM and group unread counts and update in real-time
- Added `BlockedContentAttempt` model for admin visibility into moderation violations
