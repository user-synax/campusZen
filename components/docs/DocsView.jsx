"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useState } from "react";
import { ChevronDown, List, BookOpen } from "lucide-react";
import { slugify } from "@/lib/docs";
import { cn } from "@/lib/utils";

function getNodeText(children) {
    if (typeof children === "string" || typeof children === "number") {
        return String(children);
    }
    if (Array.isArray(children)) {
        return children.map(getNodeText).join("");
    }
    if (children && children.props) {
        return getNodeText(children.props.children);
    }
    return "";
}

export default function DocsView({ markdown, toc }) {
    const [activeId, setActiveId] = useState(toc[0]?.id || "");
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setActiveId(entry.target.id);
                });
            },
            { rootMargin: "-90px 0px -70% 0px", threshold: 0 },
        );

        toc.forEach((t) => {
            const el = document.getElementById(t.id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [toc]);

    const scrollTo = (id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const y = el.getBoundingClientRect().top + window.scrollY - 110;
        window.scrollTo({ top: y, behavior: "smooth" });
        setActiveId(id);
        setMobileOpen(false);
    };

    const components = {
        h2: ({ node, children, ...props }) => {
            const id = slugify(getNodeText(children));
            return (
                <h2 id={id} {...props}>
                    {children}
                </h2>
            );
        },
    };

    const TocLinks = () => (
        <nav className="flex flex-col gap-1">
            {toc.map((t) => (
                <button
                    key={t.id}
                    onClick={() => scrollTo(t.id)}
                    className={cn(
                        "chip-chunky text-left px-3 py-2 text-sm font-medium w-full",
                        activeId === t.id
                            ? "chip-chunky-active text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                    )}
                >
                    {t.title}
                </button>
            ))}
        </nav>
    );

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 xl:px-8 pt-24 pb-16">
            <header className="mb-8">
                <div className="inline-flex items-center gap-2 chip-chunky px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                    <BookOpen className="w-4 h-4" /> Docs
                </div>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
                    Everything you can do in CampusZen, explained simply — for
                    students, not engineers.
                </p>
            </header>

            {/* Mobile / tablet collapsible TOC */}
            <div className="lg:hidden mb-6">
                <button
                    onClick={() => setMobileOpen((o) => !o)}
                    className="chip-chunky w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
                    aria-expanded={mobileOpen}
                >
                    <span className="flex items-center gap-2">
                        <List className="w-4 h-4" /> On this page
                    </span>
                    <ChevronDown
                        className={cn(
                            "w-4 h-4 transition-transform",
                            mobileOpen && "rotate-180",
                        )}
                    />
                </button>
                {mobileOpen && (
                    <div className="card-chunky mt-2 p-2">
                        <TocLinks />
                    </div>
                )}
            </div>

            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                {/* Desktop sticky TOC */}
                <aside className="hidden lg:block w-64 shrink-0">
                    <div className="card-chunky sticky top-24 p-5">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3 px-1">
                            On this page
                        </h3>
                        <TocLinks />
                    </div>
                </aside>

                <article className="card-chunky flex-1 p-7 sm:p-10 lg:p-14">
                    <div className="docs-prose mx-auto max-w-3xl">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={components}
                        >
                            {markdown}
                        </ReactMarkdown>
                    </div>
                </article>
            </div>
        </div>
    );
}
