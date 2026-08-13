"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    FileText,
    Heart,
    MessageCircle,
    UserPlus,
    Share2,
    Upload,
    CalendarCheck,
    CalendarDays,
    ShoppingBag,
    Gift,
    RotateCcw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import InfiniteScrollSentinel from "@/components/shared/InfiniteScrollSentinel";
import { VP_AWARDS } from "@/lib/ranks";
import { CURRENCY } from "@/lib/currency";

// Human-readable metadata for every ledger reason.
const REASON_META = {
    post: { label: "Created a post", icon: FileText },
    like: { label: "Gave a like", icon: Heart },
    comment: { label: "Wrote a comment", icon: MessageCircle },
    follow: { label: "Followed someone", icon: UserPlus },
    resource_share: { label: "Shared a resource", icon: Share2 },
    resource_upload: { label: "Uploaded a resource", icon: Upload },
    daily_login: { label: "Daily login", icon: CalendarCheck },
    event_rsvp: { label: "RSVP'd to an event", icon: CalendarDays },
    purchase: { label: "Purchase", icon: ShoppingBag },
    shop_purchase: { label: "Shop Purchase", icon: ShoppingBag },
    admin_adjust: { label: "Admin adjustment", icon: Gift },
    admin_gift: { label: "Gift from Admin", icon: Gift },
    gift: { label: "Gift", icon: Gift },
    refund: { label: "Refund", icon: RotateCcw },
};

// Actions surfaced in the "How to earn" section (spec list + natural extras).
const EARN_ACTIONS = [
    "post",
    "like",
    "comment",
    "follow",
    "resource_share",
    "daily_login",
    "resource_upload",
    "event_rsvp",
];

function reasonLabel(reason) {
    return REASON_META[reason]?.label || reason;
}
function ReasonIcon({ reason, className }) {
    const Icon = REASON_META[reason]?.icon || Gift;
    return <Icon className={className} />;
}

