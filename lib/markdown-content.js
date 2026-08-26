// Pure, edge-safe markdown generators for Accept: text/markdown content
// negotiation. No DB or Next.js imports so middleware can use them and they can
// be unit-tested.

const HOMEPAGE_MARKDOWN = `# CampusZen

CampusZen is the social network for Indian college students — campus communities,
study resources, leaderboards, events, and peer discussion.

## What you can do

- Join your campus community and college-specific groups (BCA, IGNOU, placement, and more).
- Share posts, ask questions, and discover peer-curated study resources.
- Track reputation on the leaderboard and attend campus events.

## Public, no-login content

- Home: https://campuszen.tech/
- Communities summary: https://campuszen.tech/community/<college-slug> (e.g. /community/bca, /community/ignou, /community/placement)
- Sign up: https://campuszen.tech/signup
- Log in: https://campuszen.tech/login
- Terms: https://campuszen.tech/terms
- Privacy: https://campuszen.tech/privacy
- Markdown guide: https://campuszen.tech/markdown

## Machine-readable resources

- llms.txt: https://campuszen.tech/llms.txt
- OpenAPI spec: https://campuszen.tech/openapi.json
- API index: https://campuszen.tech/api
- Developer portal: https://campuszen.tech/developers
- XML sitemap: https://campuszen.tech/sitemap.xml
`;

const DEVELOPERS_MARKDOWN = `# CampusZen Developer Resources

CampusZen exposes a small public REST API plus an OpenAPI document so agents and
developers can integrate programmatically.

## API

- OpenAPI spec: https://campuszen.tech/openapi.json
- API index: https://campuszen.tech/api
- llms.txt (agent guidance): https://campuszen.tech/llms.txt

## Authentication

Most endpoints require a session cookie (Appwrite \`a_session_<projectId>\` or the
legacy \`campusx_token\`). Log in with \`POST /api/auth/login\` (identifier +
password). OTP flow: \`POST /api/auth/send-otp\` then \`POST /api/auth/verify-otp\`.

## Public endpoints (no auth)

- \`GET /api/communities\` — list communities or fetch one by \`name\`.
- \`GET /api/public/stats\` — platform counts.
- \`GET /api/health\` — liveness probe.
- \`GET /api/leaderboard\` — top contributors.
- \`GET /api/events\` — upcoming events.

## Error format

All errors are structured JSON:

\`\`\`json
{ "error": { "code": "validation_error", "message": "...", "hint": "..." } }
\`\`\`
`;

const MARKDOWN_GUIDE = `# CampusZen Markdown Guide

CampusZen supports Markdown in posts and comments (GitHub-flavored Markdown via
remark-gfm).

## Supported syntax

- Headings: \`#\`, \`##\`, \`###\`
- Bold \`**text**\`, italic \`*text*\`, inline code \`\`code\`\`
- Lists, links, blockquotes, and tables
- Code fences with language hints

## Agent note

Request any supported public page with \`Accept: text/markdown\` to receive this
content as Markdown instead of HTML.
`;

const TERMS_MARKDOWN = `# CampusZen Terms of Service

Brief summary of the CampusZen terms of service. Full legal text is served at
https://campuszen.tech/terms. CampusZen is for verified Indian college students.
Be respectful, do not share private information, and follow community guidelines.
`;

const PRIVACY_MARKDOWN = `# CampusZen Privacy Policy

Brief summary of the CampusZen privacy policy. Full text is served at
https://campuszen.tech/privacy. We collect account, college, and usage data to
operate the social network and never sell student data.
`;

const AUTH_MARKDOWN = `# CampusZen — Log in or sign up

Create an account or log in at https://campuszen.tech/login (or /signup). Use
your college email or phone number, then verify your campus to join communities.
`;

const GENERIC_MARKDOWN = `# CampusZen

CampusZen is the social network for Indian college students.

- Home: https://campuszen.tech/
- llms.txt: https://campuszen.tech/llms.txt
- OpenAPI: https://campuszen.tech/openapi.json
- Developer portal: https://campuszen.tech/developers
- Communities: https://campuszen.tech/community/<college-slug>
`;

export function getMarkdownContent(pathname) {
    if (!pathname) return GENERIC_MARKDOWN;

    if (pathname === "/") return HOMEPAGE_MARKDOWN;
    if (pathname === "/markdown") return MARKDOWN_GUIDE;
    if (pathname === "/developers") return DEVELOPERS_MARKDOWN;
    if (pathname === "/terms") return TERMS_MARKDOWN;
    if (pathname === "/privacy") return PRIVACY_MARKDOWN;
    if (pathname === "/login" || pathname === "/signup") return AUTH_MARKDOWN;

    if (pathname.startsWith("/community/")) {
        const slug = pathname.replace("/community/", "").replace(/\/$/, "");
        return `# CampusZen Community: ${slug}

This is a public summary page for the "${slug}" campus community.

- Community stats API: https://campuszen.tech/api/communities?name=${encodeURIComponent(
            slug,
        )}
- All communities: https://campuszen.tech/api/communities
- Log in to view discussions: https://campuszen.tech/login
`;
    }

    return GENERIC_MARKDOWN;
}
