import Link from "next/link";
import Footer from "@/components/landing/Footer";
import {
    GraduationCap,
    MessageSquare,
    Trophy,
    Calendar,
    BookOpen,
    Video,
    ShoppingBag,
    Wallet,
    Link2,
    Bookmark,
    Bot,
    FileJson,
    Sparkles,
    ArrowRight,
    Network,
} from "lucide-react";

export const metadata = {
    title: "Features — CampusZen",
    description:
        "Explore CampusZen's student social features: campus communities, feed, leaderboards, events, study resources, clips, shop, wallet, and a full AI-agent toolkit.",
};

const PRODUCT_FEATURES = [
    {
        icon: GraduationCap,
        title: "Campus Communities",
        body: "Join college-specific and interest groups — BCA, IGNOU, placement, hostel life and more. Discover communities by name or college slug, see live member and post counts, and find your people.",
        span: "md:col-span-2",
    },
    {
        icon: MessageSquare,
        title: "Feed & Posts",
        body: "Share rich posts with Markdown, images and GIFs. React with emotions, create polls (Pro), use hashtags, and scroll a fast cursor-based feed with built-in moderation checks.",
        span: "",
    },
    {
        icon: Trophy,
        title: "Leaderboard & Reputation",
        body: "Earn reputation for contributing. Climb global, weekly, and college leaderboards, unlock ranks, and show off your standing in the community.",
        span: "",
    },
    {
        icon: Calendar,
        title: "Campus Events",
        body: "Browse upcoming and past campus events, filter by college, and RSVP in a click. Never miss a fest, hackathon, or placement drive again.",
        span: "",
    },
    {
        icon: BookOpen,
        title: "Study Resources",
        body: "A peer-curated library of approved study materials. Browse resources your classmates have shared and level up together.",
        span: "md:col-span-2",
    },
    {
        icon: Video,
        title: "Clips",
        body: "Short campus video clips to share moments, notes, and highlights with your network.",
        span: "",
    },
    {
        icon: ShoppingBag,
        title: "Shop & Cosmetics",
        body: "Personalize your profile with avatar frames, themes, and rarity items from the CampusZen shop.",
        span: "",
    },
    {
        icon: Wallet,
        title: "Wallet",
        body: "A lightweight in-app currency for cosmetics and rewards, kept separate from your real campus identity.",
        span: "",
    },
    {
        icon: Link2,
        title: "Connect",
        body: "Smart peer suggestions help you find and network with students across colleges and interests.",
        span: "",
    },
    {
        icon: Bookmark,
        title: "Bookmarks & Chats",
        body: "Save posts for later and message friends in real time. Your campus life, organized.",
        span: "",
    },
];

const AGENT_FEATURES = [
    {
        icon: FileJson,
        title: "OpenAPI spec",
        body: "A complete, machine-readable REST API at /openapi.json with operationIds, typed schemas, and a versioning + deprecation policy.",
    },
    {
        icon: Bot,
        title: "MCP servers",
        body: "Two Model Context Protocol servers — one for product actions, one for docs — so Claude, ChatGPT, and other agents call CampusZen natively over Streamable HTTP.",
    },
    {
        icon: Network,
        title: "Agent card & skills",
        body: "An A2A agent card and a v0.2.0 agent-skills index advertise CampusZen's capabilities to other agents.",
    },
    {
        icon: Sparkles,
        title: "NLWeb & auth.md",
        body: "A conversational /ask endpoint plus an auth.md guide so agents can discover credentials and act on behalf of users.",
    },
];

function FeatureCard({ icon: Icon, title, body, span }) {
    return (
        <div className={`card-chunky bg-card p-6 ${span || ""}`}>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-border bg-accent text-primary shadow-[var(--shadow-hard-sm)]">
                <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-bold tracking-tight">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {body}
            </p>
        </div>
    );
}

export default function FeaturesPage() {
    return (
        <>
            <main className="pt-28 pb-24">
                {/* Hero */}
                <section className="relative overflow-hidden">
                    <div className="pointer-events-none absolute inset-0 -z-10">
                        <div className="absolute left-1/2 top-[-10rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
                        <div className="absolute right-[-6rem] top-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
                    </div>
                    <div className="mx-auto max-w-container px-4 text-center">
                        <span className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-1.5 text-sm font-semibold text-primary shadow-[var(--shadow-hard-sm)]">
                            <Sparkles className="h-4 w-4" />
                            Product Tour
                        </span>
                        <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
                            Everything your campus life needs
                        </h1>
                        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                            CampusZen packs communities, content, events, and
                            study tools into one student-only network — and it is
                            built to be read by machines too.
                        </p>
                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            <Link
                                href="/signup"
                                className="btn-chunky rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
                            >
                                Create your account
                            </Link>
                            <Link
                                href="/pricing"
                                className="btn-chunky rounded-xl border-border bg-card px-6 py-3 text-sm font-bold"
                            >
                                See pricing
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Product feature grid */}
                <section className="mx-auto mt-20 max-w-container px-4">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {PRODUCT_FEATURES.map((f) => (
                            <FeatureCard key={f.title} {...f} />
                        ))}
                    </div>
                </section>

                {/* Agent toolkit */}
                <section className="mx-auto mt-24 max-w-container px-4">
                    <div className="flex flex-col items-center text-center">
                        <span className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-1.5 text-sm font-semibold text-primary shadow-[var(--shadow-hard-sm)]">
                            <Bot className="h-4 w-4" />
                            For AI Agents
                        </span>
                        <h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
                            A platform agents can integrate with
                        </h2>
                        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                            CampusZen publishes the machine-readable surfaces
                            below so AI agents can discover, summarize, and act
                            on campus life without hitting a login wall.
                        </p>
                    </div>
                    <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {AGENT_FEATURES.map((f) => (
                            <FeatureCard key={f.title} {...f} />
                        ))}
                    </div>
                    <div className="mt-12 flex flex-wrap justify-center gap-3">
                        <a
                            href="/openapi.json"
                            className="btn-chunky rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
                        >
                            OpenAPI spec
                        </a>
                        <a
                            href="/llms.txt"
                            className="btn-chunky rounded-xl border-border bg-card px-5 py-2.5 text-sm font-bold"
                        >
                            llms.txt
                        </a>
                        <a
                            href="/developers"
                            className="btn-chunky rounded-xl border-border bg-card px-5 py-2.5 text-sm font-bold"
                        >
                            Developer portal
                        </a>
                    </div>
                </section>

                {/* CTA */}
                <section className="mx-auto mt-24 max-w-container px-4">
                    <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-border bg-card p-10 text-center shadow-[var(--shadow-hard)]">
                        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                            Ready to join your campus?
                        </h2>
                        <p className="max-w-xl text-sm text-muted-foreground">
                            Sign up free, pick your college, and start
                            connecting with students across India.
                        </p>
                        <Link
                            href="/signup"
                            className="btn-chunky mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
                        >
                            Get started <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}