export default function WalletPage() {
    const router = useRouter();

    // ── Balance (cached field, GET /api/wallet) ──
    const [balance, setBalance] = useState(0);
    const [currencyName, setCurrencyName] = useState(CURRENCY.name);
    const [currencyShort, setCurrencyShort] = useState(CURRENCY.shortName);
    const [balanceLoading, setBalanceLoading] = useState(true);
    const [balanceError, setBalanceError] = useState(false);
    const [iconFailed, setIconFailed] = useState(false);

    // ── Transaction history (cursor pagination, GET /api/wallet/history) ──
    const [txns, setTxns] = useState([]);
    const [cursor, setCursor] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [historyError, setHistoryError] = useState(false);
    const loadingRef = useRef(false);

    const loadBalance = useCallback(async () => {
        setBalanceLoading(true);
        setBalanceError(false);
        try {
            const res = await fetch("/api/wallet");
            if (!res.ok) throw new Error("failed");
            const data = await res.json();
            setBalance(data.balance ?? 0);
            if (data.currencyName) setCurrencyName(data.currencyName);
            if (data.currency) setCurrencyShort(data.currency);
        } catch {
            setBalanceError(true);
        } finally {
            setBalanceLoading(false);
        }
    }, []);

    const fetchHistory = useCallback(async (currentCursor, append) => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        if (!append) setLoadingHistory(true);
        setHistoryError(false);
        try {
            const url = `/api/wallet/history?limit=20${
                currentCursor
                    ? `&cursor=${encodeURIComponent(currentCursor)}`
                    : ""
            }`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("failed");
            const data = await res.json();
            const items = data.transactions || [];
            setTxns((prev) => {
                const merged = append ? [...prev, ...items] : items;
                const seen = new Set();
                return merged.filter((t) => {
                    if (seen.has(t._id)) return false;
                    seen.add(t._id);
                    return true;
                });
            });
            setCursor(data.nextCursor || null);
            setHasMore(!!data.hasNextPage);
        } catch {
            setHistoryError(true);
        } finally {
            setLoadingHistory(false);
            loadingRef.current = false;
        }
    }, []);

    useEffect(() => {
        loadBalance();
        fetchHistory(null, false);
    }, [loadBalance, fetchHistory]);

    const loadMore = useCallback(() => {
        if (!hasMore || loadingRef.current) return;
        fetchHistory(cursor, true);
    }, [hasMore, cursor, fetchHistory]);

    const { sentinelRef } = useInfiniteScroll({
        fetchMore: loadMore,
        hasMore,
        loading: loadingHistory,
    });

    const retryAll = () => {
        loadBalance();
        setTxns([]);
        setCursor(null);
        fetchHistory(null, false);
    };

    return (
        <div className="flex flex-col bg-background max-w-2xl mx-auto w-full min-h-[calc(100vh-64px)]">
            {/* Sticky header */}
            <div className="sticky top-0 bg-background/80 backdrop-blur border-b border-border z-10">
                <div className="flex items-center gap-3 px-4 py-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="rounded-full"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-xl font-bold">Wallet</h1>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar">
                {/* ── A. Balance Header ── */}
                <Card className="bg-accent/30 card-chunky rounded-2xl">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                            {iconFailed ? (
                                <span className="text-3xl">🪙</span>
                            ) : (
                                <img
                                    src={CURRENCY.iconPath}
                                    alt={currencyName}
                                    className="w-9 h-9 object-contain"
                                    onError={() => setIconFailed(true)}
                                />
                            )}
                        </div>
                        <div className="min-w-0">
                            {balanceLoading ? (
                                <Skeleton className="h-9 w-36 mb-2" />
                            ) : (
                                <p className="text-4xl font-black text-foreground tracking-tight tabular-nums">
                                    {balance.toLocaleString("en-IN")}
                                </p>
                            )}
                            <p className="text-sm font-bold text-primary">
                                {currencyName}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {balanceError && !balanceLoading && (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-destructive/10 border border-destructive/20">
                        <p className="text-sm text-destructive">
                            Couldn&apos;t load your balance.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadBalance}
                            className="rounded-full"
                        >
                            Retry
                        </Button>
                    </div>
                )}

                {/* ── B. Earn-VP Info Section ── */}
                <section className="space-y-3">
                    <div className="flex items-center gap-2 text-primary">
                        <Gift className="w-5 h-5" />
                        <h2 className="font-bold uppercase tracking-wider text-xs">
                            How to earn {currencyShort}
                        </h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {EARN_ACTIONS.map((key) => {
                            const meta = REASON_META[key];
                            const Icon = meta.icon;
                            const amt = VP_AWARDS[key] || 0;
                            return (
                                <div
                                    key={key}
                                    className="card-chunky bg-card rounded-2xl p-3 flex flex-col gap-2"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Icon className="w-4 h-4 text-primary" />
                                    </div>
                                    <p className="text-xs font-semibold text-foreground leading-tight">
                                        {meta.label}
                                    </p>
                                    <p className="text-xs font-bold text-primary">
                                        +{amt} {currencyShort}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ── C. Transaction History ── */}
                <section className="space-y-3">
                    <div className="flex items-center gap-2 text-primary">
                        <CalendarDays className="w-5 h-5" />
                        <h2 className="font-bold uppercase tracking-wider text-xs">
                            Transaction History
                        </h2>
                    </div>

                    <Card className="bg-card card-chunky rounded-2xl overflow-hidden">
                        {loadingHistory && txns.length === 0 ? (
                            <div className="divide-y divide-border/40">
                                {Array(6)
                                    .fill(0)
                                    .map((_, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between p-3"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Skeleton className="w-9 h-9 rounded-xl" />
                                                <div className="space-y-2">
                                                    <Skeleton className="h-3 w-32" />
                                                    <Skeleton className="h-2 w-20" />
                                                </div>
                                            </div>
                                            <Skeleton className="h-4 w-12" />
                                        </div>
                                    ))}
                            </div>
                        ) : txns.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <Gift className="w-6 h-6 text-primary" />
                                </div>
                                <p className="text-sm font-semibold text-foreground">
                                    No transactions yet
                                </p>
                                <p className="text-xs text-muted-foreground max-w-[16rem]">
                                    Earn {currencyShort} by posting, liking,
                                    commenting, and more. Your activity will
                                    show up here.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/40">
                                {txns.map((t) => {
                                    const isEarn = t.type === "earn";
                                    return (
                                        <div
                                            key={t._id}
                                            className="flex items-center justify-between p-3"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div
                                                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                                        isEarn
                                                            ? "bg-green-500/10"
                                                            : "bg-destructive/10"
                                                    }`}
                                                >
                                                    <ReasonIcon
                                                        reason={t.reason}
                                                        className={`w-4 h-4 ${
                                                            isEarn
                                                                ? "text-green-500"
                                                                : "text-destructive"
                                                        }`}
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-foreground truncate">
                                                        {reasonLabel(t.reason)}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(
                                                            new Date(
                                                                t.createdAt,
                                                            ),
                                                            {
                                                                addSuffix: true,
                                                            },
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <span
                                                className={`text-sm font-bold tabular-nums shrink-0 ${
                                                    isEarn
                                                        ? "text-green-500"
                                                        : "text-destructive"
                                                }`}
                                            >
                                                {isEarn ? "+" : ""}
                                                {t.amount} {currencyShort}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>

                    {/* Infinite scroll sentinel */}
                    {txns.length > 0 && (
                        <div ref={sentinelRef}>
                            <InfiniteScrollSentinel
                                loading={loadingHistory}
                                hasMore={hasMore}
                                error={historyError}
                                onRetry={loadMore}
                            />
                        </div>
                    )}

                    {/* Full-section error (e.g. initial history load failed) */}
                    {historyError && txns.length === 0 && (
                        <div className="flex flex-col items-center gap-3 py-8">
                            <p className="text-sm text-muted-foreground">
                                Couldn&apos;t load your transactions.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={retryAll}
                                className="rounded-full"
                            >
                                Try again
                            </Button>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
