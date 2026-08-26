import { NextResponse } from "next/server";

export const dynamic = "force-static";

const API_LLMS = `# CampusZen API — llms.txt

Scoped agent context for the CampusZen REST API.

## Reference

- [OpenAPI spec](https://campuszen.tech/openapi.json)
- [API index](https://campuszen.tech/api)
- [MCP server](https://campuszen.tech/.well-known/mcp)
- [Agent auth guide](https://campuszen.tech/auth.md)

## Authentication

- Public endpoints need no token.
- Authenticated endpoints use a session cookie from
  [POST /api/auth/login](https://campuszen.tech/api/auth/login) or an OAuth2
  bearer token. See [auth.md](https://campuszen.tech/auth.md).

## Error format

All errors are structured JSON:

\`\`\`json
{
  "success": false,
  "error": { "code": "validation_error", "message": "...", "hint": "..." }
}
\`\`\`

## Public endpoints

- [GET /api/communities](https://campuszen.tech/api/communities)
- [GET /api/public/stats](https://campuszen.tech/api/public/stats)
- [GET /api/health](https://campuszen.tech/api/health)
- [GET /api/leaderboard](https://campuszen.tech/api/leaderboard)
- [GET /api/events](https://campuszen.tech/api/events)

## Authenticated endpoints

- [POST /api/auth/login](https://campuszen.tech/api/auth/login)
- [GET /api/posts/cursor-feed](https://campuszen.tech/api/posts/cursor-feed)
- [POST /api/posts/create](https://campuszen.tech/api/posts/create)
- [GET /api/users/me](https://campuszen.tech/api/users/me)
`;

export function GET() {
    return new NextResponse(API_LLMS, {
        status: 200,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
        },
    });
}
