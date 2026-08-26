import Link from "next/link";
import Footer from "@/components/landing/Footer";
import {
    Check,
    Sparkles,
    ArrowRight,
    GraduationCap,
    Building2,
} from "lucide-react";

export const metadata = {
    title: "Pricing — CampusZen",
    description:
        "Free for students. CampusZen Pro unlocks polls, more media, and profile customization. College and enterprise plans available.",
};

const FREE_INCLUDES = [
    "Join campus & interest communities",
    "Post, react, and bookmark",
    "Browse events and RSVP",
    "Access study resources",
    "Clips, chats, and connect",
    "Public API & agent access",
];

const PRO_INCLUDES = [
    "Everything in Free",
    "Create polls in posts",
    "Upload more media per post",
    "Profile & theme customization",
    "Premium avatar frames",
    "Priority in Connect suggestions",
];

const ORG_INCLUDES = [
    "Everything in Pro",
    "Shared college workspace",
    "Branded community pages",
    "Admin controls & analytics",
    "SSO / roster sync (on request)",
    "Dedicated support",
];

function PlanCard({ name, price, cadence, description, features, cta, ctaHref, highlighted }) {
    return (
        <div
            className={`card-chunky flex flex-col p-7 ${
                highlighted
                    ? "bg-card ring-2 ring-primary shadow-[var(--shadow-hard-hover)]"
                    : "bg-card"
            }`}
        >
            {highlighted && (
                <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                    <Sparkles className="h-3.5 w-3.5" /> Most popular
                </span>
            )}
            <h3 className="text-xl font-extrabold tracking-tight">{name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            <div className="mt-5 flex items-end gap-1">
                <span className="text-4xl font-extrabold tracking-tight">
                    {price}
                </span>
                {cadence && (
                    <span className="mb-1 text-sm text-muted-foreground">
                        {cadence}
                    </span>
                )}
            </div>
            <ul className="mt-6 flex-1 space-y-3">
                {features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-muted-foreground">{f}</span>
                    </li>
                ))}
            </ul>
            <Link
                href={ctaHref}
                className={`btn-chunky mt-8 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold ${
                    highlighted
                        ? "bg-primary text-primary-foreground"
                        : "border-border bg-card"
                }`}
            >
                {cta} <ArrowRight className="h-4 w-4" />
            </Link>
        </div>
    );
}

const FAQS = [
    {
        q: "Is CampusZen really free for students?",
        a: "Yes. Students can join communities, post, react, bookmark, and access study resources for free. A Pro tier adds polls, more media, and customization.",
    },
    {
        q: "What does Pro unlock?",
        a: "Pro unlocks post polls, higher media limits, profile and theme customization, premium avatar frames, and priority placement in Connect suggestions.",
    },
    {
        q: "How do I pay?",
        a: "You can upgrade from the in-app billing screen, where promotional codes can be redeemed. College and enterprise plans are quoted per institution.",
    },
    {
        q: "Do agents pay to use the API?",
        a: "No. The public API, OpenAPI spec, MCP servers, and llms.txt are available to agents without a paywall. Authenticated actions use the same student session.",
    },
];

export default function PricingPage() {
    return (
        <>
            <main className="pt-28 pb-24">
                <section className="relative overflow-hidden">
                    <div className="pointer-events-none absolute inset-0 -z-10">
                        <div className="absolute left-1/2 top-[-12rem] h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
                    </div>
                    <div className="mx-auto max-w-container px-4 text-center">
                        <span className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-1.5 text-sm font-semibold text-primary shadow-[var(--shadow-hard-sm)]">
                            <GraduationCap className="h-4 w-4" />
                            Pricing
                        </span>
                        <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
                            Free for students. Pro when you want more.
                        </h1>
                        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                            Start free, upgrade for polls and customization, or
                            bring CampusZen to your whole college.
                        </p>
                    </div>
                </section>

                <section className="mx-auto mt-16 max-w-container px-4">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <PlanCard
                            name="Free"
                            price="₹0"
                            cadence="/forever"
                            description="For every verified student."
                            features={FREE_INCLUDES}
                            cta="Create free account"
                            ctaHref="/signup"
                        />
                        <PlanCard
                            name="Pro"
                            price="₹49"
                            cadence="/month"
                            description="For students who want more from their profile."
                            features={PRO_INCLUDES}
                            cta="Go Pro"
                            ctaHref="/billing"
                            highlighted
                        />
                        <PlanCard
                            name="College / Enterprise"
                            price="Custom"
                            cadence=""
                            description="For institutions and large communities."
                            features={ORG_INCLUDES}
                            cta="Contact us"
                            ctaHref="/about"
                        />
                    </div>
                    <p className="mt-6 text-center text-xs text-muted-foreground">
                        Prices in INR. Promotional codes can be redeemed in-app
                        at /billing. College plans are quoted per institution.
                    </p>
                </section>

                <section className="mx-auto mt-24 max-w-3xl px-4">
                    <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
                        Frequently asked questions
                    </h2>
                    <div className="mt-10 space-y-4">
                        {FAQS.map((item) => (
                            <div
                                key={item.q}
                                className="card-chunky bg-card p-6"
                            >
                                <h3 className="text-base font-bold tracking-tight">
                                    {item.q}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                    {item.a}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mx-auto mt-24 max-w-container px-4">
                    <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-border bg-card p-10 text-center shadow-[var(--shadow-hard)]">
                        <Building2 className="h-8 w-8 text-primary" />
                        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                            Bring CampusZen to your college
                        </h2>
                        <p className="max-w-xl text-sm text-muted-foreground">
                            Workspaces, branded pages, and admin analytics for
                            institutions. Talk to us about a campus plan.
                        </p>
                        <Link
                            href="/about"
                            className="btn-chunky mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
                        >
                            Get in touch <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}
