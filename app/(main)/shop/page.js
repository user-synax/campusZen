"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Loader2, Store, ShoppingBag, Package } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { cn } from "@/lib/utils";
import useUser from "@/hooks/useUser";
import ShopItemCard from "@/components/shop/ShopItemCard";

// Stable across renders — module-level. Do NOT inline inside the
// component (would break memo dependencies).
const MVP_CATEGORIES = [
    { value: "profile_banner", label: "Profile Banner" },
    { value: "avatar_frame", label: "Avatar Frame" },
    { value: "profile_bg", label: "Background Effect" },
    { value: "special_badge", label: "Cosmetic Badge" },
    { value: "profile_layout", label: "Profile Layout" },
];

// Partition into [owned, purchasable] ONCE per items change.
// This is the single filter pass — categories can group from it cheaply.
function partitionItems(items) {
    const owned = [];
    const purchasable = [];
    for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.owned) owned.push(it);
        else purchasable.push(it);
    }
    return { owned, purchasable };
}

// Group a pre-filtered item list by category — preserving the
// MVP_CATEGORIES display order. Returns [] for categories with no matches.
function groupByCategory(itemList) {
    // Index lookup for perf (avoids per-item O(categories) scan).
    const byCategory = new Map();
    for (const it of itemList) {
        const list = byCategory.get(it.category);
        if (list) list.push(it);
        else byCategory.set(it.category, [it]);
    }
    return MVP_CATEGORIES.map((cat) => ({
        ...cat,
        items: byCategory.get(cat.value) || [],
    }));
}

// Renders the categorized item grid for a single tab pane.
// Extracted as a stable memoized component so tab switching does NOT
// re-instantiate cards (banner preview latched-in-view state persists).
function CategorySections({ groups, onPurchase, onEquip, onUnequip }) {
    const anyItems = groups.some((g) => g.items.length > 0);
    if (!anyItems) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                <div className="w-14 h-14 rounded-2xl bg-accent/40 border border-border/40 flex items-center justify-center text-muted-foreground">
                    <Package className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-foreground/80">
                    Nothing here yet
                </p>
                <p className="text-xs text-muted-foreground max-w-xs">
                    Items in this tab will show up as soon as they&apos;re
                    available.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {groups.map((group) =>
                group.items.length === 0 ? null : (
                    <section key={group.value}>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                            {group.label}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {group.items.map((item) => (
                                <ShopItemCard
                                    key={item._id}
                                    item={item}
                                    onPurchase={onPurchase}
                                    onEquip={onEquip}
                                    onUnequip={onUnequip}
                                />
                            ))}
                        </div>
                    </section>
                ),
            )}
        </div>
    );
}
const MemoCategorySections = CategorySections; // no memo() needed — children
// prop stability from useMemo below already prevents renders; adding
// memo() would be a wasted shallow-compare in the common case.

