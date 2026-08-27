import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DMConversation from "@/models/DMConversation";
import DMMessage from "@/models/DMMessage";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { validateObjectId } from "@/utils/validators";
import { sanitizeMongoInput } from "@/lib/sanitize";

/**
 * GET /api/admin/dms - Get all DM conversations (admin only)
 */
export async function GET(request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser || !isAdmin(currentUser)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";
        const page = parseInt(searchParams.get("page")) || 1;
        const limit = parseInt(searchParams.get("limit")) || 20;
        const skip = (page - 1) * limit;

        await connectDB();

        let query = { isActive: true };

        // If search is provided, find users matching search first
        let userIds = [];
        if (search) {
            const safeSearch = sanitizeMongoInput(search)
            const users = await User.find({
                $or: [
                    { name: { $regex: safeSearch, $options: "i" } },
                    { username: { $regex: safeSearch, $options: "i" } },
                    { email: { $regex: safeSearch, $options: "i" } },
                ],
            }).select("_id");
            userIds = users.map((u) => u._id);

            if (userIds.length > 0) {
                query["participants.userId"] = { $in: userIds };
            } else {
                // No matching users found, return empty
                return NextResponse.json({
                    conversations: [],
                    total: 0,
                    page,
                    totalPages: 0,
                });
            }
        }

        // Fetch conversations
        const [conversations, total] = await Promise.all([
            DMConversation.find(query)
                .sort({ "lastMessage.sentAt": -1 })
                .skip(skip)
                .limit(limit)
                .populate(
                    "participants.userId",
                    "name username avatar isVerified",
                )
                .lean(),
            DMConversation.countDocuments(query),
        ]);

        return NextResponse.json({
            conversations,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error("[Admin DMs GET]", error.message);
        return NextResponse.json(
            { error: "Failed to fetch DMs" },
            { status: 500 },
        );
    }
}
