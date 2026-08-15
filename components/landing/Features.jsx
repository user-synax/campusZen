"use client";

import React from "react";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { Users, BookOpen, Code, Zap } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const features = [
    {
        title: "Verified Campus Tribe",
        description:
            "Join a growing community of verified students from IITs, NITs, and top colleges across India.",
        header: <SkeletonOne />,
        icon: (
            <Users className="h-4 w-4 text-primary/70 group-hover/bento:text-primary transition-colors" />
        ),
        className: "md:col-span-2",
    },
    {
        title: "The Ultimate Resource Vault",
        description:
            "Access free notes, PYQs, and premium study materials reviewed by toppers.",
        header: <SkeletonTwo />,
        icon: (
            <BookOpen className="h-4 w-4 text-primary/70 group-hover/bento:text-primary transition-colors" />
        ),
        className: "md:col-span-1",
    },
    {
        title: "Code Together, Grow Together",
        description:
            "Real-time collaborative editor for coding sessions and interview prep.",
        header: <SkeletonThree />,
        icon: (
            <Code className="h-4 w-4 text-primary/70 group-hover/bento:text-primary transition-colors" />
        ),
        className: "md:col-span-1",
    },
    {
        title: "Instant Campus Buzz",
        description:
            "Stay updated with real-time group chats and campus-wide announcements.",
        header: <SkeletonFour />,
        icon: (
            <Zap className="h-4 w-4 text-primary/70 group-hover/bento:text-primary transition-colors" />
        ),
        className: "md:col-span-2",
    },
];

// Overlapping avatar cluster — stands in for "a growing community"
function SkeletonOne() {
    const shades = [
        "bg-primary/25",
        "bg-primary/45",
        "bg-primary/65",
        "bg-primary/85",
    ];
    return (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-secondary/40 border-2 border-border p-4 items-center">
            <div className="flex items-center">
                {shades.map((shade, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "w-8 h-8 rounded-full border-2 border-card",
                            shade,
                        )}
                        style={{ marginLeft: idx === 0 ? 0 : "-10px" }}
                    />
                ))}
                <div className="ml-2 h-6 px-2.5 rounded-full bg-card border-2 border-border flex items-center text-[11px] font-bold text-muted-foreground">
                    +2.4k
                </div>
            </div>
        </div>
    );
}

// Stacked file chips — stands in for the notes / PYQ vault
function SkeletonTwo() {
    return (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-secondary/40 border-2 border-border p-4">
            <div className="flex flex-col gap-2 w-full justify-center">
                <div className="h-7 rounded-lg bg-card border-2 border-border flex items-center px-3 text-xs font-semibold text-muted-foreground">
                    Notes.pdf
                </div>
                <div className="h-7 w-4/5 rounded-lg bg-card border-2 border-border flex items-center px-3 text-xs font-semibold text-muted-foreground">
                    PYQs_2024.pdf
                </div>
            </div>
        </div>
    );
}

// Single badged icon — kept simple, this feature just needs the mark
function SkeletonThree() {
    return (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-secondary/40 border-2 border-border items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border-2 border-primary/25 flex items-center justify-center">
                <Code className="h-6 w-6 text-primary" />
            </div>
        </div>
    );
}

// Two chat bubbles — stands in for real-time group chat
function SkeletonFour() {
    return (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-secondary/40 border-2 border-border p-4 items-center gap-2">
            <div className="h-8 px-3 rounded-2xl rounded-bl-sm bg-card border-2 border-border flex items-center text-xs font-semibold text-muted-foreground">
                Fest starts 6PM 🎉
            </div>
            <div className="h-8 px-3 rounded-2xl rounded-br-sm bg-primary/15 border-2 border-primary/25 flex items-center text-xs font-semibold text-primary">
                Let's go!
            </div>
        </div>
    );
}

export default function Features() {
    const shouldReduceMotion = useReducedMotion();
    const fadeUp = (delay = 0) => ({
        initial: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-80px" },
        transition: shouldReduceMotion
            ? { duration: 0.3 }
            : { duration: 0.6, delay, ease: [0.23, 1, 0.32, 1] },
    });

    return (
        <section className="relative bg-background py-20" id="features">
            <div className="max-w-7xl mx-auto px-4">
                <motion.div className="text-center mb-12" {...fadeUp()}>
                    <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                        Everything your campus needs
                    </h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        From study resources to late-night bakchodi, we've got
                        you covered. The all-in-one platform for the modern
                        Indian student.
                    </p>
                </motion.div>

                <motion.div {...fadeUp(0.15)}>
                    <BentoGrid className="max-w-4xl mx-auto">
                        {features.map((item, i) => (
                            <BentoGridItem
                                key={i}
                                title={item.title}
                                description={item.description}
                                header={item.header}
                                icon={item.icon}
                                className={item.className}
                            />
                        ))}
                    </BentoGrid>
                </motion.div>
            </div>
        </section>
    );
}
