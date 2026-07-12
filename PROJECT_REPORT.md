# 🚀 CampusZen Project Report

Welcome to the **CampusZen** codebase report. This document provides a comprehensive overview of the technologies, features, and architectural structure used in this project.

***

## 🛠️ Technology Stack

### **Frontend**

- **Framework**: [Next.js 16.2.0](https://nextjs.org/) (App Router)
- **UI Library**: [React 19.2.4](https://reactjs.org/)
- **Styling**: [Tailwind CSS 4.2.2](https://tailwindcss.com/) for modern, utility-first styling.
- **Components**: [Radix UI](https://www.radix-ui.com/) (Headless UI) with [Shadcn UI](https://ui.shadcn.com/) patterns.
- **Animations**: [GSAP (GreenSock)](https://greensock.com/gsap/) for smooth, high-performance animations.
- **Icons**: [Lucide React](https://lucide.dev/) for consistent, beautiful iconography.
- **Toasts**: [Sonner](https://sonner.emilkowal.ski/) for lightweight, customizable notifications.

### **Backend & Infrastructure**

- **Runtime**: Node.js (via Next.js API Routes).
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/) for object modeling.
- **Authentication**: JWT-based auth using `jose`, `jsonwebtoken`, `bcryptjs`, and secure cookies.
- **Image Hosting**: [Cloudinary](https://cloudinary.com/) for optimized image management and transformations.
- **Real-time**: **Server-Sent Events (SSE)** for live notifications and feed updates.
- **Analytics**: Vercel Analytics & Speed Insights for performance monitoring.

***

## ✨ Core Features

### 1. **Social Feed**

- **Rich Posts**: Supports text, images (up to 4 per post), and hashtags.
- **Polls**: Create interactive polls with multiple options and expiration dates.
- **Anonymous Posting**: Option to post without revealing your identity.
- **Interactions**: Like, react (funny, wow, sad, respect, fire), and comment on posts.
- **Infinite Scroll**: Seamlessly browse through the feed with automated pagination.

### 2. **Gamification (XP & Levels)**

- **XP System**: Users earn XP for actions like posting, following, liking, and commenting.
- **Leveling**: Users level up based on accumulated XP, unlocking a sense of progression.
- **Real-time Feedback**: Instant notifications when a user levels up.

### 3. **Communities & Events**

- **College Communities**: Dedicated spaces for different colleges.
- **Event Management**: Create and join events with RSVP status tracking.
- **Study Groups**: Integration for collaborative learning (linked to posts).

### 4. **User Profiles & Connections**

- **Custom Profiles**: Avatars, bios, college/course details, and social links.
- **Follow System**: Build connections with a robust follow/unfollow mechanism.
- **Bookmarks**: Save important posts for easy access later.

### 5. **Search & Discovery**

- **Global Search**: Find posts, users, and trending hashtags.
- **Trending**: Discover what's popular in the community through real-time hashtag tracking.

### 6. **Founder Special Features**

- **Broadcasts**: Site-wide announcements that can be pinned or dismissed.
- **Roadmap**: A public roadmap showing 'Done', 'In Progress', and 'Upcoming' features.
- **Profile Analytics**: Track profile views and user growth metrics.

### 7. **Robust Validation & Security**

- **Multi-Layered Validation**: Real-time client-side validation with immediate feedback and server-side Zod failsafe.
- **Password Strength**: Enforced requirements (8+ chars, uppercase, lowercase, numbers, special characters).
- **Spam Protection**: Blocking of disposable email domains (e.g., yopmail) and RFC-compliant email regex.
- **Brute-Force Protection**: Rate limiting on login attempts by both IP and email (5 attempts/15 mins).
- **Privacy-First Messaging**: Generic "Invalid credentials" errors to prevent account enumeration.
- **Accessibility**: WCAG 2.1 compliant forms with `aria` attributes and screen-reader support.

***

## 📂 Project Structure

- `app/`: Next.js App Router structure with parallel and intercepted routes.
  - `(auth)/`: Login and Signup pages.
  - `(main)/`: Core application pages (feed, profile, notifications, etc.).
  - `api/`: RESTful API endpoints for all backend operations.
- `components/`: Modular UI components organized by feature (post, event, layout, shared).
- `hooks/`: Custom React hooks for shared logic (`usePosts`, `useUser`, `useNotifications`).
- `lib/`: Core logic and utility libraries (database, auth, xp, cloudinary).
- `models/`: Mongoose schemas defining the data structure.
- `utils/`: Small, reusable helper functions.

***

## 📊 Database Models

- **User**: Core profile data, auth, XP, levels, and founder-specific metrics.
- **Post**: Content, images, polls, hashtags, reactions, and community links.
- **Comment**: Threaded discussions attached to posts.
- **Event**: Details for community gatherings and RSVP management.
- **Notification**: Real-time alerts for likes, follows, comments, and level-ups.
- **Hashtag**: Tracking trending topics across the platform.

***

## 🌟 Unique Architectural Choices

- **SSE for Real-time**: Instead of heavy WebSockets, the project uses Server-Sent Events for efficient, one-way real-time updates (notifications).
- **GSAP Animations**: Heavy use of GSAP ensures that the UI feels fluid and premium.
- **Anonymous Posting**: A privacy-focused feature allowing users to share thoughts without judgment.
- **XP-driven Engagement**: Encourages user activity through a rewarding progression system.

***

*Report generated on March 22, 2026*
