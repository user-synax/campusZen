"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Group a number with thousands separators.
 *
 * Deliberately a regex rather than `toLocaleString` / `Intl.NumberFormat`: those
 * can resolve differently on the server and in the browser depending on the
 * available ICU data, which would produce a hydration mismatch on a value that
 * is rendered in both places.
 */
export function groupDigits(value) {
    const n = Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0;
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Number pop-in (`02-number-pop-in.md`). Each character animates in on its own,
 * with the last two staggered behind the leading digits.
 *
 * Shared by the landing hero and the features page — one implementation so the
 * replay path and the accessibility treatment can't drift between them.
 */
export function PopNumber({ value, suffix = "", className }) {
    const groupRef = useRef(null);
    const text = groupDigits(value) + suffix;

    useEffect(() => {
        const group = groupRef.current;
        if (!group) return;
        // The snippet's documented replay path: drop `.is-animating`, force a
        // reflow so the keyframes restart, then re-add it. Without the reflow
        // the animation simply doesn't play again when the value changes.
        group.classList.remove("is-animating");
        void group.offsetHeight;
        group.classList.add("is-animating");
    }, [text]);

    const chars = text.split("");

    return (
        <span ref={groupRef} className={cn("t-digit-group", className)}>
            {/* One readable string for assistive tech; the per-character spans
                below are decoration and would otherwise be announced one glyph
                at a time. */}
            <span className="sr-only">{text}</span>
            {chars.map((char, index) => (
                <span
                    key={`${index}-${char}`}
                    className="t-digit"
                    aria-hidden="true"
                    data-stagger={
                        index === chars.length - 2
                            ? "1"
                            : index === chars.length - 1
                              ? "2"
                              : undefined
                    }
                >
                    {char}
                </span>
            ))}
        </span>
    );
}

export default PopNumber;
