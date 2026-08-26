import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import dynamic from "next/dynamic";
import HeroClient from "@/components/landing/HeroClient";
import { Bot, Globe2, FileJson, TriangleAlert, FileText, KeyRound, BookOpen } from "lucide-react";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Post from "@/models/Post";
import Resource from "@/models/Resource";
import { verifyToken } from "@/lib/auth-edge";

const Stats = dynamic(() => import("@/components/landing/Stats"));
const ProductShowcase = dynamic(
    () => import("@/components/landing/ProductShowcase"),
);
const Features = dynamic(() => import("@/components/landing/Features"));
const WhyStudentsChoose = dynamic(
    () => import("@/components/landing/WhyStudentsChoose"),
);
const TechStack = dynamic(() => import("@/components/landing/TechStack"));
const Footer = dynamic(() => import("@/components/landing/Footer"));

export const metadata = {
    title: "CampusZen — Social Network for Indian College Students",
    description:
        "Join your campus community, share posts, access resources, and stay connected with your college mates exclusively on CampusZen.",
    keywords: [
        "student social network",
        "college community",
        "IIT",
        "NIT",
        "campus",
        "indian students",
    ],
    openGraph: {
        type: "website",
        locale: "en_IN",
        url: "https://campuszen.vercel.app",
        siteName: "CampusZen",
        title: "CampusZen — Social Network for Indian College Students",
        description:
            "Join your campus community, share posts, access resources, and stay connected.",
        images: [
            {
                url: "/og-image.png",
                width: 1200,
                height: 630,
                alt: "CampusZen — Student Social Network",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "CampusZen — Social Network for Indian College Students",
        description: "Join your campus community exclusively on CampusZen.",
        images: ["/og-image.png"],
    },
};

async function getLandingStats() {
    try {
        await connectDB();
        const [users, posts, resources] = await Promise.all([
            User.estimatedDocumentCount(),
            Post.estimatedDocumentCount(),
            Resource.countDocuments({ status: "approved" }),
        ]);

        return {
            users: users || 0,
            posts: posts || 0,
            resources: resources || 0,
            codeAreas: 5,
        };
    } catch (error) {
        console.error("[Landing Stats Fetch Error]:", error);
        return {
            users: 50,
            posts: 120,
            resources: 20,
            codeAreas: 3,
        };
    }
}

function AgentCard({ icon: Icon, title, body }) {
    return (
        <div className="card-chunky bg-card p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-border bg-accent text-primary shadow-[var(--shadow-hard-sm)]">
                <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-bold tracking-tight">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
        </div>
    );
}

export default async function LandingPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get("campusx_token")?.value;

    if (token) {
        const decoded = await verifyToken(token);
        if (decoded) {
            redirect("/feed");
        }
    }

    const stats = await getLandingStats();

    return (
        <>
            <main className="pt-16">
                <HeroClient />
                <TechStack />
                <Stats
                    users={stats.users}
                    posts={stats.posts}
                    resources={stats.resources}
                    codeAreas={stats.codeAreas}
                />
                <ProductShowcase />
                <Features />
                <WhyStudentsChoose />
                <section className="mx-auto max-w-5xl px-4 py-20">
                    <div className="flex flex-col items-center text-center">
                        <span className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-1.5 text-sm font-semibold text-primary shadow-[var(--shadow-hard-sm)]">
                            <Bot className="h-4 w-4" />
                            For AI Agents
                        </span>
                        <h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
                            CampusZen is built to be read by machines too
                        </h2>
                        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                            CampusZen is the social network for Indian college
                            students — campus communities, study resources,
                            leaderboards, and events. The pages and API below are
                            served so agents can discover, summarize, and
                            integrate with student life on campus without hitting
                            a login wall.
                        </p>
                    </div>

                    <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        <AgentCard
                            icon={Globe2}
                            title="Public by default"
                            body="Community pages and stats at /community/<college> need no login. Member counts, posts, and events are visible to anyone."
                        />
                        <AgentCard
                            icon={FileJson}
                            title="OpenAPI spec"
                            body="A complete, machine-readable API description is published at /openapi.json with operationIds, schemas, and versioning notes."
                        />
                        <AgentCard
                            icon={TriangleAlert}
                            title="Structured errors"
                            body="Every error is JSON: { success: false, error: { code, message } }. No HTML error pages for agents to parse."
                        />
                        <AgentCard
                            icon={FileText}
                            title="Markdown & llms.txt"
                            body="Request any page with Accept: text/markdown, or read /llms.txt for when-to-use guidance and endpoint links."
                        />
                        <AgentCard
                            icon={KeyRound}
                            title="Programmatic auth"
                            body="Log in with POST /api/auth/login to obtain a session cookie, then call authenticated endpoints on behalf of a user."
                        />
                        <AgentCard
                            icon={BookOpen}
                            title="Developer portal"
                            body="A dedicated /developers page documents the API, auth model, and public endpoints with copy-ready examples."
                        />
                    </div>

                    <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border-2 border-border bg-card p-8 text-center shadow-[var(--shadow-hard)]">
                        <h3 className="text-xl font-bold tracking-tight">
                            Start building with CampusZen
                        </h3>
                        <p className="max-w-xl text-sm text-muted-foreground">
                            Read the agent guide, the OpenAPI spec, or the
                            developer portal to integrate programmatically.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            <a
                                href="/llms.txt"
                                className="btn-chunky rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
                            >
                                llms.txt
                            </a>
                            <a
                                href="/openapi.json"
                                className="btn-chunky rounded-xl border-border bg-card px-5 py-2.5 text-sm font-bold"
                            >
                                OpenAPI spec
                            </a>
                            <a
                                href="/developers"
                                className="btn-chunky rounded-xl border-border bg-card px-5 py-2.5 text-sm font-bold"
                            >
                                Developer portal
                            </a>
                        </div>
                    </div>
                </section>
                <Footer />
            </main>
        </>
    );
}
