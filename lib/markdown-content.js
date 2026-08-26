// Pure, edge-safe markdown generators for Accept: text/markdown content
// negotiation. No DB or Next.js imports so middleware can use them and they can
// be unit-tested.

function fm(title, description, canonical, body) {
    const lastUpdated = new Date().toISOString().slice(0, 10);
    return `---
title: ${title}
description: ${description}
canonical: ${canonical}
last-updated: ${lastUpdated}
---

${body}`;
}

const HOMEPAGE_MARKDOWN = fm(
    "CampusZen — the social network for Indian college students",
    "Campus communities, study resources, leaderboards, events, and peer discussion for Indian college students.",
    "https://campuszen.tech/",
    `# CampusZen

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
`,
);

const DEVELOPERS_MARKDOWN = fm(
    "CampusZen Developer Resources",
    "API docs, OpenAPI spec, and agent integration guidance for the CampusZen student social network.",
    "https://campuszen.tech/developers",
    `# CampusZen Developer Resources

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
`,
);

const MARKDOWN_GUIDE = fm(
    "CampusZen Markdown Guide",
    "How CampusZen supports Markdown in posts and via Accept: text/markdown content negotiation.",
    "https://campuszen.tech/markdown",
    `# CampusZen Markdown Guide

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
`,
);

const TERMS_MARKDOWN = fm(
    "CampusZen Terms of Service",
    "Summary of the CampusZen terms of service for Indian college students.",
    "https://campuszen.tech/terms",
    `# CampusZen Terms of Service

Brief summary of the CampusZen terms of service. Full legal text is served at
https://campuszen.tech/terms. CampusZen is for verified Indian college students.
Be respectful, do not share private information, and follow community guidelines.
`,
);

const PRIVACY_MARKDOWN = fm(
    "CampusZen Privacy Policy",
    "Summary of the CampusZen privacy policy.",
    "https://campuszen.tech/privacy",
    `# CampusZen Privacy Policy

Brief summary of the CampusZen privacy policy. Full text is served at
https://campuszen.tech/privacy. We collect account, college, and usage data to
operate the social network and never sell student data.
`,
);

const AUTH_MARKDOWN = fm(
    "CampusZen — Log in or sign up",
    "How to create a CampusZen account or log in as a student.",
    "https://campuszen.tech/login",
    `# CampusZen — Log in or sign up

Create an account or log in at https://campuszen.tech/login (or /signup). Use
your college email or phone number, then verify your campus to join communities.
`,
);

const AUTH_MD = fm(
    "CampusZen Agent Auth",
    "How AI agents obtain and use CampusZen credentials (session cookie or OAuth2 bearer).",
    "https://campuszen.tech/auth.md",
    `# CampusZen Agent Auth

How AI agents obtain and use credentials to call the CampusZen API.

## Discover

CampusZen publishes machine-readable auth discovery:

- OAuth 2.0 authorization-server metadata: \`/.well-known/oauth-authorization-server\`
- OAuth 2.0 protected-resource metadata (RFC 9728): \`/.well-known/oauth-protected-resource\`
- Web Bot Auth key directory (RFC 9421): \`/.well-known/http-message-signatures-directory\`
- Agent auth guide (this file): \`/auth.md\`

Unauthenticated API probes receive a \`WWW-Authenticate: Bearer resource_metadata="https://campuszen.tech/.well-known/oauth-protected-resource"\` hint.

## Pick a method

CampusZen supports two credential models:

1. **Session cookie** (primary): \`a_session_<projectId>\` (Appwrite) or the legacy
   \`campusx_token\` cookie, obtained via \`POST /api/auth/login\`.
2. **OAuth 2.0 bearer token**: issued via the authorization server for agent
   integrations (\`identity_assertion\` with \`id-jag\` assertions, or \`anonymous\`
   API-key credentials).

## Register

Register an agent credential at the \`agent_auth.register_uri\`:
\`POST https://campuszen.tech/api/agent/register\`. See the \`agent_auth\` block in
\`/.well-known/oauth-authorization-server\` for \`identity_types_supported\`
(\`anonymous\`, \`identity_assertion\`).

## Claim

Claim an issued credential at \`POST https://campuszen.tech/api/agent/claim\`
(identity_assertion \`id-jag\` flow). The assertion type is advertised under
\`identity_assertion.assertion_types_supported\`.

## Use the credential

Send the session cookie or bearer token on every request:

\`\`\`http
GET /api/users/me
Authorization: Bearer <token>
Cookie: a_session_<projectId>=<value>
\`\`\`

## Errors

API errors are structured JSON:

\`\`\`json
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "..." } }
\`\`\`

On a 401 the server returns \`WWW-Authenticate\` with the protected-resource
metadata URL so an agent can discover auth requirements from a single response.

## Revocation

Revoke a session by calling \`POST https://campuszen.tech/api/auth/logout\` or, for
agent credentials, \`POST https://campuszen.tech/api/agent/revoke\`.
`,
);

const GENERIC_MARKDOWN = fm(
    "CampusZen",
    "CampusZen is the social network for Indian college students.",
    "https://campuszen.tech/",
    `# CampusZen

CampusZen is the social network for Indian college students.

- Home: https://campuszen.tech/
- llms.txt: https://campuszen.tech/llms.txt
- OpenAPI: https://campuszen.tech/openapi.json
- Developer portal: https://campuszen.tech/developers
- Communities: https://campuszen.tech/community/<college-slug>
`,
);

export function getMarkdownContent(pathname) {
    if (!pathname) return GENERIC_MARKDOWN;

    if (pathname === "/") return HOMEPAGE_MARKDOWN;
    if (pathname === "/markdown") return MARKDOWN_GUIDE;
    if (pathname === "/developers") return DEVELOPERS_MARKDOWN;
    if (pathname === "/terms") return TERMS_MARKDOWN;
    if (pathname === "/privacy") return PRIVACY_MARKDOWN;
    if (pathname === "/login" || pathname === "/signup") return AUTH_MARKDOWN;
    if (pathname === "/auth.md") return AUTH_MD;

    if (pathname.startsWith("/community/")) {
        const slug = pathname.replace("/community/", "").replace(/\/$/, "");
        return fm(
            `CampusZen Community: ${slug}`,
            `Public summary page for the "${slug}" campus community.`,
            `https://campuszen.tech/community/${slug}`,
            `# CampusZen Community: ${slug}

This is a public summary page for the "${slug}" campus community.

- Community stats API: https://campuszen.tech/api/communities?name=${encodeURIComponent(
                slug,
            )}
- All communities: https://campuszen.tech/api/communities
- Log in to view discussions: https://campuszen.tech/login
`,
        );
    }

    return GENERIC_MARKDOWN;
}

export function getAuthMarkdown() {
    return AUTH_MD;
}
