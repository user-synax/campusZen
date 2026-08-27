"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { LogOut, User, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/shared/Logo";

const NAV_LINKS = [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "About", href: "/about" },
    { label: "Brand", href: "/brand" },
    { label: "Developers", href: "/developers" },
];

/* The stagger snippet exits over a flat 200ms, independent of the entrance. */
const STAGGER_EXIT_MS = 200;

/** Read a duration token off :root so JS timers stay in sync with the CSS. */
function readMs(name, fallback) {
    if (typeof window === "undefined") return fallback;
    const raw = getComputedStyle(document.documentElement).getPropertyValue(
        name,
    );
    return parseFloat(raw) || fallback;
}

export default function Navbar() {
    const pathname = usePathname();

    const [scrolled, setScrolled] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hoveredHref, setHoveredHref] = useState(null);
    const [mobileOpen, setMobileOpen] = useState(false);

    const pillRef = useRef(null);
    const tabRefs = useRef(new Map());
    const panelRef = useRef(null);
    const hadPillTargetRef = useRef(false);
    const hasOpenedRef = useRef(false);
    const rafRef = useRef(0);
    const timersRef = useRef([]);

    /* ── Data ──────────────────────────────────────────────────────────── */

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        let active = true;
        const checkSession = async () => {
            try {
                const res = await fetch("/api/users/me");
                if (res.ok) {
                    const data = await res.json();
                    if (active) setUser(data.user);
                }
            } catch (error) {
                console.error("Failed to fetch session:", error);
            } finally {
                if (active) setLoading(false);
            }
        };
        checkSession();
        return () => {
            active = false;
        };
    }, []);

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            setUser(null);
            window.location.href = "/";
        } catch (error) {
            console.error("Failed to logout:", error);
        }
    };

    /* ── Sliding nav pill (16-tabs-sliding) ────────────────────────────── */

    const activeHref = useMemo(() => {
        const match = NAV_LINKS.find(
            (link) =>
                pathname === link.href ||
                pathname.startsWith(link.href + "/"),
        );
        return match ? match.href : null;
    }, [pathname]);

    /* Hover wins over the active route; on `/` neither matches, so the pill
       rests hidden and only appears under the cursor. */
    const pillHref = hoveredHref ?? activeHref;

    /* The snippet's moveTo helper. The transition:none → write → forced
       reflow → restore path is what lets an un-animated jump land without
       tweening; skipping the reflow makes the next move fail to replay. */
    const moveTo = useCallback((tab, animate) => {
        const pill = pillRef.current;
        if (!pill || !tab) return;
        if (!animate) {
            const prev = pill.style.transition;
            pill.style.transition = "none";
            pill.style.transform = `translateX(${tab.offsetLeft}px)`;
            pill.style.width = `${tab.offsetWidth}px`;
            void pill.offsetWidth;
            pill.style.transition = prev;
        } else {
            pill.style.transform = `translateX(${tab.offsetLeft}px)`;
            pill.style.width = `${tab.offsetWidth}px`;
        }
    }, []);

    useEffect(() => {
        const pill = pillRef.current;
        if (!pill) return;

        const tab = pillHref ? tabRefs.current.get(pillHref) : null;
        if (!tab) {
            pill.style.opacity = "0";
            hadPillTargetRef.current = false;
            return;
        }

        const had = hadPillTargetRef.current;
        moveTo(tab, had);
        hadPillTargetRef.current = true;

        if (had) {
            pill.style.opacity = "1";
            return;
        }
        /* First target: position without animating, then fade in on the next
           frame. Without the split the pill would slide in from translateX(0). */
        rafRef.current = requestAnimationFrame(() => {
            pill.style.opacity = "1";
        });
        return () => cancelAnimationFrame(rafRef.current);
    }, [pillHref, moveTo]);

    /* Re-measure without animating when layout could have shifted under us. */
    useEffect(() => {
        const remeasure = () => {
            const tab = pillHref ? tabRefs.current.get(pillHref) : null;
            if (tab) moveTo(tab, false);
        };
        window.addEventListener("resize", remeasure);
        if (typeof document !== "undefined" && document.fonts?.ready) {
            document.fonts.ready.then(remeasure).catch(() => {});
        }
        return () => window.removeEventListener("resize", remeasure);
    }, [pillHref, moveTo]);

    /* ── Mobile panel (05-menu-dropdown + 18-texts-reveal) ─────────────── */

    const closeMobile = useCallback(() => setMobileOpen(false), []);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!mobileOpen) return;
        const onKey = (event) => {
            if (event.key === "Escape") setMobileOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [mobileOpen]);

    useEffect(() => {
        const panel = panelRef.current;
        if (!panel) return;

        const clearTimers = () => {
            timersRef.current.forEach(clearTimeout);
            timersRef.current = [];
        };

        if (mobileOpen) {
            hasOpenedRef.current = true;
            panel.classList.remove("is-closing", "is-hiding", "is-shown");
            /* Forced reflow so a reopen replays the row stagger instead of
               resolving to the already-shown state. */
            void panel.offsetHeight;
            panel.classList.add("is-open", "is-shown");
            return clearTimers;
        }

        /* Nothing to close on first mount. */
        if (!hasOpenedRef.current) return;

        panel.classList.remove("is-open", "is-shown");
        panel.classList.add("is-closing", "is-hiding");
        /* Both classes must outlive their transitions, then be dropped — a
           stale .is-closing makes the next open jump from the closing scale. */
        timersRef.current = [
            setTimeout(
                () => panel.classList.remove("is-closing"),
                readMs("--dropdown-close-dur", 150),
            ),
            setTimeout(
                () => panel.classList.remove("is-hiding"),
                STAGGER_EXIT_MS,
            ),
        ];
        return clearTimers;
    }, [mobileOpen]);

    const mobileRows = useMemo(() => {
        const rows = NAV_LINKS.map((link) => ({ kind: "link", ...link }));
        /* Logged-in users already have the account chip in the bar. */
        if (!loading && !user) {
            rows.push(
                { kind: "divider" },
                { kind: "login" },
                { kind: "signup" },
            );
        }
        return rows;
    }, [loading, user]);

    /* ── Render ────────────────────────────────────────────────────────── */

    return (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 py-4 pointer-events-none">
            {/* Scrim — also serves as the outside-click target. Sits behind the
                bar, so clicks on the bar itself don't dismiss the menu. */}
            <div
                aria-hidden="true"
                onClick={closeMobile}
                className={cn(
                    "nav-scrim md:hidden fixed inset-0 -z-10 bg-background/60 backdrop-blur-sm",
                    mobileOpen && "is-open",
                )}
            />

            <header
                className={cn(
                    "nav-shell t-resize relative pointer-events-auto flex items-center justify-between px-3 sm:px-4 rounded-full border",
                    scrolled
                        ? "h-14 bg-background/80 backdrop-blur-xl border-border"
                        : "h-16 bg-background/40 backdrop-blur-md border-transparent",
                )}
                style={{
                    /* .t-resize transitions width + height. Pairing an explicit
                       width with max-width means the tween runs on wide
                       viewports and self-disables once max-width clamps the
                       used value. */
                    width: scrolled ? "56rem" : "64rem",
                    maxWidth: "100%",
                    /* Both states carry a same-shaped shadow so box-shadow
                       actually interpolates instead of snapping from `none`. */
                    boxShadow: scrolled
                        ? "var(--shadow-hard-sm)"
                        : "0 0 0px hsl(var(--shadow-ink) / 0)",
                }}
            >
                <div className="flex shrink-0 rounded-full focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
                    <Logo size="md" showText={false} className="md:hidden" href="/" />
                    <Logo size="md" showText={true} className="hidden md:flex" href="/" />
                </div>

                {/* Desktop navigation. The wrapper takes the free space; the
                    bar itself stays intrinsically sized, so the shell's width
                    tween never invalidates the pill's measurements. */}
                <div className="hidden md:flex flex-1 justify-center">
                    <nav
                        className="t-tabs"
                        aria-label="Main"
                        onMouseLeave={() => setHoveredHref(null)}
                        onBlur={(event) => {
                            if (!event.currentTarget.contains(event.relatedTarget)) {
                                setHoveredHref(null);
                            }
                        }}
                    >
                        <span
                            ref={pillRef}
                            className="t-tabs-pill"
                            aria-hidden="true"
                        />
                        {NAV_LINKS.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                ref={(node) => {
                                    if (node) tabRefs.current.set(link.href, node);
                                    else tabRefs.current.delete(link.href);
                                }}
                                className="t-tab"
                                data-active={activeHref === link.href}
                                aria-current={
                                    activeHref === link.href ? "page" : undefined
                                }
                                onMouseEnter={() => setHoveredHref(link.href)}
                                onFocus={() => setHoveredHref(link.href)}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        type="button"
                        aria-label={mobileOpen ? "Close menu" : "Open menu"}
                        aria-expanded={mobileOpen}
                        aria-controls="nav-mobile-menu"
                        onClick={() => setMobileOpen((open) => !open)}
                        className="md:hidden flex items-center justify-center h-9 w-9 rounded-full hover:bg-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                        <span
                            className="t-icon-swap"
                            data-state={mobileOpen ? "b" : "a"}
                            aria-hidden="true"
                        >
                            <Menu data-icon="a" className="t-icon w-5 h-5" />
                            <X data-icon="b" className="t-icon w-5 h-5" />
                        </span>
                    </button>

                    {/* Auth slot: the skeleton overlays the real content and
                        cross-fades out once /api/users/me settles. */}
                    <div
                        className={cn("nav-auth t-skel", !loading && "is-revealed")}
                    >
                        <div
                            className="t-skel-skeleton is-pulsing"
                            aria-hidden="true"
                        >
                            <span className="block w-full h-full rounded-full bg-muted" />
                        </div>
                        <div className="t-skel-content">
                            {user ? (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            className="flex items-center gap-2 h-9 pl-1 pr-3 rounded-full hover:bg-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                        >
                                            <span className="w-7 h-7 shrink-0 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-primary/40">
                                                {user.image ? (
                                                    <img
                                                        src={user.image}
                                                        alt={user.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <User className="w-4 h-4 text-muted-foreground" />
                                                )}
                                            </span>
                                            <span className="text-sm font-medium text-foreground hidden sm:inline">
                                                {(user.name || user.username || "").split(" ")[0]}
                                            </span>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        align="end"
                                        sideOffset={10}
                                        className="w-48 bg-popover border-2 border-border rounded-2xl p-1.5"
                                        style={{ boxShadow: "var(--shadow-hard)" }}
                                    >
                                        <Link
                                            href="/profile"
                                            className="flex px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors"
                                        >
                                            Profile
                                        </Link>
                                        <Link
                                            href="/settings"
                                            className="flex px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors"
                                        >
                                            Settings
                                        </Link>
                                        <hr className="border-border my-1" />
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Sign out
                                        </button>
                                    </PopoverContent>
                                </Popover>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <Link
                                        href="/login"
                                        className="hidden sm:flex items-center h-9 px-4 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href="/signup"
                                        className="pill-chunky flex items-center h-9 px-5 rounded-full text-sm font-bold bg-primary text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                    >
                                        Create account
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile panel — always mounted so the close animation can
                    play. Grows from the hamburger via data-origin. */}
                <div
                    ref={panelRef}
                    id="nav-mobile-menu"
                    className="nav-menu t-dropdown t-stagger md:hidden absolute top-full right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-3xl border-2 border-border bg-popover/95 backdrop-blur-xl p-2 shadow-[var(--shadow-hard)]"
                    data-origin="top-right"
                >
                    {mobileRows.map((row, index) => {
                        const line = cn(
                            "t-stagger-line",
                            `t-stagger-line--${index + 1}`,
                        );
                        if (row.kind === "divider") {
                            return (
                                <div
                                    key="divider"
                                    className={cn(line, "my-1 h-px bg-border")}
                                />
                            );
                        }
                        if (row.kind === "login") {
                            return (
                                <div key="login" className={line}>
                                    <Link
                                        href="/login"
                                        onClick={closeMobile}
                                        className="flex items-center px-4 py-3 rounded-2xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                                    >
                                        Log in
                                    </Link>
                                </div>
                            );
                        }
                        if (row.kind === "signup") {
                            return (
                                <div key="signup" className={line}>
                                    <Link
                                        href="/signup"
                                        onClick={closeMobile}
                                        className="btn-chunky mt-1 flex items-center justify-center h-10 rounded-2xl text-sm font-bold bg-primary text-primary-foreground"
                                    >
                                        Create account
                                    </Link>
                                </div>
                            );
                        }
                        return (
                            <div key={row.href} className={line}>
                                <Link
                                    href={row.href}
                                    onClick={closeMobile}
                                    aria-current={
                                        activeHref === row.href ? "page" : undefined
                                    }
                                    className={cn(
                                        "flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-colors",
                                        activeHref === row.href
                                            ? "bg-accent text-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
                                    )}
                                >
                                    {row.label}
                                </Link>
                            </div>
                        );
                    })}
                </div>
            </header>
        </div>
    );
}
