import { NextResponse } from "next/server";

const ORIGIN = "https://campuszen.tech";
const NLWEB_VERSION = "1.1";

async function gatherContext() {
    const out = {};
    try {
        const [stats, events, communities] = await Promise.all([
            fetch(`${ORIGIN}/api/public/stats`).then((r) => r.json()).catch(() => null),
            fetch(`${ORIGIN}/api/events?limit=5`).then((r) => r.json()).catch(() => null),
            fetch(`${ORIGIN}/api/communities?limit=8`).then((r) => r.json()).catch(() => null),
        ]);
        out.stats = stats;
        out.events = events?.events || events;
        out.communities = Array.isArray(communities) ? communities : communities?.community ? [communities.community] : null;
    } catch {
        // ignore — endpoints may be unavailable
    }
    return out;
}

function buildAnswer(query, ctx) {
    const q = (query || "").toLowerCase();
    if (/event/.test(q) && ctx.events) {
        const list = (ctx.events.events || ctx.events).slice(0, 5);
        const lines = list
            .map((e) => `- ${e.title} (${e.eventDate ? new Date(e.eventDate).toLocaleDateString() : "TBD"})`)
            .join("\n");
        return `Upcoming campus events on CampusZen:\n${lines || "(none found)"}\n\nSee https://campuszen.tech/api/events`;
    }
    if (/communities?|community|college/.test(q) && ctx.communities) {
        const lines = ctx.communities
            .slice(0, 8)
            .map((c) => `- ${c.name} (${c.memberCount ?? c.postCount ?? "?"} members/posts)`)
            .join("\n");
        return `CampusZen communities include:\n${lines || "(none found)"}\n\nQuery one at https://campuszen.tech/api/communities?name=<name>`;
    }
    const stats = ctx.stats;
    const statLine = stats
        ? `CampusZen has ${stats.users} users, ${stats.posts} posts, ${stats.resources} resources, and ${stats.communities} communities.`
        : "CampusZen is the social network for Indian college students.";
    return `${statLine}\n\nCampusZen offers campus communities, study resources, leaderboards, and events. Public data via https://campuszen.tech/openapi.json; agent auth at https://campuszen.tech/auth.md.`;
}

function nlwebResponse(query, ctx) {
    const text = buildAnswer(query, ctx);
    return {
        _meta: { response_type: "text", version: NLWEB_VERSION },
        ask: { query },
        results: [{ type: "text", text, url: ORIGIN }],
    };
}

export async function POST(request) {
    let query = "";
    let streaming = false;
    try {
        const ct = request.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
            const body = await request.json();
            query = body.query || body.ask?.query || body.q || "";
        } else {
            const form = await request.formData();
            query = form.get("query") || form.get("q") || "";
        }
        streaming =
            (request.headers.get("prefer") || "").includes("streaming") ||
            request.nextUrl.searchParams.get("streaming") === "true";
    } catch {
        query = "";
    }
    return respond(query, streaming);
}

export async function GET(request) {
    const query = request.nextUrl.searchParams.get("q") || request.nextUrl.searchParams.get("query") || "";
    const streaming = request.nextUrl.searchParams.get("streaming") === "true" ||
        (request.headers.get("prefer") || "").includes("streaming");
    return respond(query, streaming);
}

async function respond(query, streaming) {
    const ctx = await gatherContext();
    const payload = nlwebResponse(query, ctx);

    if (streaming) {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const send = (event, data) =>
                    controller.enqueue(
                        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
                    );
                send("start", { query });
                send("result", payload.results[0]);
                send("complete", { query, done: true });
                controller.close();
            },
        });
        return new Response(stream, {
            status: 200,
            headers: {
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-store",
                "X-API-Version": "1",
            },
        });
    }

    return NextResponse.json(payload, {
        status: 200,
        headers: { "Cache-Control": "no-store", "X-API-Version": "1" },
    });
}

export const dynamic = "force-dynamic";
