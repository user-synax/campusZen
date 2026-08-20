import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPusherServer } from "@/lib/pusher-server";
import connectDB from "@/lib/db";
import GroupChat from "@/models/GroupChat";
import { validateObjectId } from "@/utils/validators";

export async function POST(request) {
    try {
        // Verify user is logged in
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const contentType = request.headers.get("content-type") || "";
        let socketId, channelName;

        if (contentType.includes("application/json")) {
            const body = await request.json();
            socketId = body.socket_id;
            channelName = body.channel_name;
        } else {
            const body = await request.text();
            const params = new URLSearchParams(body);
            socketId = params.get("socket_id");
            channelName = params.get("channel_name");
        }

        if (!socketId || !channelName) {
            return NextResponse.json(
                { error: "Missing socket_id or channel_name" },
                { status: 400 },
            );
        }

        // Extract groupId from channel name: private-group-[groupId]
        if (channelName.startsWith("private-group-")) {
            const groupId = channelName.replace("private-group-", "");

            if (!validateObjectId(groupId)) {
                return NextResponse.json(
                    { error: "Invalid group ID" },
                    { status: 400 },
                );
            }

            await connectDB();

            // Verify user is a member of this group
            const group = await GroupChat.findOne({
                _id: groupId,
                "members.userId": currentUser._id,
                isActive: true,
            }).lean();

            if (!group) {
                return NextResponse.json(
                    { error: "Not a member of this group or group inactive" },
                    { status: 403 },
                );
            }
        }

        // Extract userId from channel name: private-notifications-[userId]
        if (channelName.startsWith("private-notifications-")) {
            const channelUserId = channelName.replace(
                "private-notifications-",
                "",
            );

            // Only allow subscribing to YOUR OWN notification channel
            if (channelUserId !== currentUser._id.toString()) {
                return NextResponse.json(
                    {
                        error: "Cannot subscribe to another user's notifications",
                    },
                    { status: 403 },
                );
            }
            // Auth passes — user can subscribe to their own channel
        }

        // Extract userId from channel name: private-dm-[userId]
        if (channelName.startsWith("private-dm-")) {
            const channelUserId = channelName.replace("private-dm-", "");

            // Only allow subscribing to YOUR OWN DM channel
            if (channelUserId !== currentUser._id.toString()) {
                return NextResponse.json(
                    { error: "Cannot subscribe to another user's DM channel" },
                    { status: 403 },
                );
            }
            // Auth passes — user can subscribe to their own DM channel
        }

        // Extract userId from channel name: private-user-[userId]
        if (channelName.startsWith("private-user-")) {
            const channelUserId = channelName.replace("private-user-", "");

            // Only allow subscribing to YOUR OWN user channel
            if (channelUserId !== currentUser._id.toString()) {
                return NextResponse.json(
                    { error: "Cannot subscribe to another user's channel" },
                    { status: 403 },
                );
            }
            // Auth passes — user can subscribe to their own user channel
        }

        // ━━━ Presencе channel member gates ━━━
        // presence-group-${groupId} (general online status) — requires membership
        if (
            channelName.startsWith("presence-group-") &&
            !channelName.startsWith("presence-group-call-")
        ) {
            const presenceGroupId = channelName.replace("presence-group-", "");

            if (validateObjectId(presenceGroupId)) {
                await connectDB();

                const group = await GroupChat.findOne({
                    _id: presenceGroupId,
                    "members.userId": currentUser._id,
                    isActive: true,
                }).lean();

                if (!group) {
                    return NextResponse.json(
                        { error: "Not a member of this group or group inactive" },
                        { status: 403 },
                    );
                }
            }
        }

        // presence-group-call-${groupId} (voice chat participants) — requires membership
        if (channelName.startsWith("presence-group-call-")) {
            const callGroupId = channelName.replace("presence-group-call-", "");

            if (validateObjectId(callGroupId)) {
                await connectDB();

                const group = await GroupChat.findOne({
                    _id: callGroupId,
                    "members.userId": currentUser._id,
                    isActive: true,
                }).lean();

                if (!group) {
                    return NextResponse.json(
                        { error: "Not a member of this group or group inactive" },
                        { status: 403 },
                    );
                }
            }
        }

        // Generate Pusher auth response
        const pusher = getPusherServer();

        // Check if this is a presence channel
        if (channelName.startsWith("presence-")) {
            // For presence channels, include user info
            const authResponse = pusher.authorizePresenceChannel(
                socketId,
                channelName,
                currentUser._id.toString(),
                {
                    user_id: currentUser._id.toString(),
                    user_info: {
                        id: currentUser._id.toString(),
                        name: currentUser.name,
                        avatar: currentUser.avatar || null,
                        username: currentUser.username,
                    },
                },
            );
            return NextResponse.json(authResponse);
        } else {
            // For private channels
            const authResponse = pusher.authorizeChannel(socketId, channelName);
            return NextResponse.json(authResponse);
        }
    } catch (err) {
        console.error("[PusherAuth Error]", err.stack || err.message);
        return NextResponse.json(
            { error: "Authentication failed" },
            { status: 500 },
        );
    }
}
