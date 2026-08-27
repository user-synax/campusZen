"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PopNumber } from "@/components/ui/pop-number";
import { LearnChevron } from "@/components/ui/learn-chevron";

/**
 * Landing hero, built entirely on the transitions-dev skill.
 *
 * Motion inventory — every piece comes from a snippet installed verbatim in
 * `app/transitions.css`, driven by the shared motion-token scale:
 *
 * | Element                        | Transition        | Reference               |
 * | ------------------------------ | ----------------- | ----------------------- |
 * | Staggered entrance of each row | texts reveal      | `18-texts-reveal.md`    |
 * | Product visual following cursor| card hover tilt   | `19-card-tilt.md`       |
 * | Eyebrow label                  | shimmer text      | `15-shimmer-text.md`    |
 * | Secondary CTA chevron          | learn more hover  | `24-learn-more-hover.md`|
 * | Social-proof avatar row        | avatar group hover| `11-avatar-group-hover.md`|
 * | Avatar / stat labels           | tooltip           | `17-tooltip.md`         |
 * | Live counters                  | number pop-in     | `02-number-pop-in.md`   |
 *
 * There is no framer-motion here: CSS owns all timing, which keeps the framer
 * runtime off the landing page's first-paint path.
 */

/**
 * Peak tilt at the card edges, in degrees. The card-tilt snippet keeps this in
 * JS rather than a CSS variable; 10–16 reads as a subtle, tasteful lean.
 */
const TILT_MAX = 11;

/**
 * Avatar group hover (`11-avatar-group-hover.md`) with a tooltip
 * (`17-tooltip.md`) per avatar. Hovering lifts the target and combs its
 * neighbours with a power falloff; leaving the row springs everything back.
 */
