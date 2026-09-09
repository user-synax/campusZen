import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Post from "@/models/Post";
import { getCurrentUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

export async function POST(request, { params }) {
    try {
        const { postId } = await params;
        const currentUser = await getCurrentUser(request);
        if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        let body = {};
        try { body = await request.json(); } catch {}
        const { content: quoteContent } = body; // optional for quote

        await connectDB();
        const original = await Post.findOne({ _id: postId, isDeleted: { $ne: true } });
        if (!original) return NextResponse.json({ message: "Post not found" }, { status: 404 });

        const already = await Post.findOne({ author: currentUser._id, repostOf: postId, isRepost: true, isDeleted: { $ne: true } });

        if (already) {
            // un-repost
            await Post.updateOne({ _id: already._id }, { $set: { isDeleted: true } });
            await Post.updateOne({ _id: postId }, { $inc: { repostsCount: -1 }, $pull: { repostedBy: currentUser._id } });
            return NextResponse.json({ reposted: false, repostsCount: Math.max(0, (original.repostsCount || 0) - 1) });
        }

        // create repost/quote
        const repost = await Post.create({
            author: currentUser._id,
            content: quoteContent?.trim() ? quoteContent.trim().slice(0, 280) : `Reposted: ${original.content.slice(0, 100)}`,
            isRepost: true,
            repostOf: postId,
        });

        await Post.updateOne({ _id: postId }, { $inc: { repostsCount: 1 }, $addToSet: { repostedBy: currentUser._id } });

        // notify original author
        if (original.author.toString() !== currentUser._id.toString()) {
            createNotification({ recipient: original.author, sender: currentUser._id, type: "repost", postId }).catch(()=>{});
        }

        return NextResponse.json({ reposted: true, repostsCount: (original.repostsCount || 0) + 1, repostId: repost._id }, { status: 201 });
    } catch (e) {
        console.error("[Repost] Error:", e);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
