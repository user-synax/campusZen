"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, TrendingUp, Hash, Users2, Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import FollowButton from "@/components/user/FollowButton";
import useUser from "@/hooks/useUser";
import TrendingPosts from "@/components/feed/TrendingPosts";
import clientCache from "@/lib/client-cache";
import { Button } from "@/components/ui/button";

function SectionCard({ children, className = "" }) {
    return (
        <div className={`bg-card border border-border/40 rounded-[16px] shadow-sm overflow-hidden hover:border-border/60 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] ${className}`}>
            {children}
        </div>
    );
}

export default function RightPanel() {
    const { user: currentUser } = useUser();
    const [trending, setTrending] = useState([]);
    const [trendingHashtags, setTrendingHashtags] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const panelRef = useRef(null);

    useEffect(() => {
        const el = panelRef.current;
        if (el) requestAnimationFrame(() => el.classList.add("is-shown"));
    }, []);

    useEffect(() => {
        const CACHE_KEY = "cx_right_panel_data";
        const CACHE_TTL = 5 * 60 * 1000;
        const fetchData = async () => {
            const cached = clientCache.get(CACHE_KEY);
            if (cached) {
                setTrending(cached.trending || []);
                setSuggestions(cached.suggestions || []);
                setTrendingHashtags(cached.trendingHashtags || []);
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const [trendRes, suggestRes, hashtagRes] = await Promise.all([
                    fetch("/api/communities?limit=5"),
                    fetch("/api/users/suggestions?limit=5"),
                    fetch("/api/hashtags/trending?limit=6"),
                ]);
                const trendData = await trendRes.json();
                const suggestData = await suggestRes.json();
                const hashtagData = await hashtagRes.json();
                const trendingVal = trendRes.ok ? trendData : [];
                const suggestionsVal = suggestRes.ok ? suggestData : [];
                const hashtagsVal = hashtagRes.ok ? (hashtagData.hashtags || []) : [];
                setTrending(trendingVal);
                setSuggestions(suggestionsVal);
                setTrendingHashtags(hashtagsVal);
                clientCache.set(CACHE_KEY, { trending: trendingVal, suggestions: suggestionsVal, trendingHashtags: hashtagsVal }, CACHE_TTL);
            } catch (e) {
                console.error("Right panel fetch error:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const formatCount = (c) => (c >= 1000 ? (c / 1000).toFixed(1) + "k" : c);

    return (
        <aside className="hidden xl:block fixed right-0 top-0 h-screen w-[320px] xl:w-[340px] pr-3 pl-5 py-2.5 overflow-y-auto custom-scrollbar bg-background">
            <div ref={panelRef} className="t-stagger space-y-2.5">
                {/* Search — compact */}
                <div className="t-stagger-line sticky top-0 z-10 bg-background/80 backdrop-blur-xl pt-1 pb-2.5 -mx-1 px-1" style={{ "--i": 0 }}>
                    <Link href="/search" className="group flex items-center gap-2.5 bg-muted/70 hover:bg-background border border-transparent hover:border-border/60 rounded-full px-3.5 py-2 hover:cursor-pointer transition-all duration-[var(--duration-fast)] focus-within:bg-background focus-within:border-[#4ba9e1]/30 focus-within:ring-2 focus-within:ring-[#4ba9e1]/15">
                        <Search className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-focus-within:text-[#4ba9e1] transition-colors duration-[var(--duration-fast)] shrink-0" />
                        <span className="text-[13px] text-muted-foreground truncate">Search CampusZen</span>
                    </Link>
                </div>

                {/* Premium upsell — compact */}
                <SectionCard className="t-stagger-line p-3" style={{ "--i": 1 }}>
                    <h2 className="text-[16px] font-extrabold tracking-tight leading-none">Subscribe to Premium</h2>
                    <p className="text-[12px] text-muted-foreground leading-snug mt-1.5">Unlock custom themes, animated banners, and ad-free violet.</p>
                    <Button className="mt-2.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-4 py-2 h-7 text-[12px] hover:cursor-pointer transition-all duration-[var(--duration-fast)] hover:-translate-y-[1px] active:translate-y-0">
                        Subscribe
                    </Button>
                </SectionCard>

                {/* What's happening — compact */}
                <SectionCard className="t-stagger-line" style={{ "--i": 2 }}>
                    <div className="p-3 pb-1.5">
                        <h3 className="text-[15px] font-bold tracking-tight flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-muted-foreground" /> What&apos;s happening
                        </h3>
                    </div>

                    <div className="px-1.5 pb-1.5">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => (
                                <div key={i} className="flex items-center gap-2.5 px-2.5 py-2">
                                    <Skeleton className="h-3 w-5 rounded" />
                                    <div className="flex-1 space-y-1">
                                        <Skeleton className="h-3.5 w-24" />
                                        <Skeleton className="h-2.5 w-14" />
                                    </div>
                                </div>
                            ))
                        ) : trending.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground text-center py-2">No trends yet.</p>
                        ) : (
                            trending.slice(0, 5).map((item) => (
                                <Link key={item.slug} href={`/community/${item.slug}`} className="group flex items-center justify-between px-2.5 py-2 rounded-[10px] hover:bg-accent/60 hover:cursor-pointer transition-colors duration-[var(--duration-fast)]">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[11px] text-muted-foreground leading-none">Trending</p>
                                        <p className="text-[13px] font-semibold truncate group-hover:text-foreground transition-colors">{item.name}</p>
                                        <p className="text-[11px] text-muted-foreground">{formatCount(item.postCount)} posts</p>
                                    </div>
                                    <span className="text-[11px] font-bold text-muted-foreground/30">›</span>
                                </Link>
                            ))
                        )}
                    </div>

                    <div className="border-t border-border/30">
                        <div className="p-2.5">
                            <TrendingPosts />
                        </div>
                    </div>

                    <div className="border-t border-border/30 p-2.5">
                        <div className="flex items-center gap-1.5 mb-1.5 px-1">
                            <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                            <h4 className="text-[12px] font-bold">Trending tags</h4>
                        </div>
                        {loading ? (
                            <div className="flex flex-wrap gap-1 px-1">
                                {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-6 w-14 rounded-full" />)}
                            </div>
                        ) : trendingHashtags.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground px-1 py-1">No tags trending.</p>
                        ) : (
                            <div className="flex flex-wrap gap-1 px-1">
                                {trendingHashtags.slice(0, 6).map((ht) => (
                                    <Link key={ht.tag} href={`/hashtag/${ht.tag}`} className="px-2.5 py-1 rounded-full bg-accent hover:bg-accent/80 border border-transparent hover:border-border text-[11px] font-semibold hover:text-foreground hover:cursor-pointer transition-all duration-[var(--duration-fast)]">
                                        #{ht.tag}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <Link href="/community" className="block px-3 py-2 text-[12px] text-[#4ba9e1] hover:bg-accent/40 rounded-b-[16px] hover:cursor-pointer transition-colors">
                        Show more
                    </Link>
                </SectionCard>

                {/* Who to follow — compact */}
                <SectionCard className="t-stagger-line" style={{ "--i": 3 }}>
                    <div className="p-3 pb-1.5">
                        <h3 className="text-[15px] font-bold tracking-tight flex items-center gap-1.5">
                            <Users2 className="w-4 h-4 text-muted-foreground" /> Who to follow
                        </h3>
                    </div>
                    <div className="px-1.5 pb-1.5 space-y-0.5">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => (
                                <div key={i} className="flex items-center gap-2.5 px-2.5 py-1.5">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <div className="flex-1 space-y-1">
                                        <Skeleton className="h-3 w-20" />
                                        <Skeleton className="h-2.5 w-14" />
                                    </div>
                                    <Skeleton className="h-7 w-14 rounded-full" />
                                </div>
                            ))
                        ) : suggestions.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground text-center py-2">No suggestions.</p>
                        ) : (
                            suggestions.slice(0, 3).map((u) => (
                                <div key={u._id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[10px] hover:bg-accent/50 transition-colors group">
                                    <Link href={`/profile/${u.username}`} className="flex items-center gap-2.5 min-w-0 flex-1 hover:cursor-pointer">
                                        <Avatar className="h-8 w-8 ring-1 ring-border/50 group-hover:ring-border transition-all">
                                            <AvatarImage src={u.avatar} alt={u.name} />
                                            <AvatarFallback className="text-[11px] font-bold bg-accent">{u.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-semibold leading-none truncate">{u.name}</p>
                                            <p className="text-[11px] text-muted-foreground truncate">@{u.username}</p>
                                        </div>
                                    </Link>
                                    <FollowButton targetUserId={u._id} username={u.username} initialIsFollowing={currentUser?.following?.includes(u._id)} size="xs" className="rounded-full bg-foreground text-background hover:bg-foreground/90 dark:bg-white dark:text-black font-bold px-3 h-7 text-[11px] hover:cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]" />
                                </div>
                            ))
                        )}
                    </div>
                    <Link href="/connect" className="block px-3 py-2 text-[12px] text-[#4ba9e1] hover:bg-accent/40 rounded-b-[16px] hover:cursor-pointer transition-colors">
                        Show more
                    </Link>
                </SectionCard>

                {/* Footer — compact, no sparkle */}
                <div className="t-stagger-line px-3 py-2.5 text-[11px] leading-4 text-muted-foreground/60 space-y-1.5" style={{ "--i": 4 }}>
                    <div className="flex flex-wrap gap-x-2.5 gap-y-1">
                        {[
                            ["Terms", "/terms"],
                            ["Privacy", "/privacy"],
                            ["Docs", "/docs"],
                            ["Brand", "/brand"],
                            ["About", "/about"],
                        ].map(([label, href]) => (
                            <Link key={label} href={href} className="hover:underline hover:text-muted-foreground hover:cursor-pointer underline-offset-2 transition-colors">
                                {label}
                            </Link>
                        ))}
                        <a href="https://instagram.com/user.__.ayush" target="_blank" rel="noopener" className="hover:underline hover:cursor-pointer">
                            Developer
                        </a>
                    </div>
                    <p className="flex items-center gap-1 text-[11px]">
                        <Crown className="w-3 h-3 text-muted-foreground" /> © {new Date().getFullYear()} CampusZen · v2.0
                    </p>
                </div>
            </div>
        </aside>
    );
}
