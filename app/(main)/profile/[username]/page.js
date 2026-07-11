import ProfileClient from "./ProfileClient";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }) {
    const { username } = await params;

    try {
        await connectDB();
        const user = await User.findOne({ username: username.toLowerCase() })
            .select("name username bio profilePicture college")
            .lean();

        if (!user) {
            return { title: "User Not Found | CampusX" };
        }

        const title = `${user.name} (@${user.username})`;
        const description =
            user.bio ||
            `Student at ${user.college || "CampusX"}. Connect with ${user.name} on the student-only social network.`;
        const ogImage = user.profilePicture || "/og-image.png";

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                type: "profile",
                username: user.username,
                images: [{ url: ogImage }],
            },
            twitter: {
                card: "summary",
                title,
                description,
                images: [ogImage],
            },
        };
    } catch (error) {
        return { title: "Profile | CampusX" };
    }
}

export default async function ProfilePage({ params }) {
    const { username } = await params;

    return <ProfileClient username={username} />;
}
