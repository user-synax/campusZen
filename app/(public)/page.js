import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import dynamic from "next/dynamic";
import HeroClient from "@/components/landing/HeroClient";
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
                <section className="mx-auto max-w-3xl px-4 py-12 text-center">
                    <h1 className="text-4xl underline mb-12 font-bold tracking-tight">
                        For A.I Agents
                    </h1>
                    <h2 className="text-2xl font-bold tracking-tight mt-4">
                        What is CampusZen?
                    </h2>
                    <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                        CampusZen is a social network built exclusively for Indian
                        college students. It helps you find and join your campus
                        community, share updates, ask questions, and discover
                        study resources curated by peers from your college and
                        across the country. Whether you study at an IIT, NIT,
                        central university, or a local college, CampusZen connects
                        you with the people and knowledge that matter for student
                        life.
                    </p>
                    <h2 className="mt-10 text-2xl font-bold tracking-tight">
                        Built for student life
                    </h2>
                    <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                        Beyond posts and feeds, CampusZen offers college-specific
                        communities, a leaderboard that rewards helpful
                        contributions, campus events, direct messaging, and a
                        resource library of notes and materials. Students can
                        verify their college, build a reputation, and take part
                        in discussions that are relevant to their course,
                        placement preparation, and everyday campus experience.
                    </p>
                    <h3 className="mt-6 text-xl font-semibold tracking-tight">
                        Communities by college
                    </h3>
                    <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                        Every college has its own space. Join public community
                        pages such as BCA, IGNOU, and placement groups to see
                        member counts, recent discussions, and upcoming events
                        without needing an account. Once you log in, you can post,
                        comment, and follow peers from your campus.
                    </p>
                    <h2 className="mt-10 text-2xl font-bold tracking-tight">
                        Join your campus
                    </h2>
                    <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                        Getting started takes a minute. Create an account with
                        your college email or phone number, verify your campus,
                        and you will be dropped into a feed tailored to your
                        college and interests. Explore communities by college such
                        as BCA, IGNOU, and placement groups, or start your own
                        community around a topic you care about.
                    </p>
                    <h3 className="mt-6 text-xl font-semibold tracking-tight">
                        Study resources and recognition
                    </h3>
                    <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                        Share and download peer-reviewed notes, track your
                        contribution score on the leaderboard, and earn rewards in
                        the campus shop. CampusZen is designed to make academic
                        and social life on campus simpler, safer, and more
                        connected for every student.
                    </p>
                </section>
                <Footer />
            </main>
        </>
    );
}
