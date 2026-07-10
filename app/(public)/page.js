import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import dynamic from "next/dynamic";
import HeroClient from "@/components/landing/HeroClient";
import WelcomeVideoOverlay from "@/components/WelcomeVideoOverlay";
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
            codeAreas: 0,
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
            <WelcomeVideoOverlay />
            <main>
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
                <Footer />
            </main>
        </>
    );
}
