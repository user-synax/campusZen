import Link from "next/link";
import Footer from "@/components/landing/Footer";
import Logo from "@/components/shared/Logo";
import {
    Sparkles,
    Github,
    Twitter,
    Instagram,
    Linkedin,
    MessageCircle,
    Heart,
    Bot,
    Palette,
    Type,
    Quote,
    Globe2,
    Lock,
} from "lucide-react";

export const metadata = {
    title: "Brand — CampusZen",
    description:
        "The CampusZen brand: logo, colors, typography, voice, and values for the student social network built for Indian college students.",
};

const PALETTE = [
    { name: "Campus Blue", hex: "#4ba9e1", note: "Primary · links, accents, the “Zen”", fg: "text-white" },
    { name: "Ink", hex: "#0f0f0f", note: "Marketing background", fg: "text-white" },
    { name: "Surface", hex: "#1a1c20", note: "Card / panel (dark)", fg: "text-white" },
    { name: "Border", hex: "#242831", note: "Hairline strokes", fg: "text-white" },
    { name: "Muted", hex: "#8b93a1", note: "Secondary text", fg: "text-white" },
    { name: "Destructive", hex: "#ef4444", note: "Errors / destructive", fg: "text-white" },
];

const TYPE = [
    {
        label: "Display",
        family: '"Bricolage Grotesque", sans-serif',
        sample: "CampusZen",
        note: "Headlines, wordmark, big statements.",
    },
    {
        label: "Body",
        family: '"Inter", system-ui, sans-serif',
        sample: "Connect, share, and grow.",
        note: "UI text, paragraphs, metadata.",
    },
];

const VALUES = [
    { icon: Heart, title: "Student-first", body: "An exclusive network for verified Indian college students." },
    { icon: Globe2, title: "Open by default", body: "Public communities, events, and an open API for agents." },
    { icon: Bot, title: "AI-ready", body: "MCP, OpenAPI, llms.txt, and NLWeb /ask ship from day one." },
    { icon: Lock, title: "Safe & focused", body: "Verification, moderation, and student-only access." },
];

const SOCIALS = [
    { icon: Github, label: "GitHub", href: "https://github.com/user-synax" },
    { icon: Twitter, label: "X / Twitter", href: "https://x.com/campuszentech" },
    { icon: Instagram, label: "Instagram", href: "https://instagram.com/campuszen.tech" },
    { icon: MessageCircle, label: "WhatsApp", href: "https://wa.me/+918826343179?text=Hello%20campusZen!" },
];

function Tile({ className = "", children }) {
    return (
        <div className={`card-chunky bg-card p-6 ${className}`}>{children}</div>
    );
}

