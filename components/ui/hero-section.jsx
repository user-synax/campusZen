"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * @typedef {Object} HeroAction
 * @property {string} text
 * @property {string} href
 * @property {React.ReactNode} [icon]
 * @property {'default'|'glow'} [variant]
 */

/**
 * @typedef {Object} HeroProps
 * @property {Object} [badge]
 * @property {string} badge.text
 * @property {Object} badge.action
 * @property {string} badge.action.text
 * @property {string} badge.action.href
 * @property {string} title
 * @property {string} description
 * @property {HeroAction[]} actions
 * @property {Object} image
 * @property {string} image.src
 * @property {string} image.alt
 */

export function HeroSection({
    badge,
    title,
    description,
    actions,
    titleRotatingText,
    image,
}) {
    const shouldReduceMotion = useReducedMotion();

    const container = {
        hidden: {},
        show: {
            transition: shouldReduceMotion
                ? {}
                : { staggerChildren: 0.12, delayChildren: 0.05 },
        },
    };

    const item = {
        hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 },
        show: {
            opacity: 1,
            y: 0,
            transition: shouldReduceMotion
                ? { duration: 0.2 }
                : { duration: 0.55, ease: [0.23, 1, 0.32, 1] },
        },
    };

    return (
        // Forced dark: the hero stays dark regardless of the site theme
        // toggle (deliberate, matches the original design), but every
        // color below still comes from the token system.
        <section
            className={cn(
                "dark relative isolate min-h-screen flex items-center justify-center overflow-hidden",
                "bg-background fade-bottom",
                "py-18 sm:py-28 md:py-36 px-4",
            )}
        >
            {/* Subtle grid texture */}
            <div className="absolute inset-0 bg-grid-pattern pointer-events-none" />

            {/* Two small flat, hard-edged accent shapes — sticker-like, not lit from within.
                No blur, no opacity pulsing: crisp fill + crisp border + crisp offset shadow,
                same language as the rest of the chunky system. */}
            <motion.div
                aria-hidden
                className="hidden sm:block absolute top-28 left-[12%] w-11 h-11 rounded-2xl border-2 border-primary/30 bg-primary/15 pointer-events-none"
                style={{ rotate: -10, boxShadow: "var(--shadow-hard)" }}
                initial={{ opacity: 0 }}
                animate={
                    shouldReduceMotion
                        ? { opacity: 1 }
                        : { opacity: 1, y: [0, -8, 0] }
                }
                transition={{
                    opacity: { duration: 0.6, delay: 0.3 },
                    y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                }}
            />
            <motion.div
                aria-hidden
                className="hidden sm:block absolute bottom-40 right-[14%] w-8 h-8 rounded-full border-2 border-border bg-secondary pointer-events-none"
                style={{ boxShadow: "var(--shadow-hard-sm)" }}
                initial={{ opacity: 0 }}
                animate={
                    shouldReduceMotion
                        ? { opacity: 1 }
                        : { opacity: 1, y: [0, 10, 0] }
                }
                transition={{
                    opacity: { duration: 0.6, delay: 0.5 },
                    y: {
                        duration: 7,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.4,
                    },
                }}
            />

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="relative z-10 mx-auto max-w-4xl text-center"
            >
                <div className="flex flex-col items-center gap-8 sm:gap-12">
                    {badge && (
                        <motion.div
                            variants={item}
                            style={{ rotate: -2 }}
                            whileHover={
                                shouldReduceMotion
                                    ? undefined
                                    : { rotate: 0, scale: 1.03 }
                            }
                            transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 18,
                            }}
                        >
                            <Badge
                                variant="outline"
                                className="pill-chunky py-2 px-4 gap-2 border-primary/30 bg-primary/10 text-primary-foreground/90"
                            >
                                <span className="text-foreground">
                                    {badge.text}
                                </span>
                                <a
                                    href={badge.action?.href}
                                    className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                                >
                                    {badge.action?.text}
                                    <ArrowRightIcon className="h-3 w-3" />
                                </a>
                            </Badge>
                        </motion.div>
                    )}

                    {/* Title */}
                    <motion.h1
                        variants={item}
                        className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-center px-4 font-black tracking-tight leading-none text-4xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl bg-gradient-to-b from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent"
                    >
                        {titleRotatingText ? (
                            <>
                                <span className="whitespace-nowrap">
                                    {titleRotatingText.prefix}
                                </span>

                                <div className="min-w-[2ch] flex justify-center">
                                    {titleRotatingText.component}
                                </div>

                                <span className="whitespace-nowrap">
                                    {titleRotatingText.suffix}
                                </span>
                            </>
                        ) : (
                            title
                        )}
                    </motion.h1>

                    <motion.p
                        variants={item}
                        className="max-w-2xl text-sm text-muted-foreground sm:text-xl px-6 sm:px-4"
                    >
                        {description}
                    </motion.p>

                    {/* Actions */}
                    <motion.div
                        variants={item}
                        className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-[300px] sm:max-w-none mx-auto px-4 sm:px-0"
                    >
                        {actions.map((action, index) => (
                            <motion.div
                                key={index}
                                whileHover={
                                    shouldReduceMotion
                                        ? undefined
                                        : { scale: 1.03 }
                                }
                                whileTap={
                                    shouldReduceMotion
                                        ? undefined
                                        : { scale: 0.97 }
                                }
                                transition={{
                                    type: "spring",
                                    stiffness: 450,
                                    damping: 20,
                                }}
                                className="w-full sm:w-auto"
                            >
                                <Button
                                    variant="ghost"
                                    size="lg"
                                    asChild
                                    className={cn(
                                        "rounded-full w-full sm:w-auto h-12 sm:h-14 text-base sm:text-lg px-8 shadow-none",
                                        action.variant === "glow"
                                            ? "pill-chunky bg-primary hover:bg-primary text-primary-foreground border-2 border-primary/30"
                                            : "bg-secondary/60 hover:bg-secondary text-secondary-foreground border-2 border-border backdrop-blur-sm",
                                    )}
                                >
                                    <Link
                                        href={action.href}
                                        className="flex items-center justify-center gap-2"
                                    >
                                        {action.icon}
                                        {action.text}
                                    </Link>
                                </Button>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Image */}
                    {image && (
                        <motion.div
                            variants={item}
                            className="w-full max-w-5xl px-4"
                        >
                            <div
                                className="rounded-3xl border-2 border-border overflow-hidden"
                                style={{ boxShadow: "var(--shadow-hard)" }}
                            >
                                <img
                                    src={image.src}
                                    alt={image.alt}
                                    className="w-full h-auto"
                                />
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </section>
    );
}
