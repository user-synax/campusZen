import { NextResponse } from "next/server";

const ORIGIN = "https://campuszen.tech";
const PROTOCOL = "2025-06-18";

const TOOLS = [
    {
        name: "list_communities",
        description:
            "List campus communities or fetch a single community by name. Public; no auth required.",
        inputSchema: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "Optional community name to fetch one by name.",
                },
                limit: { type: "integer", default: 50 },
            },
        },
    },
    {
        name: "get_public_stats",
        description: "Get platform statistics: users, posts, resources, communities.",
        inputSchema: { type: "object", properties: {} },
    },
    {
        name: "list_events",
        description: "List upcoming or past campus events, optionally by college.",
        inputSchema: {
            type: "object",
            properties: {
                college: { type: "string" },
                filter: { type: "string", enum: ["upcoming", "past"], default: "upcoming" },
                limit: { type: "integer", default: 10 },
            },
        },
    },
    {
        name: "get_leaderboard",
        description: "Read the public reputation leaderboard.",
        inputSchema: {
            type: "object",
            properties: {
                type: { type: "string", enum: ["global", "weekly", "college"], default: "global" },
                limit: { type: "integer", default: 20 },
            },
        },
    },
    {
        name: "create_post",
        description:
            "Create a feed post within the authenticated user's campus feed. Requires an authenticated session forwarded via the Authorization or Cookie header.",
        inputSchema: {
            type: "object",
            required: ["content"],
            properties: {
                content: { type: "string", description: "Post body (Markdown supported)." },
                community: { type: "string", description: "Optional community name." },
            },
        },
    },
    {
        name: "get_post",
        description:
            "Fetch a single post by id. Requires an authenticated session forwarded via the Authorization or Cookie header.",
        inputSchema: {
            type: "object",
            required: ["postId"],
            properties: { postId: { type: "string" } },
        },
    },
];

function rpc(id, result) {
    return { jsonrpc: "2.0", id, result };
}
function rpcError(id, code, message) {
    return { jsonrpc: "2.0", id, error: { code, message } };
}

async function callUpstream(path, { method = "GET", body, request } = {}) {
    const headers = { Accept: "application/json" };
    const auth = request.headers.get("authorization");
    const cookie = request.headers.get("cookie");
    if (auth) headers["Authorization"] = auth;
    if (cookie) headers["Cookie"] = cookie;
    if (body) headers["Content-Type"] = "application/json";

    const res = await fetch(`${ORIGIN}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        data = { raw: text };
    }
    return { status: res.status, data };
}

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            rpcError(null, -32700, "Parse error"),
            { status: 400, headers: { "Content-Type": "application/json" } },
        );
    }

    const id = body.id ?? null;
    const method = body.method;
    const sessionId =
        request.headers.get("mcp-session-id") ||
        `cz-${Math.random().toString(36).slice(2)}`;

    const baseHeaders = {
        "Content-Type": "application/json",
        "Mcp-Session-Id": sessionId,
        "Cache-Control": "no-store",
    };

    switch (method) {
        case "initialize":
            return NextResponse.json(
                rpc(id, {
                    protocolVersion: PROTOCOL,
                    capabilities: { tools: { listChanged: false } },
                    serverInfo: { name: "CampusZen MCP Server", version: "1.0.0" },
                }),
                { status: 200, headers: baseHeaders },
            );

        case "ping":
            return NextResponse.json(rpc(id, {}), {
                status: 200,
                headers: baseHeaders,
            });

        case "tools/list":
            return NextResponse.json(rpc(id, { tools: TOOLS }), {
                status: 200,
                headers: baseHeaders,
            });

        case "tools/call": {
            const { name, arguments: args = {} } = body.params || {};
            try {
                let result;
                switch (name) {
                    case "list_communities": {
                        const q = new URLSearchParams();
                        if (args.name) q.set("name", args.name);
                        if (args.limit) q.set("limit", String(args.limit));
                        const r = await callUpstream(`/api/communities?${q}`, { request });
                        result = r.data;
                        break;
                    }
                    case "get_public_stats": {
                        const r = await callUpstream(`/api/public/stats`, { request });
                        result = r.data;
                        break;
                    }
                    case "list_events": {
                        const q = new URLSearchParams();
                        if (args.college) q.set("college", args.college);
                        if (args.filter) q.set("filter", args.filter);
                        if (args.limit) q.set("limit", String(args.limit));
                        const r = await callUpstream(`/api/events?${q}`, { request });
                        result = r.data;
                        break;
                    }
                    case "get_leaderboard": {
                        const q = new URLSearchParams();
                        if (args.type) q.set("type", args.type);
                        if (args.limit) q.set("limit", String(args.limit));
                        const r = await callUpstream(`/api/leaderboard?${q}`, { request });
                        result = r.data;
                        break;
                    }
                    case "create_post": {
                        const r = await callUpstream(`/api/posts/create`, {
                            method: "POST",
                            body: { content: args.content, community: args.community },
                            request,
                        });
                        if (r.status === 401)
                            return NextResponse.json(
                                rpc(id, {
                                    content: [
                                        {
                                            type: "text",
                                            text: "Authentication required. Forward your CampusZen session cookie or bearer token, or see https://campuszen.tech/auth.md",
                                        },
                                    ],
                                    isError: true,
                                }),
                                { status: 200, headers: baseHeaders },
                            );
                        result = r.data;
                        break;
                    }
                    case "get_post": {
                        const r = await callUpstream(`/api/posts/${args.postId}`, {
                            request,
                        });
                        if (r.status === 401)
                            return NextResponse.json(
                                rpc(id, {
                                    content: [
                                        {
                                            type: "text",
                                            text: "Authentication required. Forward your CampusZen session cookie or bearer token.",
                                        },
                                    ],
                                    isError: true,
                                }),
                                { status: 200, headers: baseHeaders },
                            );
                        result = r.data;
                        break;
                    }
                    default:
                        return NextResponse.json(
                            rpcError(id, -32601, `Unknown tool: ${name}`),
                            { status: 200, headers: baseHeaders },
                        );
                }
                return NextResponse.json(
                    rpc(id, {
                        content: [
                            { type: "text", text: JSON.stringify(result, null, 2) },
                        ],
                    }),
                    { status: 200, headers: baseHeaders },
                );
            } catch (e) {
                return NextResponse.json(
                    rpc(id, {
                        content: [
                            {
                                type: "text",
                                text: `Tool execution error: ${e.message}`,
                            },
                        ],
                        isError: true,
                    }),
                    { status: 200, headers: baseHeaders },
                );
            }
        }

        default:
            return NextResponse.json(
                rpcError(id, -32601, `Method not found: ${method}`),
                { status: 200, headers: baseHeaders },
            );
    }
}

// Streamable HTTP also expects a GET (SSE) and DELETE (session terminate).
export async function GET() {
    return new NextResponse("MCP Streamable HTTP endpoint. Use POST for JSON-RPC.", {
        status: 405,
        headers: { Allow: "POST", "Content-Type": "text/plain" },
    });
}

export async function DELETE() {
    return new NextResponse(null, {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
}

export const dynamic = "force-dynamic";
