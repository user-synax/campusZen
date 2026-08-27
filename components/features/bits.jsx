"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { prefersReducedMotion, readNumberVar } from "./motion";

/**
 * Small pieces shared by more than one section of the features page. They live
 * together so the geometry the snippets depend on exists exactly once.
 */

/**
 * The accordion chevron for `21-accordion`. Both the 16x16 viewBox and this path
 * are load-bearing: the open state flips the chevron with `scaleY(-1)` about the
 * element centre, which only lands on a clean "^" for a path drawn symmetrically
 * about that centre. `vector-effect: non-scaling-stroke` comes from the snippet
 * and keeps the stroke width constant while the box is squashed mid-flip.
 */
export function AccChevron({ size = 16 }) {
    return (
        <span className="t-acc-chevron">
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <path d="M4 6.5L8 10.5L12 6.5" />
            </svg>
        </span>
    );
}

/**
 * The tick used by both `25-checkbox-check` and `10-success-check`. One path in
 * one viewBox, because `--check-len` in the stylesheet is this path's measured
 * length — a second tick drawn differently would over- or under-draw.
 */
export function CheckPath({ size = 12, width = 1.8 }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 10.1668 10.1668"
            fill="none"
            stroke="currentColor"
            strokeWidth={width}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M1 5.52L3.92 9.17L9.17 1" />
        </svg>
    );
}

/**
 * `10-success-check` — fades, unrotates, unblurs and bobs into place while the
 * stroke draws itself.
 *
 * Mounted only once it should play, which is the point: this is an entrance, and
 * `data-state="in"` on a freshly mounted element is exactly the trigger the
 * snippet documents.
 */
export function SuccessCheck({ size = 14, className }) {
    return (
        <span
            className={cn("t-success-check", className)}
            data-state="in"
            aria-hidden="true"
        >
            <CheckPath size={size} width={2} />
        </span>
    );
}

/**
 * `04-text-states-swap` — the old label exits upward with a blur, the new one
 * enters from below.
 *
 * The three-phase sequence has to change `textContent` at a precise moment
 * mid-transition, which a React re-render can't express — so the initial value
 * is rendered (and server-rendered) once, and every later value is written
 * imperatively. React sees the same children on every commit and leaves the node
 * alone.
 */
export function TextSwap({ text, as: Tag = "span", className }) {
    const ref = useRef(null);
    const initialRef = useRef(text);
    const liveRef = useRef(text);

    useEffect(() => {
        const el = ref.current;
        if (!el || liveRef.current === text) return;
        liveRef.current = text;

        if (prefersReducedMotion()) {
            el.textContent = text;
            return;
        }

        const dur = readNumberVar("--text-swap-dur", 150, el);
        el.classList.add("is-exit");
        const id = setTimeout(() => {
            el.textContent = text;
            el.classList.remove("is-exit");
            el.classList.add("is-enter-start");
            // Reflow so removing the class below has a "from" value to tween out
            // of. Without it the new text simply appears.
            void el.offsetHeight;
            el.classList.remove("is-enter-start");
        }, dur);
        return () => clearTimeout(id);
    }, [text]);

    return (
        <Tag ref={ref} className={cn("t-text-swap", className)}>
            {initialRef.current}
        </Tag>
    );
}

/**
 * `30-streaming-text` — words resolve in one after another through opacity and a
 * small blur, the way generated text arrives.
 *
 * The snippet's reference wraps words by mutating `textContent` in the DOM. Here
 * the spans are built in JSX instead: React owns this subtree, and a DOM rewrite
 * would be undone on the next commit. The separating space stays *outside* each
 * span so the paragraph still wraps normally.
 *
 * One rAF driver rather than one `setTimeout` per word — a long paragraph would
 * otherwise queue several dozen timers to say the same thing.
 */
export function StreamText({ text, run, as: Tag = "p", className }) {
    const rootRef = useRef(null);
    const playedRef = useRef(false);

    useEffect(() => {
        if (!run || playedRef.current) return;
        const root = rootRef.current;
        if (!root) return;
        playedRef.current = true;

        const words = Array.from(root.querySelectorAll(".t-stream-w"));
        if (!words.length) return;

        if (prefersReducedMotion()) {
            for (const word of words) word.classList.add("is-in");
            return;
        }

        const gap = readNumberVar("--stream-gap", 55, root);
        const start = performance.now();
        let shown = 0;
        let raf = 0;

        const tick = (now) => {
            const target = Math.min(
                words.length,
                Math.floor((now - start) / Math.max(1, gap)) + 1,
            );
            while (shown < target) words[shown++].classList.add("is-in");
            if (shown < words.length) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [run]);

    const words = text.split(" ");

    return (
        <Tag ref={rootRef} className={className}>
            {words.map((word, index) => (
                <span key={`${index}-${word}`}>
                    <span className="t-stream-w">{word}</span>
                    {index < words.length - 1 ? " " : null}
                </span>
            ))}
        </Tag>
    );
}
