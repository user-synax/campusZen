import Link from "next/link";
import Footer from "@/components/landing/Footer";
import {
    Sparkles,
    Heart,
    Globe2,
    Bot,
    ArrowRight,
    Github,
    ShieldCheck,
} from "lucide-react";

export const metadata = {
    title: "About — CampusZen",
    description:
        "CampusZen is the student-only social network for Indian college students. Launched in 2024, free for students, and built to be read by machines too.",
};

const STATS = [
    { value: "2026", label: "Launched" },
    { value: "100%", label: "Student-focused" },
    { value: "India", label: "Built for" },
    { value: "AI-ready", label: "By design" },
];

const VALUES = [
    {
        icon: Heart,
        title: "For students, by students",
        body: "CampusZen is an exclusive network for verified Indian college students. No noise, no strangers — just your campus.",
    },
    {
        icon: Globe2,
        title: "Open by default",
        body: "Community pages, stats, and events are public. Agents and people alike can discover campus life without a login wall.",
    },
    {
        icon: Bot,
        title: "Built for agents",
        body: "OpenAPI, MCP servers, llms.txt, an A2A agent card, and NLWeb /ask make CampusZen programmable from day one.",
    },
    {
        icon: ShieldCheck,
        title: "Safe & student-first",
        body: "Verification, moderation checks, and student-only access keep the network trustworthy and focused.",
    },
];

export default function AboutPage() {
    return (
        <>
            <main className="pt-28 pb-24">
                <section className="relative overflow-hidden">
                    <div className="pointer-events-none absolute inset-0 -z-10">
                        <div className="absolute left-1/2 top-[-10rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
                    </div>
                    <div className="mx-auto max-w-container px-4 text-center">
                        <span className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-1.5 text-sm font-semibold text-primary shadow-[var(--shadow-hard-sm)]">
                            <Sparkles className="h-4 w-4" />
                            About CampusZen
                        </span>
                        <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
                            The social network for Indian college students
                        </h1>
                        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                            CampusZen is where students connect with their campus
                            — communities, posts, events, study resources, and
                            peer recognition, all in one student-only place.
                        </p>
                    </div>
                </section>

                <section className="mx-auto mt-16 max-w-container px-4">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {STATS.map((s) => (
                            <div
                                key={s.label}
                                className="card-chunky bg-card p-6 text-center"
                            >
                                <div className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                                    {s.value}
                                </div>
                                <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    {s.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mx-auto mt-20 max-w-3xl px-4 text-center">
                    <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                        Our mission
                    </h2>
                    <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
                        College is more than classes. CampusZen gives every
                        student a home base for their campus life — to find
                        their community, share what matters, discover events,
                        and learn together. We keep it free for students and
                        obsessively focused on what makes campus special.
                    </p>
                </section>

                <section className="mx-auto mt-20 max-w-container px-4">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {VALUES.map((v) => (
                            <div
                                key={v.title}
                                className="card-chunky bg-card p-6"
                            >
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-border bg-accent text-primary shadow-[var(--shadow-hard-sm)]">
                                    <v.icon className="h-5 w-5" />
                                </div>
                                <h3 className="mt-4 text-lg font-bold tracking-tight">
                                    {v.title}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                    {v.body}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mx-auto mt-20 max-w-container px-4">
                    <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-border bg-card p-10 text-center shadow-[var(--shadow-hard)]">
                        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                            Open source &amp; reachable
                        </h2>
                        <p className="max-w-xl text-sm text-muted-foreground">
                            CampusZen's agent surfaces are public, and the
                            project is on GitHub. Questions, partnerships, or
                            campus plans — we would love to hear from you.
                        </p>
                        <div className="mt-2 flex flex-wrap justify-center gap-3">
                            <a
                                href="https://github.com/user-synax"
                                target="_blank"
                                rel="noreferrer"
                                className="btn-chunky inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
                            >
                                <Github className="h-4 w-4" /> GitHub
                            </a>
                            <a
                                href="https://wa.me/+918826343179?text=Hello%20campusZen!%20I%20want%20to%20learn%20more%20about%20CampusZen."
                                target="_blank"
                                rel="noreferrer"
                                className="btn-chunky inline-flex items-center gap-2 rounded-xl border-border bg-card px-5 py-2.5 text-sm font-bold"
                            >
                                Contact us
                            </a>
                            <Link
                                href="/features"
                                className="btn-chunky inline-flex items-center gap-2 rounded-xl border-border bg-card px-5 py-2.5 text-sm font-bold"
                            >
                                Explore features <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}
