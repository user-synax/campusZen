"use client";

import { useEffect, useId, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { groupDigits } from "@/components/ui/pop-number";
import { prefersReducedMotion, readNumberVar } from "./motion";

/**
 * `26-spinning-counter` — a number that arrives with fanfare.
 *
 * The snippet ships the CSS and describes the builder rather than shipping it:
 * one `.t-reel-col` per digit, each clipping a `.t-reel-strip` of 0-9 cells,
 * translated up by `(spins * 10 + digit)` cells so the reel spins before it
 * lands. A vertical-only SVG `feGaussianBlur` supplies the motion streak — a CSS
 * `blur()` would smear sideways too — and decays to 0 per column as each reel
 * settles.
 *
 * Chosen over `02-number-pop-in` here on the snippet's own decision rule: this
 * is a KPI arriving once, which should read as an event. The quiet in-place
 * updates on this page (the live match count) use pop-in instead.
 */

const SPINS = 2;
/** 0-9 repeated (SPINS + 1) times, so index `SPINS * 10 + 9` still exists. */
const CELLS = Array.from({ length: (SPINS + 1) * 10 }, (_, i) => i % 10);

/**
 * `useLayoutEffect` so the reset to the start position happens before paint —
 * with a plain effect the server-rendered final number would flash for a frame
 * before the roll began. Aliased because React warns about layout effects during
 * server rendering.
 */
const useIsoLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Where a column rests once it has landed. */
const restIndex = (digit) => SPINS * 10 + digit;

export function ReelCounter({ value, run = false, className }) {
    const text = groupDigits(value);
    const rootRef = useRef(null);
    const stripsRef = useRef([]);
    const blursRef = useRef([]);
    const rafRef = useRef(0);
    const playedRef = useRef(false);

    // useId gives a stable server/client id; the colons it contains are not
    // valid in a url(#…) reference, hence the strip.
    const uid = useId().replace(/:/g, "");

    /* Split into columns once: digits get a reel, separators stay put. */
    const columns = [];
    let reelCount = 0;
    for (const char of text.split("")) {
        if (char >= "0" && char <= "9") {
            columns.push({ kind: "reel", digit: Number(char), col: reelCount });
            reelCount += 1;
        } else {
            columns.push({ kind: "static", char });
        }
    }

    /* Park every strip at cell 0 so there is somewhere to roll up from. Skipped
       entirely under reduced motion, which leaves the server-rendered final
       position exactly where it is. */
    useIsoLayoutEffect(() => {
        if (playedRef.current || prefersReducedMotion()) return;
        for (const strip of stripsRef.current) {
            if (!strip) continue;
            strip.style.transition = "none";
            strip.style.transform = "translateY(0)";
        }
    }, []);

    useEffect(() => {
        if (!run || playedRef.current) return;
        playedRef.current = true;

        const strips = stripsRef.current.filter(Boolean);
        if (!strips.length) return;

        if (prefersReducedMotion()) {
            // The markup already carries the landed transform; just make sure no
            // transition or filter is left hanging off it.
            for (const strip of strips) {
                strip.style.transition = "none";
                strip.style.filter = "none";
            }
            return;
        }

        const el = rootRef.current;
        const dur = readNumberVar("--reel-dur", 1400, el);
        const stagger = readNumberVar("--reel-stagger", 90, el);
        const spinBlur = readNumberVar("--reel-spin-blur", 3, el);

        /* Forced reflow between the parked transform and the animated one. Without
           it the browser coalesces both writes and the roll never plays — the
           mistake the skill calls out by name. */
        void strips[0].offsetHeight;

        strips.forEach((strip, col) => {
            strip.style.transition = `transform var(--reel-dur) var(--reel-ease) calc(var(--reel-stagger) * ${col})`;
            strip.style.transform = strip.dataset.rest;
        });

        const t0 = performance.now();
        const tick = (now) => {
            const elapsed = now - t0;
            let active = false;
            blursRef.current.forEach((blur, col) => {
                if (!blur) return;
                const progress = (elapsed - col * stagger) / dur;
                const amount =
                    progress <= 0 ? spinBlur : progress >= 1 ? 0 : spinBlur * (1 - progress);
                blur.setAttribute("stdDeviation", `0 ${amount.toFixed(2)}`);
                if (progress < 1) active = true;
            });
            if (active) {
                rafRef.current = requestAnimationFrame(tick);
                return;
            }
            /* Settled: drop the filter reference so the reels stop costing a
               filtered paint for the rest of the page's life. */
            for (const strip of strips) strip.style.filter = "none";
        };
        rafRef.current = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(rafRef.current);
    }, [run]);

    stripsRef.current = [];
    blursRef.current = [];

    return (
        <span ref={rootRef} className={cn("t-reel", className)}>
            {/* The reel is 30 glyphs per column of pure decoration — assistive tech
                gets the plain value instead. */}
            <span className="sr-only">{text}</span>
            <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
                <defs>
                    {columns
                        .filter((column) => column.kind === "reel")
                        .map((column) => (
                            <filter
                                key={column.col}
                                id={`reel-${uid}-${column.col}`}
                                x="-50%"
                                y="-50%"
                                width="200%"
                                height="200%"
                            >
                                {/* stdDeviation "0 y" blurs vertically only, so the
                                    streak follows the reel instead of smearing the
                                    glyph sideways. */}
                                <feGaussianBlur
                                    ref={(node) => {
                                        blursRef.current[column.col] = node;
                                    }}
                                    stdDeviation="0 0"
                                />
                            </filter>
                        ))}
                </defs>
            </svg>
            {columns.map((column, index) =>
                column.kind === "static" ? (
                    <span key={index} aria-hidden="true">
                        {column.char}
                    </span>
                ) : (
                    <span key={index} className="t-reel-col" aria-hidden="true">
                        <span
                            ref={(node) => {
                                stripsRef.current[column.col] = node;
                            }}
                            className="t-reel-strip"
                            /* Server-rendered in the landed position, so the correct
                               number shows even if this component never hydrates. */
                            data-rest={`translateY(calc(var(--reel-cell) * -${restIndex(column.digit)}))`}
                            style={{
                                transform: `translateY(calc(var(--reel-cell) * -${restIndex(column.digit)}))`,
                                filter: `url(#reel-${uid}-${column.col})`,
                            }}
                        >
                            {CELLS.map((cell, cellIndex) => (
                                <span key={cellIndex} className="t-reel-digit">
                                    {cell}
                                </span>
                            ))}
                        </span>
                    </span>
                ),
            )}
        </span>
    );
}

export default ReelCounter;
