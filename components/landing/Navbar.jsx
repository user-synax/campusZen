"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { LogOut, User, Home, Book, Users2, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/shared/Logo";

// Set this back to [] if these routes aren't live yet — the navbar
// gracefully collapses to just logo + auth when there are no links.

export default function Navbar() {
    const pathname = usePathname();
    const shouldReduceMotion = useReducedMotion();

    const [scrolled, setScrolled] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [hoveredHref, setHoveredHref] = useState(null);

    useEffect(() => {
        setMounted(true);
    }, []);

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
                    if (active) setUser(data);
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

    const pillTransition = shouldReduceMotion
        ? { duration: 0 }
        : { type: "spring", stiffness: 500, damping: 32 };

    return (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 py-4 pointer-events-none">
            <motion.header
                initial={{ y: -24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className={cn(
                    "pointer-events-auto flex items-center justify-between h-14 px-3 sm:px-4 rounded-full border w-full max-w-4xl transition-colors duration-300",
                    scrolled
                        ? "bg-background/80 backdrop-blur-xl border-border"
                        : "bg-background/40 backdrop-blur-md border-transparent",
                )}
                style={
                    scrolled
                        ? { boxShadow: "var(--shadow-hard-sm)" }
                        : undefined
                }
            >
                {/* Logo — small friendly wiggle on hover, nothing else moves */}
                <motion.div
                    whileHover={
                        shouldReduceMotion
                            ? undefined
                            : { scale: 1.06, rotate: -2 }
                    }
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="flex shrink-0 rounded-full focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
                >
                    <Logo
                        size="md"
                        showText={false}
                        className="md:hidden"
                        href="/"
                    />
                    <Logo
                        size="md"
                        showText={true}
                        className="hidden md:flex"
                        href="/"
                    />
                </motion.div>

                {/* Desktop Navigation — animated pill follows hover, falls back to active route */}

                {/* Right Side Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {mounted && !loading && user ? (
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
                                        {user.name.split(" ")[0]}
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
                            <motion.div
                                whileHover={
                                    shouldReduceMotion
                                        ? undefined
                                        : { scale: 1.04 }
                                }
                                whileTap={
                                    shouldReduceMotion
                                        ? undefined
                                        : { scale: 0.95 }
                                }
                                transition={{
                                    type: "spring",
                                    stiffness: 450,
                                    damping: 18,
                                }}
                            >
                                <Link
                                    href="/signup"
                                    className="pill-chunky flex items-center h-9 px-5 rounded-full text-sm font-bold bg-primary text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                >
                                    Create account
                                </Link>
                            </motion.div>
                        </div>
                    )}
                </div>
            </motion.header>
        </div>
    );
}
