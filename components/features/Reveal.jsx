"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Fire once when an element scrolls into view.
 *
 * Returns `[ref, inView]`. The observer disconnects after the first hit — these
 * reveals are one-shot, and re-running them on every scroll past would turn a
 * quiet entrance into a flicker.
 */
export function useInViewOnce({ threshold = 0.15, rootMargin = "0px 0px -8% 0px" } = {}) {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el || inView) return;

        // No IntersectionObserver (very old browsers, some test envs): show the
        // content rather than leaving it stuck at opacity 0.
        if (typeof IntersectionObserver === "undefined") {
            setInView(true);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { threshold, rootMargin },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [inView, threshold, rootMargin]);

    return [ref, inView];
}

/**
 * A `18-texts-reveal` container (`.t-stagger`) that flips to `.is-shown` when it
 * enters the viewport.
 *
 * `immediate` skips the observer for above-the-fold content — the hero should
 * play on load, not wait for a scroll event that may never come.
 */
export function Reveal({
    as: Tag = "div",
    immediate = false,
    className,
    children,
    ...rest
}) {
    const [ref, inView] = useInViewOnce();
    const [ready, setReady] = useState(false);

    // One frame of delay so the lines paint in their pre-reveal state first.
    // Setting `.is-shown` in the same commit as the initial mount would give the
    // browser no "from" value to transition out of, and the stagger would be
    // skipped entirely.
    useEffect(() => {
        if (!immediate) return;
        const id = requestAnimationFrame(() => setReady(true));
        return () => cancelAnimationFrame(id);
    }, [immediate]);

    return (
        <Tag
            ref={immediate ? undefined : ref}
            className={cn("t-stagger", (immediate ? ready : inView) && "is-shown", className)}
            {...rest}
        >
            {children}
        </Tag>
    );
}

/**
 * One staggered line inside a `<Reveal>`.
 *
 * `index` is 1-based. There is deliberately no `--1` rule in the stylesheet —
 * the first line has no delay — so the modifier is only emitted from 2 up.
 *
 * Always a wrapper around its content, never the content itself: `.t-stagger-line`
 * sets `display: block` and a transform from an unlayered rule, which outranks
 * Tailwind's `@layer utilities` display/transform utilities and would silently
 * win over e.g. a `flex` on the same element.
 */
export function RevealLine({
    as: Tag = "div",
    index = 1,
    className,
    children,
    ...rest
}) {
    return (
        <Tag
            className={cn(
                "t-stagger-line",
                index > 1 && `t-stagger-line--${index}`,
                className,
            )}
            {...rest}
        >
            {children}
        </Tag>
    );
}
