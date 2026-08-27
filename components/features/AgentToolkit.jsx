"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { LearnChevron } from "@/components/ui/learn-chevron";
import { AGENT_FEATURES, WELL_KNOWN } from "./data";
import { AccChevron, StreamText, SuccessCheck } from "./bits";
import { Reveal, RevealLine, useInViewOnce } from "./Reveal";

/**
 * The agent toolkit.
 *
 * | Element                     | Transition        | Reference               |
 * | --------------------------- | ----------------- | ----------------------- |
 * | Intro paragraph on entry    | streaming text    | `30-streaming-text.md`  |
 * | Each capability's detail    | accordion expand  | `21-accordion.md`       |
 * | Copy confirmation           | success check     | `10-success-check.md`   |
 * | Confirmation message        | toast open/close  | `22-toast.md`           |
 * | The three doc links         | learn more hover  | `24-learn-more-hover`   |
 *
 * Every `sample` is request-side — a command you can run or a config you can
 * paste. No response payloads are shown anywhere on this page, because none are
 * captured in this repo and inventing one would misrepresent the API.
 */

const DOCS = [
    { href: "/openapi.json", label: "Read the OpenAPI spec" },
    { href: "/llms.txt", label: "Start at llms.txt" },
    { href: "/developers", label: "Developer docs" },
];

/** How long the confirmation stays up before it closes itself. */
const TOAST_HOLD = 2200;

