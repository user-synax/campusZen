import { NextResponse } from "next/server";

const BASE_URL = "https://campuszen.tech";

const LLMS_TXT = `# CampusZen — llms.txt

CampusZen is a social network for Indian college students: campus communities,
study resources, leaderboards, events, and peer discussion.

## Public content (no login required)
- Home / overview: ${BASE_URL}/
- Sign up: ${BASE_URL}/signup
- Log in: ${BASE_URL}/login
- Terms of service: ${BASE_URL}/terms
- Privacy policy: ${BASE_URL}/privacy
- Markdown guide: ${BASE_URL}/markdown

## Machine-readable maps
- XML sitemap: ${BASE_URL}/sitemap.xml
- OpenAPI spec: ${BASE_URL}/openapi.json

## Authenticated product surface
The core product (feed, communities, messages, leaderboard, resources, wallet)
requires authentication. Public community summary pages are available at
${BASE_URL}/community/<college-slug> (e.g. /community/bca, /community/ignou,
/community/placement) and return community stats without a login wall.

## Notes for agents
- Respect robots.txt: /api, /feed, /admin, /settings, /chats, /notifications,
  /verify-student are disallowed.
- API errors follow the schema documented in /openapi.json:
  { "error": { "code": string, "message": string, "hint"?: string } }.
`;

export const dynamic = "force-static";

export function GET() {
    return new NextResponse(LLMS_TXT, {
        status: 200,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
        },
    });
}
