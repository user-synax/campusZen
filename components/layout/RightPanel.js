"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Hash, Calendar, Users2, ChevronDown, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import FollowButton from "@/components/user/FollowButton";
import useUser from "@/hooks/useUser";
import TrendingPosts from "@/components/feed/TrendingPosts";

// ─── localStorage helpers ─────────────────────────────────────────────────────
function readLocalBool(key, defaultValue) {
    if (typeof window === "undefined") return defaultValue;
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return raw === "true";
}

function writeLocalBool(key, value) {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, String(value));
}

// ─── Accordion section header ─────────────────────────────────────────────────
function AccordionSection({ icon: Icon, title, storageKey, defaultOpen = false, rightElement, children }) {
    const [open, setOpen] = useState(defaultOpen);

    useEffect(() => {
        setOpen(readLocalBool(storageKey, defaultOpen));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggle = () => {
        const next = !open;
        setOpen(next);
        writeLocalBool(storageKey, next);
    };

    return (
        <>
            {/* Header row — acts as toggle */}
            <button
                onClick={toggle}
                className="chip-chunky hover:cursor-pointer flex items-center justify-between w-[calc(100%-1rem)] mx-2 my-1 p-3.5 group text-left"
                aria-expanded={open}
            >
                <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors duration-150" />
                    <h3 className="text-sm font-bold">{title}</h3>
                </div>
                <div className="flex items-center gap-2">
                    {rightElement}
                    {open ? (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors duration-150 shrink-0" />
                    ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors duration-150 shrink-0" />
                    )}
                </div>
            </button>

            {/* Content — only rendered when open */}
            {open && (
                <div className="px-4 pb-4">
                    {children}
                </div>
            )}
        </>
    );
}

export default function RightPanel() {
    const { user: currentUser, loading: userLoading } = useUser();
    const [trending, setTrending] = useState([]);
    const [trendingHashtags, setTrendingHashtags] = useState([]);
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [trendRes, suggestRes, hashtagRes, eventRes] =
                    await Promise.all([
                        fetch("/api/communities?limit=5"),
                        fetch("/api/users/suggestions?limit=9"),
                        fetch("/api/hashtags/trending?limit=6"),
                        fetch("/api/events?filter=upcoming&limit=3"),
                    ]);

                const trendData = await trendRes.json();
                const suggestData = await suggestRes.json();
                const hashtagData = await hashtagRes.json();
                const eventData = await eventRes.json();

                if (trendRes.ok) setTrending(trendData);
                if (suggestRes.ok) setSuggestions(suggestData);
                if (hashtagRes.ok)
                    setTrendingHashtags(hashtagData.hashtags || []);
                if (eventRes.ok) setUpcomingEvents(eventData.events || []);
            } catch (error) {
                console.error("Right panel fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const formatCount = (count) => {
        if (count >= 1000) return (count / 1000).toFixed(1) + "k";
        return count;
    };

    // After loading, hide the Events section entirely if there are no events
    const showEventsSection = loading || upcomingEvents.length > 0;

    return (
        <aside className="hidden xl:block fixed right-0 top-0 h-screen w-87.5 py-4 px-3 overflow-y-auto custom-scrollbar">
            {/* Unified panel */}
            <div className="card-chunky bg-card overflow-hidden">
                {/* ── Trending Communities — always expanded ── */}
                <section className="p-4">
                    <div className="flex items-center justify-between mb-3.5">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                            <h3 className="text-sm font-bold">
                                Trending Communities
                            </h3>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            Array(3)
                                .fill(0)
                                .map((_, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-3"
                                    >
                                        <Skeleton className="h-3 w-4 bg-secondary rounded" />
                                        <div className="flex-1 space-y-1.5">
                                            <Skeleton className="h-3.5 w-28 bg-secondary" />
                                            <Skeleton className="h-2.5 w-16 bg-secondary" />
                                        </div>
                                    </div>
                                ))
                        ) : trending.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">
                                No trending communities yet.
                            </p>
                        ) : (
                            trending.slice(0, 5).map((item, i) => (
                                <Link
                                    key={item.slug}
                                    href={`/community/${item.slug}`}
                                    className="group flex items-center gap-3"
                                >
                                    <span className="text-[11px] font-bold text-muted-foreground/40 w-4 shrink-0 tabular-nums select-none">
                                        {String(i + 1).padStart(2, "0")}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors duration-150">
                                            {item.name}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {item.postCount} posts ·{" "}
                                            {item.memberCount} members
                                        </p>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </section>

                <div className="border-t border-border/40" />

                {/* ── Trending Posts ── */}
                <section className="p-4">
                    <TrendingPosts />
                </section>

                <div className="border-t border-border/40" />

                {/* ── Trending Hashtags — collapsible, closed by default ── */}
                <AccordionSection
                    icon={Hash}
                    title="Trending Hashtags"
                    storageKey="cx_rp_hashtags_open"
                    defaultOpen={false}
                >
                    <div className="space-y-0.5">
                        {loading ? (
                            Array(3)
                                .fill(0)
                                .map((_, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between px-2 py-1.5"
                                    >
                                        <Skeleton className="h-3.5 w-20 bg-secondary" />
                                        <Skeleton className="h-2.5 w-10 bg-secondary" />
                                    </div>
                                ))
                        ) : trendingHashtags.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">
                                No trending hashtags yet.
                            </p>
                        ) : (
                            trendingHashtags.map((ht, i) => (
                                <Link
                                    key={ht.tag}
                                    href={`/hashtag/${ht.tag}`}
                                    className="group flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-accent/60 transition-all duration-150"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="text-[11px] font-bold text-muted-foreground/40 w-4 shrink-0 tabular-nums select-none">
                                            {i + 1}
                                        </span>
                                        <span className="text-sm font-semibold text-primary truncate">
                                            #{ht.tag}
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-muted-foreground shrink-0 pl-2">
                                        {formatCount(ht.postCount)} posts
                                    </span>
                                </Link>
                            ))
                        )}
                    </div>
                </AccordionSection>

                {/* ── Upcoming Events — collapsible, closed by default, hidden if empty ── */}
                {showEventsSection && (
                    <>
                        <div className="border-t border-border/40" />
                        <AccordionSection
                            icon={Calendar}
                            title="Upcoming Events"
                            storageKey="cx_rp_events_open"
                            defaultOpen={false}
                            rightElement={
                                <Link
                                    href="/events"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[11px] text-primary font-medium hover:underline underline-offset-2"
                                >
                                    See all
                                </Link>
                            }
                        >
                            <div className="space-y-3">
                                {loading ? (
                                    Array(3)
                                        .fill(0)
                                        .map((_, i) => (
                                            <div key={i} className="flex gap-3">
                                                <Skeleton className="h-10 w-10 rounded-lg bg-secondary shrink-0" />
                                                <div className="flex-1 space-y-1.5">
                                                    <Skeleton className="h-3.5 w-32 bg-secondary" />
                                                    <Skeleton className="h-2.5 w-20 bg-secondary" />
                                                </div>
                                            </div>
                                        ))
                                ) : (
                                    upcomingEvents.map((event) => (
                                        <Link
                                            key={event._id}
                                            href={`/events/${event._id}`}
                                            className="group flex gap-3"
                                        >
                                            <div className="text-center bg-accent/50 rounded-lg px-2 py-1.5 shrink-0 min-w-[40px] border border-border/50 h-fit">
                                                <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-wide leading-none">
                                                    {format(
                                                        new Date(event.eventDate),
                                                        "MMM",
                                                    )}
                                                </p>
                                                <p className="text-base font-black leading-tight mt-0.5 tabular-nums">
                                                    {format(
                                                        new Date(event.eventDate),
                                                        "d",
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex-1 min-w-0 py-0.5">
                                                <p className="text-sm font-semibold group-hover:text-primary transition-colors duration-150 truncate">
                                                    {event.title}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground truncate">
                                                    {event.college}
                                                </p>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </AccordionSection>
                    </>
                )}

                <div className="border-t border-border/40" />

                {/* ── Who to Follow — collapsible, closed by default ── */}
                <AccordionSection
                    icon={Users2}
                    title="Who to Follow"
                    storageKey="cx_rp_follow_open"
                    defaultOpen={false}
                >
                    <div className="space-y-3">
                        {loading ? (
                            Array(3)
                                .fill(0)
                                .map((_, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-3"
                                    >
                                        <Skeleton className="h-8 w-8 rounded-full bg-secondary shrink-0" />
                                        <div className="flex-1 space-y-1.5">
                                            <Skeleton className="h-3.5 w-24 bg-secondary" />
                                            <Skeleton className="h-2.5 w-16 bg-secondary" />
                                        </div>
                                        <Skeleton className="h-6 w-14 rounded-full bg-secondary" />
                                    </div>
                                ))
                        ) : suggestions.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">
                                No suggestions found.
                            </p>
                        ) : (
                            suggestions.slice(-9).map((user) => (
                                <div
                                    key={user._id}
                                    className="flex items-center justify-between gap-2"
                                >
                                    <Link
                                        href={`/profile/${user.username}`}
                                        className="flex items-center gap-2.5 min-w-0 flex-1"
                                    >
                                        <Avatar className="h-8 w-8 shrink-0 ring-1 ring-border/60">
                                            <AvatarImage
                                                src={user.avatar}
                                                alt={user.name}
                                            />
                                            <AvatarFallback className="text-xs font-semibold">
                                                {user.name
                                                    ?.charAt(0)
                                                    ?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold group-hover:text-primary truncate leading-tight hover:text-primary transition-colors duration-150">
                                                {user.name}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground truncate">
                                                @{user.username}
                                            </p>
                                        </div>
                                    </Link>
                                    <FollowButton
                                        targetUserId={user._id}
                                        username={user.username}
                                        initialIsFollowing={currentUser?.following?.includes(
                                            user._id,
                                        )}
                                        size="xs"
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </AccordionSection>
            </div>

            {/* Footer */}
            <footer className="mt-4 px-1 text-[10px] text-muted-foreground/50 space-y-1.5 pb-2">
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <Link
                        href="/terms"
                        className="hover:text-muted-foreground transition-colors"
                    >
                        Terms
                    </Link>
                    <Link
                        href="/privacy"
                        className="hover:text-muted-foreground transition-colors"
                    >
                        Privacy
                    </Link>
                    <Link
                        href="https://instagram.com/user.__.ayush"
                        target="blank_"
                        className="hover:text-muted-foreground transition-colors"
                    >
                        Developer
                    </Link>
                </div>
                <p>
                    © {new Date().getFullYear()} CampusZen · Built for students
                </p>
                <p>
                    V - 1.0.0
                </p>
            </footer>
        </aside>
    );
}