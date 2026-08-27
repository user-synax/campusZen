/**
 * Small shared helpers for the JS-driven transitions on this page.
 *
 * The CSS snippets each carry their own `prefers-reduced-motion` guard, but two
 * of them (the spinning counter and the input clear dissolve) do their work from
 * JavaScript, where a stylesheet can't reach. Those read this instead.
 */

/** True when the OS-level "reduce motion" setting is on. */
export function prefersReducedMotion() {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Read a numeric custom property off an element (defaulting to the document
 * root). Reading at call time rather than caching is what the snippets ask for:
 * retuning a variable then applies on the next run without a reload.
 */
export function readNumberVar(name, fallback, el) {
    if (typeof window === "undefined") return fallback;
    const target = el || document.documentElement;
    const raw = getComputedStyle(target).getPropertyValue(name);
    const value = parseFloat(raw);
    return Number.isFinite(value) ? value : fallback;
}

/** Read a custom property as a trimmed string. */
export function readStringVar(name, fallback, el) {
    if (typeof window === "undefined") return fallback;
    const target = el || document.documentElement;
    const raw = getComputedStyle(target).getPropertyValue(name).trim();
    return raw || fallback;
}

/**
 * Minimal `cubic-bezier(x1,y1,x2,y2)` sampler, so easing driven from JS matches
 * the same curve the stylesheet uses. Newton-Raphson on the x polynomial, which
 * converges in a handful of steps for the curves in the token scale.
 */
export function bezier(str) {
    const m = String(str).match(
        /cubic-bezier\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/,
    );
    if (!m) return (t) => t;
    const [x1, y1, x2, y2] = m.slice(1).map(parseFloat);
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;
    return (t) => {
        if (t <= 0) return 0;
        if (t >= 1) return 1;
        let s = t;
        for (let i = 0; i < 8; i++) {
            const dx = ((ax * s + bx) * s + cx) * s - t;
            const d = (3 * ax * s + 2 * bx) * s + cx;
            if (Math.abs(dx) < 1e-6 || d === 0) break;
            s -= dx / d;
        }
        return ((ay * s + by) * s + cy) * s;
    };
}
