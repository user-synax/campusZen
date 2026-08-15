"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const SHOWCASE_ITEMS = [
    {
        src: "/p1.png",
        alt: "Student Feed feature showing campus posts",
        title: "Student Feed",
        description: "Stay connected with your campus community in real-time.",
    },
    {
        src: "/p2.png",
        alt: "Resource Vault showing study materials",
        title: "Resource Vault",
        description: "Access verified notes, PYQs, and formula sheets.",
    },
    {
        src: "/p3.png",
        alt: "Campus Communities showing code areas",
        title: "Campus Communities",
        description: "Join interest-based communities and code areas.",
    },
];

export default function ProductShowcase() {
    const sectionRef = useRef(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        if (reduceMotion) {
            setVisible(true);
            return;
        }

        const el = sectionRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15 },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <section ref={sectionRef} className="py-24 px-4 bg-background">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-2xl font-bold text-muted-foreground uppercase tracking-[0.2em]">
                        See it in action
                    </h2>
                    <p className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
                        CampusZen in action
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    {SHOWCASE_ITEMS.map((item, i) => (
                        <div
                            key={item.title}
                            className={cn(
                                "card-chunky group relative p-4 bg-card overflow-hidden transition-all hover:border-primary/30 hover:bg-accent/30 hover:-translate-y-1",
                                visible
                                    ? "opacity-100 translate-y-0"
                                    : "opacity-0 translate-y-6",
                            )}
                            style={{
                                transitionDuration:
                                    "700ms, 700ms, 300ms, 300ms",
                                transitionDelay: visible
                                    ? `${i * 100}ms`
                                    : "0ms",
                            }}
                        >
                            <div
                                className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden border-2 border-border bg-muted"
                                style={{ boxShadow: "var(--shadow-hard-sm)" }}
                            >
                                <Image
                                    src={item.src}
                                    alt={item.alt}
                                    fill
                                    sizes="(min-width: 768px) 33vw, 100vw"
                                    className="object-cover"
                                />
                            </div>
                            <div className="mt-6 space-y-2">
                                <h3 className="text-xl font-bold text-foreground">
                                    {item.title}
                                </h3>
                                <p className="text-muted-foreground text-base leading-relaxed font-medium">
                                    {item.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
