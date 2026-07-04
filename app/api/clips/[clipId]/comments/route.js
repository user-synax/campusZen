import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Clip from "@/models/Clip";
import ClipComment from "@/models/ClipComment";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeMongoInput, sanitizeUser } from "@/lib/sanitize";

export async function GET(request, { params }) {
    try {
        const currentUser = await getCurrentUser(request);
        await connectDB();
        const { clipId } = await params;
        const { searchParams } = new URL(request.url);
        const cursor = searchParams.get("cursor");
        const limit = Math.min(parseInt(searchParams.get("limit")) || 20, 50);

        let query = { clipId };
        if (cursor) {
            const decodedCursor = Buffer.from(cursor, "base64").toString(
                "utf-8",
            );
            query._id = { $lt: decodedCursor };
        }

        const comments = await ClipComment.find(query)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .populate({
                path: "userId",
                select: "name username avatar isVerified",
                options: { lean: true },
            })
            .lean();

        const hasMore = comments.length > limit;
        const resultComments = hasMore ? comments.slice(0, limit) : comments;

        const processedComments = resultComments.map((c) => ({
            ...c,
            user: sanitizeUser(c.userId),
        }));

        const nextCursor = hasMore
            ? Buffer.from(
                  resultComments[resultComments.length - 1]._id.toString(),
              ).toString("base64")
            : null;

        return NextResponse.json({
            success: true,
            comments: processedComments,
            pagination: { nextCursor, hasNextPage: hasMore, limit },
        });
    } catch (error) {
        console.error("Get clip comments error:", error);
        return NextResponse.json(
            { success: false, error: { message: "Internal Server Error" } },
            { status: 500 },
        );
    }
}

export async function POST(request, { params }) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json(
                { success: false, error: { message: "Unauthorized" } },
                { status: 401 },
            );
        }

        await connectDB();
        const { clipId } = await params;
        const body = await request.json();
        const { content } = body;

        if (!content?.trim()) {
            return NextResponse.json(
                { success: false, error: { message: "Content is required" } },
                { status: 400 },
            );
        }

        const comment = await ClipComment.create({
            clipId,
            userId: currentUser._id,
            content: sanitizeMongoInput(content),
        });

        await Clip.updateOne({ _id: clipId }, { $inc: { commentsCount: 1 } });
        await comment.populate("userId", "name username avatar isVerified");

        return NextResponse.json({
            success: true,
            comment: {
                ...comment.toObject(),
                user: sanitizeUser(comment.userId),
            },
        });
    } catch (error) {
        console.error("Create clip comment error:", error);
        return NextResponse.json(
            { success: false, error: { message: "Internal Server Error" } },
            { status: 500 },
        );
    }
}
