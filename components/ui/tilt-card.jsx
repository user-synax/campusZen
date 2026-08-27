"use client";

import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * `19-card-tilt` — the card leans toward the cursor and a specular highlight
 * tracks it.
 *
 * Two elements, both load-bearing and both from the snippet: `.t-tilt` is the
 * flat hit area and never transforms, `.t-tilt-card` inside it is what rotates.
 * Measuring on the wrapper is the whole point — track the rotating card itself
 * and its edges slip out from under the cursor, so the hover flickers.
 *
 * Shared by the landing hero and the features grid. One implementation, because
 * the snippet's contract lives half in CSS and half in these four custom-property
 * writes; a second copy is exactly the drift `transitions review` looks for.
 */

/**
 * Peak tilt at the card edges, in degrees. The card-tilt snippet keeps this in
 * JS rather than a CSS variable; 10-16 reads as a subtle, tasteful lean.
 */
export const TILT_MAX = 11;

/* One MediaQueryList for every card on the page. `pointermove` fires per frame
   per hovered card, and a fresh `matchMedia` on each one is pure waste. */
let reduceQuery = null;
function reduceMotion() {
    if (typeof window === "undefined") return true;
    if (!reduceQuery) {
        reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    }
    return reduceQuery.matches;
}

export function TiltCard({
    className,
    cardClassName,
    max = TILT_MAX,
    glare = true,
    children,
    ...rest
}) {
    const tiltRef = useRef(null);
    const cardRef = useRef(null);

    const reset = useCallback(() => {
        const tilt = tiltRef.current;
        const card = cardRef.current;
        if (!tilt || !card) return;
        tilt.classList.remove("is-hover");
        card.classList.remove("is-tilting");
        card.style.setProperty("--tilt-rx", "0deg");
        card.style.setProperty("--tilt-ry", "0deg");
    }, []);

    const track = useCallback(
        (event) => {
            // Mouse only. The snippet also supports tap-hold-drag on touch, but
            // that needs `touch-action: none`, which on a phone would trap the
            // very swipe people use to scroll past these cards.
            if (event.pointerType !== "mouse") return;
            if (reduceMotion()) return;

            const tilt = tiltRef.current;
            const card = cardRef.current;
            if (!tilt || !card) return;

            const r = tilt.getBoundingClientRect();
            const px = Math.min(1, Math.max(0, (event.clientX - r.left) / r.width));
            const py = Math.min(1, Math.max(0, (event.clientY - r.top) / r.height));

            tilt.classList.add("is-hover");
            card.classList.add("is-tilting");
            card.style.setProperty("--tilt-ry", ((px - 0.5) * max).toFixed(2) + "deg");
            card.style.setProperty("--tilt-rx", ((0.5 - py) * max).toFixed(2) + "deg");
            card.style.setProperty("--tilt-gx", (px * 100).toFixed(1) + "%");
            card.style.setProperty("--tilt-gy", (py * 100).toFixed(1) + "%");
        },
        [max],
    );

    return (
        <div
            ref={tiltRef}
            className={cn("t-tilt", className)}
            onPointerMove={track}
            onPointerUp={reset}
            onPointerCancel={reset}
            onPointerLeave={(event) => {
                if (event.pointerType === "mouse") reset();
            }}
            {...rest}
        >
            <div ref={cardRef} className={cn("t-tilt-card", cardClassName)}>
                {children}
                {glare && <div className="t-tilt-glare" />}
            </div>
        </div>
    );
}

export default TiltCard;
