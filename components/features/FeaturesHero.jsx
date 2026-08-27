"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { LearnChevron } from "@/components/ui/learn-chevron";
import { METRICS } from "./data";
import { ReelCounter } from "./ReelCounter";
import { Reveal, RevealLine, useInViewOnce } from "./Reveal";

/**
 * Features hero.
 *
 * Motion: `18-texts-reveal` for the entrance (immediate — this is above the
 * fold, so waiting for a scroll event would mean waiting forever),
 * `15-shimmer-text` on the eyebrow, `24-learn-more-hover` on the secondary CTA,
 * and `26-spinning-counter` on the metric strip, rolled once when the strip
 * scrolls into view.
 */
export function FeaturesHero() {
    const [metricsRef, metricsIn] = useInViewOnce({ threshold: 0.35 });

    return (
        <section className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute left-1/2 top-[-10rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
                <div className="absolute right-[-6rem] top-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            </div>

            <Reveal immediate className="mx-auto max-w-container px-4 text-center">
                <RevealLine index={1}>
                    <span className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-1.5 text-sm font-semibold shadow-[var(--shadow-hard-sm)]">
                        <Sparkles className="h-4 w-4 text-primary" />
                        {/* The shimmer's ::before duplicates the label through
                            `content: attr(data-text)`, so the two must match. */}
                        <span className="t-shimmer" data-text="Product Tour">
                            Product Tour
                        </span>
                    </span>
                </RevealLine>

                <RevealLine
                    index={2}
                    as="h1"
                    className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl"
                >
                    Everything your campus life needs
                </RevealLine>

                <RevealLine
                    index={3}
                    as="p"
                    className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
                >
                    CampusZen packs communities, content, events, and study tools
                    into one student-only network — and it is built to be read by
                    machines too.
                </RevealLine>

                <RevealLine index={4} className="mt-8">
                    <div className="flex flex-wrap justify-center gap-3">
                        {/* `pill-chunky`, not `btn-chunky` + `rounded-full`: both
                            live in `@layer utilities`, and the project block is
                            emitted after Tailwind's, so `.btn-chunky`'s 12px
                            radius would quietly beat the utility. */}
                        <Link
                            href="/signup"
                            className="pill-chunky inline-flex items-center bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
                        >
                            Create your account
                        </Link>
                        <Link
                            href="/pricing"
                            className="t-learn cta-ghost inline-flex items-center gap-1.5 bg-card px-6 py-3 text-sm font-bold"
                        >
                            See pricing
                            <LearnChevron />
                        </Link>
                    </div>
                </RevealLine>
            </Reveal>

            {/* Metric strip. `useInViewOnce` rather than <Reveal> because the reels
                need the in-view flag itself, not just the class it produces. */}
            <div
                ref={metricsRef}
                className={cn(
                    "t-stagger mx-auto mt-14 grid max-w-container grid-cols-1 gap-4 px-4 sm:grid-cols-3",
                    metricsIn && "is-shown",
                )}
            >
                {METRICS.map((metric, index) => (
                    <RevealLine key={metric.id} index={index + 1}>
                        <div className="card-chunky h-full bg-card px-5 py-6 text-center sm:text-left">
                            <span className="fx-metric inline-flex text-3xl font-black leading-none tracking-tight sm:text-4xl">
                                <ReelCounter value={metric.value} run={metricsIn} />
                            </span>
                            <p className="mt-3 text-sm font-bold">{metric.label}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {metric.note}
                            </p>
                        </div>
                    </RevealLine>
                ))}
            </div>
        </section>
    );
}

export default FeaturesHero;