function ProofAvatars({ items }) {
    const rootRef = useRef(null);

    const setShifts = useCallback((activeIdx, phase) => {
        const root = rootRef.current;
        if (!root) return;

        // Read the tokens off the group rather than <html>: `--avatar-lift` is
        // scoped to `.t-hero .t-avatar-group` in the retuning section, and
        // custom properties inherit, so the group sees both the local override
        // and the global defaults.
        const cs = getComputedStyle(root);
        const num = (name, fallback) => {
            const v = parseFloat(cs.getPropertyValue(name));
            return Number.isFinite(v) ? v : fallback;
        };
        const ease = (name, fallback) =>
            cs.getPropertyValue(name).trim() || fallback;

        const lift = num("--avatar-lift", -4);
        const falloff = num("--avatar-falloff", 0.45);
        const scale = num("--avatar-scale", 1.05);
        // The timing function is written inline *before* the variables so each
        // new transition picks up the curve that was current when `transform`
        // changed: a clean ease on the way up, a bouncy spring on the return.
        const tf =
            phase === "out"
                ? ease("--avatar-ease-out", "cubic-bezier(0.34, 3.85, 0.64, 1)")
                : ease("--avatar-ease-in", "cubic-bezier(0.22, 1, 0.36, 1)");

        root.querySelectorAll(".t-avatar").forEach((el, i) => {
            el.style.transitionTimingFunction = tf;
            if (activeIdx == null) {
                el.style.setProperty("--shift", "0px");
                el.style.setProperty("--scale-active", "1");
                return;
            }
            const d = Math.abs(i - activeIdx);
            el.style.setProperty(
                "--shift",
                (lift * Math.pow(falloff, d)).toFixed(3) + "px",
            );
            el.style.setProperty(
                "--scale-active",
                i === activeIdx ? String(scale) : "1",
            );
        });
    }, []);

    return (
        <div
            ref={rootRef}
            className="t-avatar-group flex items-center"
            onMouseLeave={() => setShifts(null, "out")}
        >
            {items.map((item, index) => (
                <div
                    key={item.label}
                    className="t-avatar -ml-3 first:ml-0"
                    onMouseEnter={() => setShifts(index, "in")}
                >
                    <span className="t-tt-wrap">
                        <span
                            tabIndex={0}
                            aria-describedby={`hero-proof-${index}`}
                            className={cn(
                                "t-tt-trigger flex h-11 w-11 items-center justify-center rounded-full",
                                "border-2 border-background bg-accent text-xs font-black tracking-tight",
                                "text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            )}
                        >
                            {item.initials}
                        </span>
                        <span
                            id={`hero-proof-${index}`}
                            role="tooltip"
                            className="t-tt"
                        >
                            {item.label}
                        </span>
                    </span>
                </div>
            ))}
        </div>
    );
}

/**
 * @typedef {Object} HeroAction
 * @property {string} text
 * @property {string} href
 * @property {'glow'|'ghost'} [variant]
 */

/**
 * @param {Object}   props
 * @param {Object}   [props.badge]                 Eyebrow label.
 * @param {string}   props.badge.text              Shimmered copy.
 * @param {string}   [props.badge.emoji]           Kept outside the shimmer layer.
 * @param {string}   [props.title]                 Static headline fallback.
 * @param {Object}   [props.titleRotatingText]
 * @param {React.ReactNode} props.titleRotatingText.component  The typewriter.
 * @param {string}   [props.titleRotatingText.longest]         Longest string, used
 *   to reserve the headline's box so nothing below it reflows.
 * @param {string}   props.description
 * @param {HeroAction[]} props.actions
 * @param {Object}   [props.proof]
 * @param {{initials: string, label: string}[]} props.proof.items
 * @param {string}   [props.proof.caption]
 * @param {Object}   [props.stats]                 Live counts for the pop-in.
 * @param {Object}   [props.image]
 * @param {string}   props.image.src
 * @param {string}   props.image.alt
 * @param {Object}   [props.highlight]             Floating stat card.
 */
export function HeroSection({
    badge,
    title,
    description,
    actions = [],
    titleRotatingText,
    proof,
    stats,
    image,
    highlight,
}) {
    const stageRef = useRef(null);
    const tiltRef = useRef(null);
    const tiltCardRef = useRef(null);

    // Texts reveal (`18-texts-reveal.md`). The rows render in their pre-state on
    // the server, so a forced reflow is enough to make that the "before-change"
    // style before `.is-shown` flips them — same path the snippet documents for
    // a replay.
    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return;
        stage.classList.remove("is-hiding", "is-shown");
        void stage.offsetHeight;
        stage.classList.add("is-shown");
    }, []);

    // Card hover tilt (`19-card-tilt.md`).
    const resetTilt = useCallback(() => {
        const tilt = tiltRef.current;
        const card = tiltCardRef.current;
        if (!tilt || !card) return;
        tilt.classList.remove("is-hover");
        card.classList.remove("is-tilting");
        card.style.setProperty("--tilt-rx", "0deg");
        card.style.setProperty("--tilt-ry", "0deg");
    }, []);

    const trackTilt = useCallback((event) => {
        // Mouse only. The snippet also supports tap-hold-drag on touch, but that
        // needs `touch-action: none`, and this card fills most of a phone
        // viewport — it would trap the very swipe people use to scroll past it.
        if (event.pointerType !== "mouse") return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
            return;

        const tilt = tiltRef.current;
        const card = tiltCardRef.current;
        if (!tilt || !card) return;

        // Measured on the outer wrapper, which never transforms — tracking the
        // rotating card itself makes its edges slip out from under the cursor
        // and the hover flickers.
        const r = tilt.getBoundingClientRect();
        const px = Math.min(1, Math.max(0, (event.clientX - r.left) / r.width));
        const py = Math.min(1, Math.max(0, (event.clientY - r.top) / r.height));

        tilt.classList.add("is-hover");
        card.classList.add("is-tilting");
        card.style.setProperty(
            "--tilt-ry",
            ((px - 0.5) * TILT_MAX).toFixed(2) + "deg",
        );
        card.style.setProperty(
            "--tilt-rx",
            ((0.5 - py) * TILT_MAX).toFixed(2) + "deg",
        );
        card.style.setProperty("--tilt-gx", (px * 100).toFixed(1) + "%");
        card.style.setProperty("--tilt-gy", (py * 100).toFixed(1) + "%");
    }, []);

    const rotating = titleRotatingText?.component;
    const longest = titleRotatingText?.longest;

    return (
        // Forced dark: the hero stays dark regardless of the site theme toggle
        // (deliberate, matches the original design). Because `.dark` sits on this
        // section rather than <html>, the hero's colour tokens are declared on
        // `:root, .dark` in app/transitions.css so they re-substitute here.
        <section
            className={cn(
                "t-hero dark relative isolate overflow-hidden",
                "flex items-center bg-background fade-bottom",
                "min-h-[calc(100svh-4rem)]",
            )}
        >
            {/* Backdrop: grid texture, then a broad brand glow behind the copy
                and a tighter one behind the visual. */}
            <div className="pointer-events-none absolute inset-0 bg-grid-pattern" />
            <div className="pointer-events-none absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-primary/15 blur-[130px]" />
            <div className="pointer-events-none absolute -bottom-52 right-0 h-[30rem] w-[30rem] rounded-full bg-primary/10 blur-[130px]" />

            <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:py-28">
                <div
                    ref={stageRef}
                    className={cn(
                        "t-stagger grid items-center gap-14",
                        "lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12 xl:gap-16",
                    )}
                >
                    {/* ── Copy column ───────────────────────────────────── */}
                    <div className="text-center lg:text-left">
                        {badge && (
                            <div className="t-stagger-line t-stagger-line--1">
                                <span className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-card/70 px-4 py-1.5 shadow-[var(--shadow-hard-sm)] backdrop-blur-sm">
                                    <span
                                        aria-hidden="true"
                                        className="h-2 w-2 rounded-full bg-primary"
                                    />
                                    {/* Shimmer text: the visible string is
                                        duplicated into data-text so the ::before
                                        layer can mask the sweep onto the same
                                        glyphs. Keep the two in sync. */}
                                    <span
                                        className="t-shimmer whitespace-nowrap text-xs font-bold uppercase tracking-[0.14em] sm:text-sm"
                                        data-text={badge.text}
                                    >
                                        {badge.text}
                                    </span>
                                    {badge.emoji && (
                                        <span aria-hidden="true">
                                            {badge.emoji}
                                        </span>
                                    )}
                                </span>
                            </div>
                        )}

                        <h1
                            className={cn(
                                "t-stagger-line t-stagger-line--2 mt-6 font-black tracking-tight",
                                "text-[2.25rem] leading-[1.08] sm:text-5xl lg:text-[3.5rem] xl:text-[4rem]",
                            )}
                        >
                            {/* Grid stack, not an absolute overlay: both children
                                sit in row 1 / column 1, so the headline's height
                                is max(longest string, live string). That reserves
                                the tallest box the typewriter can need — the copy
                                below never bounces as it cycles through strings of
                                very different lengths — while still growing rather
                                than clipping if a live line ever wraps taller.
                                The grid lives on an inner span because
                                `.t-stagger-line` is unlayered and its
                                `display: block` would outrank a Tailwind `grid`
                                utility on the same element. */}
                            <span className="grid">
                                {longest && (
                                    <span
                                        aria-hidden="true"
                                        className="invisible col-start-1 row-start-1"
                                    >
                                        {longest}
                                    </span>
                                )}
                                <span className="col-start-1 row-start-1 bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
                                    {rotating ?? title}
                                </span>
                            </span>
                        </h1>

                        <div className="t-stagger-line t-stagger-line--3 mt-6">
                            <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
                                {description}
                            </p>
                        </div>

                        {actions.length > 0 && (
                            <div className="t-stagger-line t-stagger-line--4 mt-9">
                                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 lg:justify-start justify-center">
                                    {actions.map((action) =>
                                        action.variant === "glow" ? (
                                            <Link
                                                key={action.href}
                                                href={action.href}
                                                className="pill-chunky inline-flex h-12 items-center justify-center gap-2 bg-primary px-8 text-base font-bold text-primary-foreground sm:h-14 sm:text-lg"
                                            >
                                                {action.text}
                                            </Link>
                                        ) : (
                                            // Learn more hover: the chevron
                                            // slides and its two arms spread
                                            // apart into a full arrow.
                                            <Link
                                                key={action.href}
                                                href={action.href}
                                                className="t-learn cta-ghost inline-flex h-12 items-center justify-center gap-2 bg-secondary/60 px-7 text-base font-bold text-secondary-foreground backdrop-blur-sm sm:h-14 sm:text-lg"
                                            >
                                                {action.text}
                                                <LearnChevron />
                                            </Link>
                                        ),
                                    )}
                                </div>
                            </div>
                        )}

                        {proof?.items?.length > 0 && (
                            <div className="t-stagger-line t-stagger-line--5 mt-10">
                                <div className="flex flex-col items-center gap-4 sm:flex-row lg:justify-start justify-center">
                                    <ProofAvatars items={proof.items} />
                                    <p className="text-sm text-muted-foreground">
                                        <PopNumber
                                            value={stats?.users ?? 0}
                                            suffix="+"
                                            className="font-black text-foreground"
                                        />{" "}
                                        {proof.caption}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Visual column ─────────────────────────────────── */}
                    {image && (
                        <div className="t-stagger-line t-stagger-line--2">
                            <div className="relative mx-auto max-w-xl lg:max-w-none">
                                {/* Card hover tilt: `.t-tilt` is the flat hit
                                    area and never transforms; `.t-tilt-card`
                                    inside it is what rotates. */}
                                <div
                                    ref={tiltRef}
                                    className="t-tilt"
                                    onPointerMove={trackTilt}
                                    onPointerUp={resetTilt}
                                    onPointerCancel={resetTilt}
                                    onPointerLeave={(event) => {
                                        if (event.pointerType === "mouse")
                                            resetTilt();
                                    }}
                                >
                                    <div
                                        ref={tiltCardRef}
                                        className="t-tilt-card border-2 border-border bg-card shadow-[var(--shadow-hard)]"
                                    >
                                        {/* Chrome bar, so the screenshot reads
                                            as product UI rather than art. */}
                                        <div
                                            aria-hidden="true"
                                            className="flex items-center gap-1.5 border-b-2 border-border bg-secondary/50 px-4 py-3"
                                        >
                                            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/35" />
                                            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" />
                                            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/20" />
                                            <span className="ml-3 h-4 flex-1 rounded-full bg-muted-foreground/10" />
                                        </div>
                                        <img
                                            src={image.src}
                                            alt={image.alt}
                                            className="block h-auto w-full"
                                        />
                                        <div className="t-tilt-glare" />
                                    </div>
                                </div>

                                {/* Floating stat card. Deliberately outside
                                    `.t-tilt-card` so it stays flat while the
                                    visual leans, which reads as depth. */}
                                {highlight && (
                                    <div className="card-chunky absolute -bottom-6 left-3 flex items-center gap-3 bg-card px-4 py-3 sm:-left-6">
                                        <span
                                            aria-hidden="true"
                                            className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-border bg-accent text-lg"
                                        >
                                            {highlight.icon}
                                        </span>
                                        <span className="block text-left">
                                            <PopNumber
                                                value={
                                                    stats?.[
                                                        highlight.statKey
                                                    ] ?? 0
                                                }
                                                suffix="+"
                                                className="text-lg font-black leading-none text-foreground"
                                            />
                                            <span className="mt-1 block text-xs font-medium text-muted-foreground">
                                                {highlight.label}
                                            </span>
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
