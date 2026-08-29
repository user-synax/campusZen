"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animated unread count. Each digit re-enters with a blurred slide (transitions.dev
 * "number pop-in"). The replay is driven by toggling the `.is-animating` class
 * off then on across a reflow so the animation restarts on every value change.
 */
export default function AnimatedCount({ value, max = 9 }) {
    const [digits, setDigits] = useState([]);
    const [animating, setAnimating] = useState(false);
    const groupRef = useRef(null);

    useEffect(() => {
        const str = value > max ? `${max}+` : String(value);
        const chars = Array.from(str);
        setDigits(chars);
        setAnimating(false);
        const raf = requestAnimationFrame(() => {
            void groupRef.current?.offsetHeight; // force reflow → restart animation
            setAnimating(true);
        });
        return () => cancelAnimationFrame(raf);
    }, [value, max]);

    return (
        <span
            ref={groupRef}
            className={`t-digit-group${animating ? " is-animating" : ""}`}
            aria-hidden="true"
        >
            {digits.map((ch, i) => {
                const pos = digits.length - i;
                const stagger = pos === 2 ? "1" : pos === 1 ? "2" : undefined;
                return (
                    <span key={i} className="t-digit" data-stagger={stagger}>
                        {ch}
                    </span>
                );
            })}
        </span>
    );
}
