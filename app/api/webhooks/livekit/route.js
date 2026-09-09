import { NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import connectDB from "@/lib/db";
import GroupChat from "@/models/GroupChat";
import { emitToGroup, emitToUsers } from "@/lib/realtime";
import { getRoomService } from "@/lib/livekit";

function parseMeta(meta) {
    try {
        return JSON.parse(meta || "{}");
    } catch {
        return {};
    }
}

export async function POST(request) {
    try {
        const rawBody = await request.text();
        const authHeader =
            request.headers.get("x-livekit-signature") ||
            request.headers.get("authorization") ||
            "";

        let event;
        try {
            const receiver = new WebhookReceiver(
                process.env.LIVEKIT_API_KEY,
                process.env.LIVEKIT_API_SECRET,
            );
            event = receiver.receive(rawBody, authHeader);
        } catch (e) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const eventType = event?.event;
        const roomName = event?.room?.name;
        if (!roomName || !roomName.startsWith("group-")) {
            // Not one of our group call rooms — ignore
            return NextResponse.json({ ok: true });
        }
        const groupId = roomName.replace("group-", "");

        await connectDB();
        const group = await GroupChat.findById(groupId).lean();
        if (!group) return NextResponse.json({ ok: true });

        let participantCount = 0;
        let participants = [];
        let active = false;

        if (eventType !== "room_finished") {
            try {
                const rs = getRoomService();
                const rooms = await rs.listRooms();
                const live = rooms.find((r) => r.name === roomName);
                if (live) {
                    active = true;
                    participantCount = live.numParticipants || 0;
                    participants = (live.participants || []).map((pi) => {
                        const m = parseMeta(pi.metadata);
                        return {
                            userId: pi.identity,
                            name: m.name || pi.name || "User",
                            avatar: m.avatar || null,
                        };
                    });
                }
            } catch (e) {
                console.error("[LivekitWebhook] listRooms failed:", e.message);
            }
        }

        const payload = { groupId, participantCount, participants, active };

        // Emit vc:update to the group room + every member's personal room
        try {
            await emitToGroup(groupId, "vc:update", payload);
            const memberIds = group.members.map((m) => String(m.userId));
            if (memberIds.length > 0) {
                await emitToUsers(memberIds, "vc:update", payload);
            }
        } catch (e) {
            console.error("[LivekitWebhook] realtime emit failed:", e.message);
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("[LivekitWebhook]", err.message);
        return NextResponse.json({ error: "Webhook error" }, { status: 500 });
    }
}
