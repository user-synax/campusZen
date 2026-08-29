import { NextResponse } from "next/server";
import { openapiSpec } from "@/lib/openapi-spec";
import { LLMS_TXT } from "@/lib/llms-txt";
import { getAuthMarkdown } from "@/lib/markdown-content";

const ORIGIN = "https://campuszen.tech";
const PROTOCOL = "2025-06-18";

const TOOLS = [
    {
        name: "read_openapi",
        description: "Return the CampusZen OpenAPI 3.0 document.",
        inputSchema: { type: "object", properties: {} },
        _meta: { ui: { resourceUri: "ui://campuszen.tech/docs/openapi" } },
    },
    {
        name: "read_llms_txt",
        description: "Return the CampusZen llms.txt agent guidance.",
        inputSchema: { type: "object", properties: {} },
        _meta: { ui: { resourceUri: "ui://campuszen.tech/docs/llms-txt" } },
    },
    {
        name: "read_auth_md",
        description: "Return the CampusZen agent auth guide (auth.md).",
        inputSchema: { type: "object", properties: {} },
        _meta: { ui: { resourceUri: "ui://campuszen.tech/docs/auth" } },
    },
    {
        name: "read_api_catalog",
        description: "Return the RFC 9727 API catalog for CampusZen.",
        inputSchema: { type: "object", properties: {} },
        _meta: { ui: { resourceUri: "ui://campuszen.tech/docs/api-catalog" } },
    },
];

function rpc(id, result) {
    return { jsonrpc: "2.0", id, result };
}
function rpcError(id, code, message) {
    return { jsonrpc: "2.0", id, error: { code, message } };
}

async function fetchText(path) {
    try {
        const res = await fetch(`${ORIGIN}${path}`, { cache: "no-store" });
        return await res.text();
    } catch {
        return null;
    }
}

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(rpcError(null, -32700, "Parse error"), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const id = body.id ?? null;
    const method = body.method;
    const sessionId =
        request.headers.get("mcp-session-id") ||
        `czdocs-${Math.random().toString(36).slice(2)}`;

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
                    capabilities: { tools: { listChanged: false }, resources: { listChanged: false } },
                    serverInfo: { name: "CampusZen Documentation MCP Server", version: "1.0.0" },
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
            const { name } = body.params || {};
            let text;
            switch (name) {
                case "read_openapi":
                    text = JSON.stringify(openapiSpec, null, 2);
                    break;
                case "read_llms_txt":
                    text = LLMS_TXT;
                    break;
                case "read_auth_md":
                    text = getAuthMarkdown();
                    break;
                case "read_api_catalog": {
                    const catalog = await fetchText("/.well-known/api-catalog");
                    text = catalog || "API catalog unavailable.";
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
                    content: [{ type: "text", text }],
                }),
                { status: 200, headers: baseHeaders },
            );
        }

        default:
            return NextResponse.json(
                rpcError(id, -32601, `Method not found: ${method}`),
                { status: 200, headers: baseHeaders },
            );
    }
}

export async function GET() {
    return new NextResponse("CampusZen Documentation MCP endpoint. Use POST for JSON-RPC.", {
        status: 405,
        headers: { Allow: "POST", "Content-Type": "text/plain", "Cache-Control": "public, max-age=3600" },
    });
}

export async function DELETE() {
    return new NextResponse(null, { status: 200, headers: { "Content-Type": "application/json" } });
}

export const dynamic = "force-dynamic";
