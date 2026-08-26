import { NextResponse } from "next/server";

export const dynamic = "force-static";

const DEV_LLMS = `# CampusZen Developers — llms.txt

Scoped agent context for the CampusZen developer surface.

## API & specs

- [OpenAPI spec](https://campuszen.tech/openapi.json)
- [API index](https://campuszen.tech/api)
- [MCP server (Streamable HTTP)](https://campuszen.tech/.well-known/mcp)
- [A2A agent card](https://campuszen.tech/.well-known/agent-card.json)
- [API catalog (RFC 9727)](https://campuszen.tech/.well-known/api-catalog)
- [Agent auth guide](https://campuszen.tech/auth.md)

## Authentication

Most endpoints require a session cookie (\`a_session_<projectId>\` or legacy
\`campusx_token\`). Log in with \`POST /api/auth/login\` (identifier + password).
See full guidance in [auth.md](https://campuszen.tech/auth.md).

## Public endpoints (no auth)

- [GET /api/communities](https://campuszen.tech/api/communities)
- [GET /api/public/stats](https://campuszen.tech/api/public/stats)
- [GET /api/health](https://campuszen.tech/api/health)
- [GET /api/leaderboard](https://campuszen.tech/api/leaderboard)
- [GET /api/events](https://campuszen.tech/api/events)
`;

export function GET() {
    return new NextResponse(DEV_LLMS, {
        status: 200,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
        },
    });
}
