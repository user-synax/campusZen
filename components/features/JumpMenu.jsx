"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";

/**
 * Floating jump menu — `20-plus-menu-morph.md`.
 *
 * The button's surface grows into the panel while the plus slides out and the
 * menu slides in, and the open state uses a bouncier ease than the close (the
 * snippet ships them as separate variables, and the polish skill is explicit that
 * an opening and a closing are not the same event).
 *
 * `overflow: hidden` on `.t-morph` is load-bearing: it's what clips the menu to
 * the growing surface instead of letting it spill out at full size.
 *
 * The snippet says to wrap the morph in a positioned anchor sized to the *open*
 * footprint when it grows out of a fixed corner — that's the outer div, with the
 * morph pinned to its bottom-right so it expands up and to the left, into the
 * page rather than off the edge of it.
 */

const LINKS = [
    { href: "#explore", label: "Explore the product" },
    { href: "#agents", label: "For AI agents" },
    { href: "#start", label: "First week" },
    { href: "#faq", label: "FAQ" },
];

export function JumpMenu() {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);

    useEffect(() => {
        if (!open) return;

        const onKey = (event) => {
            if (event.key === "Escape") setOpen(false);
        };
        const onPointerDown = (event) => {
            if (!rootRef.current?.contains(event.target)) setOpen(false);
        };

        document.addEventListener("keydown", onKey);
        document.addEventListener("pointerdown", onPointerDown);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("pointerdown", onPointerDown);
        };
    }, [open]);

    return (
        <div
            /* Sized to the open footprint (matching the override in
               app/transitions.css) so the panel has somewhere to grow into.
               Pointer-events are off on the anchor and back on for the morph, or
               this empty box would swallow clicks in the corner of every screen. */
            className="pointer-events-none fixed bottom-6 right-6 z-50 hidden h-[236px] w-[244px] lg:block"
        >
            <div
                ref={rootRef}
                className="t-morph pointer-events-auto absolute bottom-0 right-0"
                data-open={open ? "true" : "false"}
            >
                <div className="t-morph-menu p-3">
                    <p className="px-2 pb-2 pt-1 text-xs font-bold text-muted-foreground">
                        Jump to
                    </p>
                    <nav aria-label="Jump to section">
                        {LINKS.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={() => setOpen(false)}
                                tabIndex={open ? undefined : -1}
                                className="block rounded-xl px-2 py-2 text-sm font-bold hover:bg-accent"
                            >
                                {link.label}
                            </a>
                        ))}
                    </nav>
                </div>

                <button
                    type="button"
                    className="t-morph-plus"
                    aria-expanded={open}
                    aria-label={open ? "Close jump menu" : "Jump to a section"}
                    onClick={() => setOpen((value) => !value)}
                >
                    <Plus className="h-5 w-5" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}

export default JumpMenu;