export default function BrandPage() {
    return (
        <>
            <main className="pt-28 pb-24">
                <section className="relative overflow-hidden">
                    <div className="pointer-events-none absolute inset-0 -z-10">
                        <div className="absolute left-1/2 top-[-14rem] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
                        <div className="absolute right-[-8rem] top-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
                    </div>
                    <div className="mx-auto max-w-container px-4 text-center">
                        <span className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-1.5 text-sm font-semibold text-primary shadow-[var(--shadow-hard-sm)]">
                            <Sparkles className="h-4 w-4" />
                            Brand Kit
                        </span>
                        <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
                            The CampusZen brand
                        </h1>
                        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                            Everything that makes CampusZen recognizable — the
                            logo, the palette, the type, and the voice of the
                            student social network for India.
                        </p>
                    </div>
                </section>

                {/* Bento grid */}
                <section className="mx-auto mt-16 max-w-container px-4">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Logo hero */}
                        <Tile className="sm:col-span-2 lg:col-span-2 lg:row-span-2 flex flex-col justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    Logo & wordmark
                                </p>
                                <div className="mt-6 flex items-center gap-4">
                                    <Logo size="lg" href="/" />
                                </div>
                                <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
                                    The wordmark pairs{" "}
                                    <span className="font-bold text-foreground">
                                        Campus
                                    </span>{" "}
                                    with{" "}
                                    <span className="font-bold text-primary">
                                        Zen
                                    </span>{" "}
                                    in our primary blue. Keep clear space
                                    around the mark and never recolor the “Zen”
                                    away from Campus Blue.
                                </p>
                            </div>
                            <div className="mt-8 rounded-2xl border-2 border-border bg-background/40 p-5">
                                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                                    Tagline
                                </p>
                                <p className="mt-2 text-lg font-bold tracking-tight">
                                    “The social network for Indian college
                                    students.”
                                </p>
                            </div>
                        </Tile>

                        {/* Palette */}
                        <Tile className="sm:col-span-2 lg:col-span-2">
                            <div className="flex items-center gap-2">
                                <Palette className="h-4 w-4 text-primary" />
                                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                                    Color
                                </h3>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {PALETTE.map((c) => (
                                    <div
                                        key={c.name}
                                        className="overflow-hidden rounded-xl border-2 border-border"
                                    >
                                        <div
                                            className="h-14 w-full"
                                            style={{ backgroundColor: c.hex }}
                                        />
                                        <div className="p-2.5">
                                            <p className="text-xs font-bold">
                                                {c.name}
                                            </p>
                                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                                {c.hex}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Tile>

                        {/* Typography */}
                        <Tile className="sm:col-span-2 lg:col-span-2">
                            <div className="flex items-center gap-2">
                                <Type className="h-4 w-4 text-primary" />
                                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                                    Typography
                                </h3>
                            </div>
                            <div className="mt-4 space-y-4">
                                {TYPE.map((t) => (
                                    <div
                                        key={t.label}
                                        className="rounded-xl border-2 border-border bg-background/40 p-4"
                                    >
                                        <div className="flex items-baseline justify-between gap-3">
                                            <span
                                                className="text-2xl font-extrabold tracking-tight"
                                                style={{ fontFamily: t.family }}
                                            >
                                                {t.sample}
                                            </span>
                                            <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                {t.label}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {t.note}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </Tile>

                        {/* Mission */}
                        <Tile className="sm:col-span-2 lg:col-span-2">
                            <h3 className="text-lg font-bold tracking-tight">
                                Our mission
                            </h3>
                            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                                College is more than classes. CampusZen gives
                                every student a home base for campus life —
                                communities, posts, events, study resources, and
                                peer recognition, all in one student-only place.
                                Free for students, AI-ready by design.
                            </p>
                        </Tile>

                        {/* Voice & tone */}
                        <Tile className="sm:col-span-2 lg:col-span-2">
                            <div className="flex items-center gap-2">
                                <Quote className="h-4 w-4 text-primary" />
                                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                                    Voice & tone
                                </h3>
                            </div>
                            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                                <li>• Friendly, student-to-student, never corporate.</li>
                                <li>• Clear and concise — say it like a classmate would.</li>
                                <li>• Celebrate campus moments; stay supportive and safe.</li>
                                <li>• Precise when talking about tech, auth, and agents.</li>
                            </ul>
                        </Tile>

                        {/* Values */}
                        <Tile className="sm:col-span-2 lg:col-span-2">
                            <h3 className="text-lg font-bold tracking-tight">
                                What we stand for
                            </h3>
                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {VALUES.map((v) => (
                                    <div
                                        key={v.title}
                                        className="flex items-start gap-3 rounded-xl border-2 border-border bg-background/40 p-3"
                                    >
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-border bg-accent text-primary">
                                            <v.icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">
                                                {v.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {v.body}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Tile>

                        {/* At a glance */}
                        <Tile className="lg:col-span-2">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                                At a glance
                            </h3>
                            <dl className="mt-4 grid grid-cols-2 gap-4">
                                <div>
                                    <dt className="text-2xl font-extrabold tracking-tight">
                                        2024
                                    </dt>
                                    <dd className="text-xs text-muted-foreground">
                                        Launched
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-2xl font-extrabold tracking-tight">
                                        100%
                                    </dt>
                                    <dd className="text-xs text-muted-foreground">
                                        Student-focused
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-2xl font-extrabold tracking-tight">
                                        India
                                    </dt>
                                    <dd className="text-xs text-muted-foreground">
                                        Built for
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-2xl font-extrabold tracking-tight">
                                        AI-ready
                                    </dt>
                                    <dd className="text-xs text-muted-foreground">
                                        By design
                                    </dd>
                                </div>
                            </dl>
                        </Tile>

                        {/* Open source / agent-ready */}
                        <Tile className="lg:col-span-2">
                            <div className="flex items-center gap-2">
                                <Bot className="h-4 w-4 text-primary" />
                                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                                    Open & machine-readable
                                </h3>
                            </div>
                            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                                CampusZen ships an OpenAPI spec, two MCP servers,
                                an A2A agent card, an agent-skills index, and an
                                NLWeb /ask endpoint — so agents and developers
                                can integrate natively.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <a
                                    href="/openapi.json"
                                    className="btn-chunky rounded-xl border-border bg-card px-3 py-1.5 text-xs font-bold"
                                >
                                    OpenAPI
                                </a>
                                <a
                                    href="/llms.txt"
                                    className="btn-chunky rounded-xl border-border bg-card px-3 py-1.5 text-xs font-bold"
                                >
                                    llms.txt
                                </a>
                                <a
                                    href="https://github.com/user-synax/campusX"
                                    className="btn-chunky rounded-xl border-border bg-card px-3 py-1.5 text-xs font-bold"
                                >
                                    Source
                                </a>
                            </div>
                        </Tile>

                        {/* Socials */}
                        <Tile className="sm:col-span-2 lg:col-span-4">
                            <div className="flex flex-col items-center gap-4 text-center">
                                <h3 className="text-lg font-bold tracking-tight">
                                    Find CampusZen
                                </h3>
                                <div className="flex flex-wrap justify-center gap-3">
                                    {SOCIALS.map((s) => (
                                        <a
                                            key={s.label}
                                            href={s.href}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn-chunky inline-flex items-center gap-2 rounded-xl border-border bg-card px-4 py-2.5 text-sm font-bold"
                                        >
                                            <s.icon className="h-4 w-4 text-primary" />
                                            {s.label}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </Tile>
                    </div>
                </section>

                {/* CTA */}
                <section className="mx-auto mt-16 max-w-container px-4">
                    <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-border bg-card p-10 text-center shadow-[var(--shadow-hard)]">
                        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                            Build with CampusZen
                        </h2>
                        <p className="max-w-xl text-sm text-muted-foreground">
                            Read the agent guide, the OpenAPI spec, or the
                            developer portal — and bring your college community
                            along.
                        </p>
                        <Link
                            href="/developers"
                            className="btn-chunky mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
                        >
                            Developer portal <Sparkles className="h-4 w-4" />
                        </Link>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}
