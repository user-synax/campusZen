import {
    Home,
    GraduationCap,
    MessageSquare,
    Bell,
    Link2,
    Bookmark,
    BookOpen,
    BookText,
    Settings,
    Shield,
} from "lucide-react";

// Shared navigation config used by Sidebar, Dock, and MobileNav.
// `badgeKey` marks items whose count is computed at render time by the
// consuming component (the actual value lives in a hook, not here).

export const primaryNavItems = [
    { label: "Feed", href: "/feed", icon: Home },
    { label: "Communities", href: "/community", icon: GraduationCap },
    { label: "Chats", href: "/chats", icon: MessageSquare, badgeKey: "chatUnread" },
    {
        label: "Notifications",
        href: "/notifications",
        icon: Bell,
        badgeKey: "unreadCount",
    },
    { label: "Connect", href: "/connect", icon: Link2 },
    { label: "Bookmarks", href: "/bookmarks", icon: Bookmark },
];

export const moreItems = [
    { label: "Resources", href: "/resources", icon: BookOpen },
];

export const bottomNavItems = [
    { label: "Docs", href: "/docs", icon: BookText },
    { label: "Settings", href: "/settings", icon: Settings },
];

export const adminItems = [
    { href: "/admin", icon: Shield, label: "Dashboard", color: "text-amber-500" },
];
