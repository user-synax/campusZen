"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { bezier, prefersReducedMotion, readNumberVar, readStringVar } from "./motion";

/**
 * `13-input-clear-dissolve` — clearing the field flies the typed text down while
 * a soft per-word streak ignites under each word and the placeholder falls in
 * from above.
 *
 * Per-frame JS is unavoidable here, as the snippet says: the streak's
 * rise/peak/fall envelope and the per-word gradient stack can't be expressed as
 * static keyframes. Two adaptations to the snippet's reference routine:
 *
 * 1. The input is controlled by the explorer, so `input.value = ""` becomes
 *    `onChange("")`, and `.has-value` / `.is-clearing` are rendered from state
 *    rather than toggled with `classList`. They have to be: React owns this
 *    element's `class` attribute and would wipe an imperative class on its next
 *    commit.
 * 2. Dark mode is detected from `.dark` on `<html>` — the reference reads a
 *    `data-theme` attribute, which this project doesn't use.
 *
 * The mirror, placeholder and glow are rendered childless and written to
 * imperatively; React has nothing to reconcile there, so the per-frame writes
 * are safe.
 */
export function SearchField({
    value,
    onChange,
    matchCount,
    placeholder = "Search features",
    id = "features-search",
}) {
    const wrapRef = useRef(null);
    const inputRef = useRef(null);
    const mirrorRef = useRef(null);
    const pholdRef = useRef(null);
    const glowRef = useRef(null);
    const canvasRef = useRef(null);
    const rafRef = useRef(0);
    const [clearing, setClearing] = useState(false);

    /* The snippet's `sync()`. Skipped while clearing so the frozen text keeps
       flying instead of being blanked the moment the value empties. Spaces become
       non-breaking: the mirror is `white-space: nowrap`, and an ordinary trailing
       space would collapse, sliding the streak out from under the last word. */
    useEffect(() => {
        if (clearing) return;
        const mirror = mirrorRef.current;
        if (mirror) mirror.textContent = value.replace(/ /g, " ");
    }, [value, clearing]);

    useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

    /* Build the per-word streak: one stack of radial gradients per word, placed
       by measuring the text in a canvas with the input's own font. */
    function buildGlow(text) {
        if (!canvasRef.current) {
            canvasRef.current = document.createElement("canvas").getContext("2d");
        }
        const canvas = canvasRef.current;
        const input = inputRef.current;
        const wrap = wrapRef.current;
        const style = getComputedStyle(input);
        // Chrome returns the `font` shorthand; some engines leave it empty, so
        // compose it from the longhands as a fallback or measureText lies.
        canvas.font =
            style.font ||
            `${style.fontWeight} ${style.fontSize} / ${style.lineHeight} ${style.fontFamily}`;

        const isDark = document.documentElement.classList.contains("dark");
        const rgb = isDark ? "255,255,255" : "0,0,0";
        const w = wrap.clientWidth || 280;
        const padLeft = parseFloat(style.paddingLeft) || 12;
        const spread = readNumberVar("--glow-spread", 1.5, wrap);
        const layers = [];
        let x = 0;

        text.split(/(\s+)/).forEach((seg) => {
            const segW = canvas.measureText(seg).width;
            if (seg.trim()) {
                const cx = padLeft + x + segW / 2;
                const hw = Math.max(segW * 0.45, 8) * spread;
                [
                    [0, 0.8, 7, 0.22],
                    [hw * 0.45, 0.55, 8, 0.18],
                    [-hw * 0.4, 0.65, 6, 0.16],
                    [hw * 0.15, 0.9, 5, 0.14],
                ].forEach(([dx, rwm, rh, a]) => {
                    const lx = (((cx + dx) / w) * 100).toFixed(2);
                    layers.push(
                        `radial-gradient(ellipse ${Math.max(hw * rwm, 2).toFixed(1)}px ${rh}px at ${lx}% 100%, rgba(${rgb},${a}), transparent)`,
                    );
                });
            }
            x += segW;
        });
        return layers.join(", ");
    }

    function handleClear() {
        if (clearing || !value) return;

        if (prefersReducedMotion()) {
            onChange("");
            inputRef.current?.focus({ preventScroll: true });
            return;
        }

        const wrap = wrapRef.current;
        const mirror = mirrorRef.current;
        const phold = pholdRef.current;
        const glow = glowRef.current;
        if (!wrap || !mirror || !phold || !glow) return;

        // The mirror already holds the current value from the sync effect; the
        // frozen copy is what flies away.
        const keepFocus = document.activeElement === inputRef.current;

        const total = readNumberVar("--clear-dur", 1000, wrap);
        const outDur = readNumberVar("--clear-out-dur", 400, wrap);
        const inDur = readNumberVar("--clear-in-dur", 400, wrap);
        const outFly = readNumberVar("--clear-out-fly", 12, wrap);
        const inFly = readNumberVar("--clear-in-fly", 12, wrap);
        const blur = readNumberVar("--clear-blur", 2, wrap);
        const delay = readNumberVar("--glow-delay", 50, wrap);
        const peakAt = readNumberVar("--glow-peak-at", 0.15, wrap);
        const gOp = readNumberVar("--glow-opacity", 0.42, wrap);
        const easeOut = bezier(
            readStringVar("--clear-out-ease", "cubic-bezier(0.22, 1, 0.36, 1)", wrap),
        );
        const easeIn = bezier(
            readStringVar("--clear-in-ease", "cubic-bezier(0.22, 1, 0.36, 1)", wrap),
        );

        setClearing(true);
        onChange("");

        glow.style.background = buildGlow(mirror.textContent);
        glow.style.opacity = "0";
        phold.style.transform = `translateY(-${inFly}px)`;
        phold.style.opacity = "0.9";
        phold.style.filter = `blur(${blur}px)`;

        const t0 = performance.now();
        const tick = (now) => {
            const el = now - t0;

            const eo = easeOut(Math.min(1, el / outDur));
            mirror.style.transform = `translateY(${(eo * outFly).toFixed(1)}px)`;
            mirror.style.opacity = (1 - eo).toFixed(3);
            mirror.style.filter = `blur(${(eo * blur).toFixed(1)}px)`;

            const ei = easeIn(Math.min(1, el / inDur));
            phold.style.transform = `translateY(${(-inFly + ei * inFly).toFixed(1)}px)`;
            phold.style.opacity = (0.9 + ei * 0.1).toFixed(3);
            phold.style.filter = `blur(${(blur - ei * blur).toFixed(1)}px)`;

            let g = 0;
            if (el > delay) {
                const gp = Math.min(1, (el - delay) / Math.max(1, total - delay));
                g = gp < peakAt ? gp / peakAt : 1 - (gp - peakAt) / (1 - peakAt);
            }
            glow.style.opacity = (g * gOp).toFixed(3);

            if (el < total) {
                rafRef.current = requestAnimationFrame(tick);
                return;
            }
            mirror.style.cssText = "";
            phold.style.cssText = "";
            mirror.textContent = "";
            glow.style.opacity = "0";
            glow.style.background = "";
            setClearing(false);
            if (keepFocus) {
                requestAnimationFrame(() =>
                    inputRef.current?.focus({ preventScroll: true }),
                );
            }
        };
        rafRef.current = requestAnimationFrame(tick);
    }

    /* Keep the caret in the field when the clear button is pressed, so the
       placeholder falls into a still-focused input. */
    const keepFocus = (event) => {
        if (document.activeElement === inputRef.current) event.preventDefault();
    };

    const hasValue = value.length > 0;

    return (
        <div className="relative">
            <div
                ref={wrapRef}
                className={cn(
                    "t-clear relative",
                    hasValue && "has-value",
                    clearing && "is-clearing",
                )}
            >
                <label htmlFor={id} className="sr-only">
                    Search features
                </label>
                <input
                    ref={inputRef}
                    id={id}
                    type="text"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder={clearing ? "" : placeholder}
                    autoComplete="off"
                    /* The real field is the accessible one; the two overlays below
                       are visual only. */
                    aria-describedby={`${id}-count`}
                />
                <div ref={mirrorRef} className="t-clear-mirror" aria-hidden="true" />
                <div ref={pholdRef} className="t-clear-placeholder" aria-hidden="true">
                    {placeholder}
                </div>
                <div ref={glowRef} className="t-clear-glow" aria-hidden="true" />

                {/* One always-mounted control, `09-icon-swap` cross-fading the
                    magnifier into the ×. Mounting the × conditionally would give
                    it nothing to animate from, and swapping it in would also
                    reflow the field's trailing edge.

                    The centring translate lives on the wrapper, not the button:
                    `pill-chunky`'s `:active` sets its own `transform`, which
                    would replace a `-translate-y-1/2` on the same element and
                    drop the button half its height on every press. */}
                <span className="absolute right-2 top-1/2 z-[4] -translate-y-1/2">
                    <button
                        type="button"
                        className="t-clear-btn pill-chunky inline-flex h-9 w-9 items-center justify-center bg-secondary text-secondary-foreground disabled:bg-transparent disabled:text-muted-foreground disabled:shadow-none"
                        aria-label="Clear search"
                        disabled={!hasValue}
                        aria-hidden={!hasValue}
                        tabIndex={hasValue ? undefined : -1}
                        onPointerDown={keepFocus}
                        onMouseDown={keepFocus}
                        onClick={handleClear}
                    >
                        <span
                            className="t-icon-swap"
                            data-state={hasValue ? "b" : "a"}
                        >
                            <span className="t-icon" data-icon="a">
                                <Search className="h-4 w-4" />
                            </span>
                            <span className="t-icon" data-icon="b">
                                <X className="h-4 w-4" />
                            </span>
                        </span>
                    </button>
                </span>
            </div>

            {/* `03-notification-badge`. Anchored out here rather than inside
                `.t-clear`, whose `overflow: hidden` (load-bearing — it clips the
                streak to the rounded field) would crop it. */}
            <span className="t-badge" data-open={hasValue ? "true" : "false"}>
                <span className="t-badge-dot">{matchCount}</span>
            </span>
            <span id={`${id}-count`} className="sr-only" role="status">
                {matchCount} {matchCount === 1 ? "feature" : "features"} match
            </span>
        </div>
    );
}

export default SearchField;
