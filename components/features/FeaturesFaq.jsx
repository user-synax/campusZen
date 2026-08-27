"use client";

import { useState } from "react";
import { FAQ } from "./data";
import { AccChevron } from "./bits";
import { Reveal, RevealLine } from "./Reveal";

/**
 * FAQ — `21-accordion.md`, one row open at a time.
 *
 * Height comes from the snippet's `grid-template-rows: 0fr ↔ 1fr`, so nothing is
 * measured and answers of any length collapse cleanly. The chevron flips with
 * `scaleY(-1)` rather than morphing its path, because CSS `d:` interpolation is
 * Chromium-only.
 */
export function FeaturesFaq() {
    const [openId, setOpenId] = useState(null);

    return (
        <section id="faq" className="scroll-mt-28 py-20 sm:py-24">
            <div className="mx-auto max-w-3xl px-4">
                <Reveal className="text-center">
                    <RevealLine
                        index={1}
                        as="h2"
                        className="text-3xl font-extrabold tracking-tight sm:text-4xl"
                    >
                        Questions, answered
                    </RevealLine>
                    <RevealLine
                        index={2}
                        as="p"
                        className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground"
                    >
                        The short version. Pricing is the source of truth for
                        anything about plans.
                    </RevealLine>
                </Reveal>

                <Reveal className="mt-10 space-y-3">
                    {FAQ.map((item, index) => {
                        const open = openId === item.id;
                        return (
                            <RevealLine
                                key={item.id}
                                index={Math.min(index + 1, 8)}
                            >
                                <div
                                    className="t-acc card-chunky overflow-hidden bg-card"
                                    data-open={open ? "true" : "false"}
                                >
                                    <button
                                        type="button"
                                        className="t-acc-head flex w-full items-center gap-4 px-5 py-4 text-left"
                                        aria-expanded={open}
                                        aria-controls={`faq-panel-${item.id}`}
                                        onClick={() =>
                                            setOpenId(open ? null : item.id)
                                        }
                                    >
                                        <span className="flex-1 text-base font-bold">
                                            {item.q}
                                        </span>
                                        <AccChevron />
                                    </button>
                                    <div
                                        className="t-acc-panel"
                                        id={`faq-panel-${item.id}`}
                                        role="region"
                                    >
                                        <div className="t-acc-panel-inner px-5">
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                {item.a}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </RevealLine>
                        );
                    })}
                </Reveal>
            </div>
        </section>
    );
}

export default FeaturesFaq;