export default function ShopPage() {
    const { user, loading: userLoading } = useUser();
    const [items, setItems] = useState([]);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("purchase");

    // ── Data loading ──
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/shop");
            const data = await res.json();
            if (res.ok) setItems(data.items || []);
            else toast.error(data.message || "Failed to load shop");
        } catch (error) {
            console.error("Shop load error:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (user) setBalance(user.vp || 0);
    }, [user]);

    // ── Partition + group (memoized, single pass) ──
    const { owned, purchasable } = useMemo(
        () => partitionItems(items),
        [items],
    );

    const ownedGroups = useMemo(() => groupByCategory(owned), [owned]);
    const purchasableGroups = useMemo(
        () => groupByCategory(purchasable),
        [purchasable],
    );

    const ownedCount = owned.length;
    const purchasableCount = purchasable.length;

    // ── Item mutations (stable handlers) ──
    const updateItem = useCallback((id, patch) => {
        setItems((prev) =>
            prev.map((it) => (it._id === id ? { ...it, ...patch } : it)),
        );
    }, []);

    const handlePurchase = useCallback(
        async (item) => {
            try {
                const res = await fetch("/api/shop/purchase", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ itemId: item._id }),
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    updateItem(item._id, { owned: true, equipped: true });
                    setItems((prev) =>
                        prev.map((it) =>
                            it.category === item.category && it._id !== item._id
                                ? { ...it, equipped: false }
                                : it,
                        ),
                    );
                    setBalance(data.balance);
                    toast.success(`Purchased ${item.name}!`);
                } else {
                    const errorMsg =
                        data.reason === "insufficient_balance"
                            ? "Insufficient balance"
                            : data.message || "Purchase failed";
                    toast.error(errorMsg);
                }
            } catch (error) {
                toast.error("Network error");
            }
        },
        [updateItem],
    );

    const handleEquip = useCallback(async (item) => {
        try {
            const res = await fetch("/api/shop/equip", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId: item._id }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setItems((prev) =>
                    prev.map((it) =>
                        it.category === item.category
                            ? { ...it, equipped: it._id === item._id }
                            : it,
                    ),
                );
                toast.success(`Equipped ${item.name}`);
            } else {
                toast.error(data.message || "Equip failed");
            }
        } catch (error) {
            toast.error("Network error");
        }
    }, []);

    const handleUnequip = useCallback(async (item) => {
        try {
            const res = await fetch("/api/shop/equip", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category: item.category }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setItems((prev) =>
                    prev.map((it) =>
                        it.category === item.category
                            ? { ...it, equipped: false }
                            : it,
                    ),
                );
            } else {
                toast.error(data.message || "Unequip failed");
            }
        } catch (error) {
            toast.error("Network error");
        }
    }, []);

    if (userLoading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Store className="w-6 h-6 text-primary" />
                    <h1 className="text-2xl font-black tracking-tight">Shop</h1>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/40 px-3 py-1.5 text-sm font-bold tabular-nums">
                    <Image
                        src="/icon/vp-coin.png"
                        width={24}
                        height={24}
                        alt=""
                        className="w-4 h-4 text-primary"
                    />{" "}
                    {balance.toLocaleString("en-IN")} VP
                </div>
            </div>

            {/* Tabs */}
            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
            >
                <TabsList className="w-full grid grid-cols-2 p-1 bg-accent/40 border border-border/40">
                    <TabsTrigger
                        value="purchase"
                        className="gap-2 font-semibold"
                    >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Purchase</span>
                        {purchasableCount > 0 && (
                            <span className="ml-0.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[10px] rounded-full bg-primary/15 text-primary tabular-nums">
                                {purchasableCount}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="owned" className="gap-2 font-semibold">
                        <Package className="w-4 h-4" />
                        <span>Owned</span>
                        {ownedCount > 0 && (
                            <span className="ml-0.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[10px] rounded-full bg-primary/15 text-primary tabular-nums">
                                {ownedCount}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* Performance note: BOTH TabsContent panels are kept in the
                    React tree at all times via `forceMount` + `hidden` class.
                    Without forceMount, Radix unmounts the inactive tab, which
                    destroys banner preview latched-in-view state and causes
                    GIFs/videos to re-fetch on every toggle. We apply our own
                    `hidden` based on activeTab so display:none hides the
                    inactive one — React nodes survive, IntersectionObserver
                    pauses the display:none videos automatically. */}
                <TabsContent
                    value="purchase"
                    forceMount
                    className={cn(
                        "mt-6 focus-visible:outline-none focus-visible:ring-0",
                        activeTab !== "purchase" && "hidden",
                    )}
                >
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <MemoCategorySections
                            groups={purchasableGroups}
                            onPurchase={handlePurchase}
                            onEquip={handleEquip}
                            onUnequip={handleUnequip}
                        />
                    )}
                </TabsContent>

                <TabsContent
                    value="owned"
                    forceMount
                    className={cn(
                        "mt-6 focus-visible:outline-none focus-visible:ring-0",
                        activeTab !== "owned" && "hidden",
                    )}
                >
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <MemoCategorySections
                            groups={ownedGroups}
                            onPurchase={handlePurchase}
                            onEquip={handleEquip}
                            onUnequip={handleUnequip}
                        />
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