export function AgentToolkit() {
    const [openId, setOpenId] = useState(AGENT_FEATURES[0].id);
    const [copiedId, setCopiedId] = useState(null);
    const [toast, setToast] = useState({ open: false, text: "" });
    const [introRef, introIn] = useInViewOnce({ threshold: 0.4 });

    const holdRef = useRef(0);
    const clearRef = useRef(0);

    useEffect(
        () => () => {
            clearTimeout(holdRef.current);
            clearTimeout(clearRef.current);
        },
        [],
    );

    const copy = useCallback(async (item) => {
        // No clipboard (insecure origin, or an older browser): say so rather than
        // flashing a success check for something that didn't happen.
        if (!navigator.clipboard?.writeText) {
            setToast({ open: true, text: "Copying isn't available here" });
            clearTimeout(holdRef.current);
            holdRef.current = setTimeout(
                () => setToast((t) => ({ ...t, open: false })),
                TOAST_HOLD,
            );
            return;
        }

        try {
            await navigator.clipboard.writeText(item.sample);
        } catch {
            setToast({ open: true, text: "Couldn't copy — select it instead" });
            clearTimeout(holdRef.current);
            holdRef.current = setTimeout(
                () => setToast((t) => ({ ...t, open: false })),
                TOAST_HOLD,
            );
            return;
        }

        setCopiedId(item.id);
        setToast({ open: true, text: `${item.sampleLabel} copied` });

        clearTimeout(holdRef.current);
        clearTimeout(clearRef.current);
        holdRef.current = setTimeout(
            () => setToast((t) => ({ ...t, open: false })),
            TOAST_HOLD,
        );
        // Unmount the check a little after the toast starts closing, so the
        // button doesn't reset while the message is still on screen.
        clearRef.current = setTimeout(() => setCopiedId(null), TOAST_HOLD + 400);
    }, []);

    return (
        <section id="agents" className="scroll-mt-28 py-20 sm:py-24">
            <div className="mx-auto max-w-container px-4">
                <Reveal className="max-w-2xl">
                    <RevealLine index={1}>
                        <span className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-1.5 text-sm font-semibold shadow-[var(--shadow-hard-sm)]">
                            <Bot className="h-4 w-4 text-primary" />
                            For AI Agents
                        </span>
                    </RevealLine>
                    <RevealLine
                        index={2}
                        as="h2"
                        className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl"
                    >
                        A platform agents can integrate with
                    </RevealLine>
                </Reveal>

                {/* The paragraph is *about* machine-readable surfaces, so it
                    arrives the way generated text does. Word wrappers are built
                    in JSX rather than by the snippet's DOM rewrite, which React
                    would undo on its next commit. */}
                <div ref={introRef} className="mt-4 max-w-2xl">
                    <StreamText
                        run={introIn}
                        text="CampusZen is built to be read and used by machines, not just people. Every capability below is discoverable without asking anyone for documentation."
                        className="text-base leading-relaxed text-muted-foreground"
                    />
                </div>

                <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
                    {/* ── Capabilities ──────────────────────────────────── */}
                    <div className="space-y-4">
                        {AGENT_FEATURES.map((item) => {
                            const Icon = item.icon;
                            const open = openId === item.id;
                            const copied = copiedId === item.id;
                            return (
                                <div
                                    key={item.id}
                                    className="t-acc card-chunky overflow-hidden bg-card"
                                    data-open={open ? "true" : "false"}
                                >
                                    <button
                                        type="button"
                                        className="t-acc-head flex w-full items-center gap-3 px-5 py-4 text-left"
                                        aria-expanded={open}
                                        aria-controls={`agent-panel-${item.id}`}
                                        onClick={() =>
                                            setOpenId(open ? null : item.id)
                                        }
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-accent"
                                        >
                                            <Icon className="h-4 w-4 text-primary" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-base font-bold">
                                                {item.title}
                                            </span>
                                            <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
                                                {item.endpoint}
                                            </span>
                                        </span>
                                        <AccChevron />
                                    </button>

                                    <div
                                        className="t-acc-panel"
                                        id={`agent-panel-${item.id}`}
                                        role="region"
                                    >
                                        <div className="t-acc-panel-inner px-5">
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                {item.body}
                                            </p>
                                            <div className="mt-4 rounded-xl border-2 border-border bg-secondary/40">
                                                <div className="flex items-center justify-between gap-3 border-b-2 border-border px-3 py-2">
                                                    <span className="text-xs font-bold">
                                                        {item.sampleLabel}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => copy(item)}
                                                        className="pill-chunky inline-flex items-center gap-1.5 bg-card px-2.5 py-1.5 text-xs font-bold"
                                                    >
                                                        {/* Mounted only on
                                                            success: the check is
                                                            an entrance, and a
                                                            fresh mount with
                                                            data-state="in" is
                                                            the trigger the
                                                            snippet documents. */}
                                                        {copied ? (
                                                            <SuccessCheck size={13} />
                                                        ) : (
                                                            <Copy
                                                                className="h-3.5 w-3.5"
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                        Copy
                                                    </button>
                                                </div>
                                                <pre className="overflow-x-auto px-3 py-3 font-mono text-xs leading-relaxed">
                                                    <code>{item.sample}</code>
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Well-known resources ──────────────────────────── */}
                    <Reveal className="card-chunky bg-card p-5">
                        <RevealLine index={1}>
                            <h3 className="text-sm font-bold">
                                Well-known resources
                            </h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {WELL_KNOWN.length} paths any agent can fetch
                                without credentials.
                            </p>
                        </RevealLine>
                        <RevealLine index={2} className="mt-4">
                            <ul className="space-y-1.5">
                                {WELL_KNOWN.map((path) => (
                                    <li key={path}>
                                        <span className="flex items-start gap-2 font-mono text-[0.6875rem] leading-relaxed text-muted-foreground">
                                            <Check
                                                aria-hidden="true"
                                                className="mt-0.5 h-3 w-3 shrink-0 text-primary"
                                            />
                                            <span className="break-all">
                                                {path}
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </RevealLine>
                        <RevealLine
                            index={3}
                            className="mt-5 flex flex-col gap-2 border-t-2 border-border pt-4"
                        >
                            {DOCS.map((doc) => (
                                <Link
                                    key={doc.href}
                                    href={doc.href}
                                    className="t-learn inline-flex items-center gap-1.5 text-sm font-bold"
                                >
                                    {doc.label}
                                    <LearnChevron />
                                </Link>
                            ))}
                        </RevealLine>
                    </Reveal>
                </div>
            </div>

            {/* `22-toast`. Always mounted so the close animation has something to
                play on — conditional rendering would tear it out mid-transition.
                350ms in, 250ms out, straight from the snippet: an arrival earns
                more time than a dismissal. */}
            <div className="fx-toast-dock">
                <div
                    className={cn(
                        "t-toast card-chunky flex items-center gap-2 bg-card px-4 py-2.5 text-sm font-bold",
                        toast.open && "is-open",
                    )}
                    role="status"
                    aria-live="polite"
                >
                    <Check aria-hidden="true" className="h-4 w-4 text-primary" />
                    {toast.text}
                </div>
            </div>
        </section>
    );
}

export default AgentToolkit;
