import { NextResponse } from "next/server";
import { getRedis, isRedisAvailable } from "@/lib/redis";
import { flushVPNotifications } from "@/lib/coins";

// POST /api/internal/flush-vp-notifications
// Maintenance endpoint: flushes any pending VP-earn notification buffers
// whose debounce window ended without further activity. Intended to be
// called by a scheduled cron (e.g. every minute) so users always receive
// their "You earned X VP" summary.
//
// Auth: requires x-cron-secret header matching CRON_SECRET env (or admin).
export async function POST(request) {
    try {
        const secret = request.headers.get("x-cron-secret");
        if (
            process.env.CRON_SECRET &&
            secret !== process.env.CRON_SECRET
        ) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!isRedisAvailable()) {
            return NextResponse.json({ flushed: 0 });
        }

        const redis = getRedis();
        const pattern = "vp_notify:*";
        let cursor = "0";
        let flushed = 0;

        do {
            const [nextCursor, keys] = await redis.scan(
                cursor,
                { match: pattern, count: 100 },
            );
            cursor = nextCursor;
            for (const key of keys) {
                const userId = key.replace("vp_notify:", "");
                await flushVPNotifications(userId);
                flushed++;
            }
        } while (cursor !== "0");

        return NextResponse.json({ flushed });
    } catch (error) {
        console.error("[VP] flush cron error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
