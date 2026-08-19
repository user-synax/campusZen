import {
    Home,
    GraduationCap,
    MessageSquare,
    Bell,
    Link2,
    Bookmark,
    Trophy,
    CircleStar,
    ShoppingBag,
    Wallet,
    Video,
    BookOpen,
    Calendar,
    Terminal,
    BookText,
    CreditCard,
    Settings,
    Shield,
    BarChart2,
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

export const gamificationItems = [
    { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
    { label: "Ranks", href: "/ranks", icon: CircleStar },
    { label: "Shop", href: "/shop", icon: ShoppingBag },
    { label: "Wallet", href: "/wallet", icon: Wallet },
];

export const moreItems = [
    { label: "Clips", href: "/clips", icon: Video },
    { label: "Resources", href: "/resources", icon: BookOpen },
    { label: "Events", href: "/events", icon: Calendar },
    { label: "Tools", href: "/tools", icon: Terminal },
];

export const bottomNavItems = [
    { label: "Docs", href: "/docs", icon: BookText },
    { label: "Billing", href: "/billing", icon: CreditCard },
    { label: "Settings", href: "/settings", icon: Settings },
];

export const adminItems = [
    { href: "/admin", icon: Shield, label: "Dashboard", color: "text-amber-500" },
    {
        href: "/admin/resources",
        icon: BookOpen,
        label: "Review",
        badgeKey: "pendingResources",
    },
    { href: "/analytics", icon: BarChart2, label: "Analytics" },
];
