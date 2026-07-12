"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * @typedef {Object} HeroAction
 * @property {string} text
 * @property {string} href
 * @property {React.ReactNode} [icon]
 * @property {'default'|'glow'} [variant]
 */

/**
 * @typedef {Object} HeroProps
 * @property {Object} [badge]
 * @property {string} badge.text
 * @property {Object} badge.action
 * @property {string} badge.action.text
 * @property {string} badge.action.href
 * @property {string} title
 * @property {string} description
 * @property {HeroAction[]} actions
 * @property {Object} image
 * @property {string} image.light
 * @property {string} image.dark
 * @property {string} image.alt
 */

export function HeroSection({
    badge,
    title,
    description,
    actions,
    titleRotatingText,
    image,
}) {
    return (
        <section
            className={cn(
                "relative isolate min-h-screen flex items-center justify-center overflow-hidden",
                "bg-[#050505]",
                "py-18 sm:py-28 md:py-36 px-4",
            )}
        >
            <div className="relative z-10 mx-auto max-w-4xl text-center">
                <div className="flex flex-col items-center gap-8 sm:gap-12">
                    {badge && (
                        <Badge
                            variant="outline"
                            className="animate-appear py-2 px-4 gap-2 border-purple-500/30 bg-purple-500/10 text-purple-200"
                        >
                            <span>{badge.text}</span>
                            <a
                                href={badge.action?.href}
                                className="flex items-center gap-1 text-purple-300 hover:text-purple-200"
                            >
                                {badge.action?.text}
                                <ArrowRightIcon className="h-3 w-3" />
                            </a>
                        </Badge>
                    )}

                    {/* Title */}
                    <h1 className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-center px-4 font-black tracking-tight leading-none text-4xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl bg-gradient-to-b from-white via-white/90 to-neutral-400 bg-clip-text text-transparent drop-shadow-2xl">
                        {titleRotatingText ? (
                            <>
                                <span className="whitespace-nowrap">
                                    {titleRotatingText.prefix}
                                </span>

                                <div className="min-w-[2ch] flex justify-center">
                                    {titleRotatingText.component}
                                </div>

                                <span className="whitespace-nowrap">
                                    {titleRotatingText.suffix}
                                </span>
                            </>
                        ) : (
                            title
                        )}
                    </h1>
                    <p className="max-w-2xl text-sm text-gray-400 sm:text-xl delay-200 px-6 sm:px-4">
                        {description}
                    </p>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center delay-400 w-full max-w-[300px] sm:max-w-none mx-auto px-4 sm:px-0">
                        {actions.map((action, index) => (
                            <Button
                                key={index}
                                variant={action.variant}
                                size="lg"
                                asChild
                                className={cn(
                                    "rounded-full w-full sm:w-auto h-12 sm:h-14 text-base sm:text-lg px-8",
                                    action.variant === "glow"
                                        ? "bg-primary text-primary-foreground border-primary/20"
                                        : "bg-white/10 hover:bg-white/20 text-white border-white/10 backdrop-blur-sm",
                                )}
                            >
                                <Link
                                    href={action.href}
                                    className="flex items-center justify-center gap-2"
                                >
                                    {action.icon}
                                    {action.text}
                                </Link>
                            </Button>
                        ))}
                    </div>

                    {/* Image */}
                    {image && (
                        <div className="animate-appear delay-600 w-full max-w-5xl px-4">
                            <img
                                src={image.src}
                                alt={image.alt}
                                className="w-full h-auto rounded-3xl shadow-2xl border-7 border-white/10"
                            />
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
