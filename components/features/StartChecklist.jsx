"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PopNumber } from "@/components/ui/pop-number";
import { CHECKLIST } from "./data";
import { CheckPath, SuccessCheck, TextSwap } from "./bits";
import { Reveal, RevealLine } from "./Reveal";

/**
 * First-week checklist.
 *
 * | Element                | Transition        | Reference                 |
 * | ---------------------- | ----------------- | ------------------------- |
 * | Each row's tick box    | checkbox check    | `25-checkbox-check.md`    |
 * | Progress count         | number pop-in     | `02-number-pop-in.md`     |
 * | Progress phrase        | text states swap  | `04-text-states-swap.md`  |
 * | All five done          | success check     | `10-success-check.md`     |
 *
 * Nothing here is saved anywhere — it's a scratch list for reading the page, and
 * the copy says so rather than implying an onboarding flow that doesn't exist.
 */
export function StartChecklist() {
    const [ticked, setTicked] = useState(() => new Set());

    const toggle = (id) => {
        setTicked((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const done = ticked.size;
    const total = CHECKLIST.length;
    const complete = done === total;

    const phrase = useMemo(() => {
        if (complete) return "that's the whole list";
        if (done === 0) return "steps to get going";
        return `of ${total} ticked off`;
    }, [complete, done, total]);

    return (
        <section id="start" className="scroll-mt-28 py-20 sm:py-24">
            <div className="mx-auto max-w-container px-4">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-16">
                    <Reveal>
                        <RevealLine
                            index={1}
                            as="h2"
                            className="text-3xl font-extrabold tracking-tight sm:text-4xl"
                        >
                            Your first week, in five steps
                        </RevealLine>
                        <RevealLine
                            index={2}
                            as="p"
                            className="mt-4 text-base leading-relaxed text-muted-foreground"
                        >
                            A scratch list for reading this page — tick things off
                            as you go. Nothing is saved, so it resets when you
                            leave.
                        </RevealLine>

                        <RevealLine index={3} className="mt-6">
                            <p className="flex items-center gap-2 text-sm font-bold">
                                <PopNumber value={done} className="text-base" />
                                <span className="text-muted-foreground">
                                    <TextSwap text={phrase} />
                                </span>
                                {/* Mounted only on completion — the check is an
                                    entrance, and mounting it with
                                    data-state="in" is the snippet's trigger. */}
                                {complete && <SuccessCheck size={16} />}
                            </p>
                        </RevealLine>

                        <RevealLine index={4} className="mt-8">
                            <Link
                                href="/signup"
                                className="pill-chunky inline-flex items-center bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
                            >
                                Start for real
                            </Link>
                        </RevealLine>
                    </Reveal>

                    <Reveal className="space-y-3">
                        {CHECKLIST.map((step, index) => {
                            const on = ticked.has(step.id);
                            return (
                                <RevealLine
                                    key={step.id}
                                    index={Math.min(index + 1, 8)}
                                >
                                    <div
                                        className={cn(
                                            "card-chunky flex items-start gap-4 bg-card px-5 py-4 transition-colors",
                                            on && "bg-accent/40",
                                        )}
                                    >
                                        <button
                                            type="button"
                                            role="checkbox"
                                            aria-checked={on}
                                            aria-labelledby={`step-${step.id}`}
                                            className="t-check mt-0.5"
                                            onClick={() => toggle(step.id)}
                                        >
                                            <CheckPath size={12} />
                                        </button>
                                        <span className="min-w-0">
                                            <span
                                                id={`step-${step.id}`}
                                                className={cn(
                                                    "block text-sm font-bold",
                                                    on &&
                                                        "text-muted-foreground line-through",
                                                )}
                                            >
                                                {step.label}
                                            </span>
                                            <span className="mt-1 block text-xs text-muted-foreground">
                                                {step.hint}
                                            </span>
                                        </span>
                                    </div>
                                </RevealLine>
                            );
                        })}
                    </Reveal>
                </div>
            </div>
        </section>
    );
}

export default StartChecklist;
