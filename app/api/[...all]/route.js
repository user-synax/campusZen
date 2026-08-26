import { NextResponse } from "next/server";

const ORIGIN = "https://campuszen.tech";

function body(pathname) {
    return `# 404 — Not Found

The path \`${pathname}\` is not a CampusZen API endpoint.

## Where to look next

- API index: https://campuszen.tech/api
- OpenAPI spec: https://campuszen.tech/openapi.json
- llms.txt (agent guidance): https://campuszen.tech/llms.txt
- MCP server: https://campuszen.tech/.well-known/mcp
- Site map: https://campuszen.tech/sitemap.xml
`;
}

export function GET(request) {
    const pathname = request.nextUrl.pathname;
    const accept = request.headers.get("accept") || "";
    if (/text\/markdown/i.test(accept)) {
        return new NextResponse(body(pathname), {
            status: 404,
            headers: { "Content-Type": "text/markdown; charset=utf-8" },
        });
    }
    return NextResponse.json(
        {
            success: false,
            error: {
                code: "NOT_FOUND",
                message: `No API endpoint at ${pathname}.`,
            },
            timestamp: new Date().toISOString(),
        },
        { status: 404 },
    );
}

export const dynamic = "force-dynamic";
