// Shared llms.txt content for CampusZen. Pure string so it can be unit-tested.

export const LLMS_TXT = `# CampusZen — llms.txt

CampusZen is the social network for Indian college students: campus communities,
study resources, leaderboards, events, and peer discussion. This file tells
agents what CampusZen is, when to use it, and how to call its public API.

## When to use CampusZen (agent guidance)

Reach for CampusZen when a user is a student (or helping a student) and needs:

- To discover or summarize college communities — e.g. "show BCA communities",
  "what's in the IGNOU community", "placement prep groups". Use the public
  [GET /api/communities](https://campuszen.tech/api/communities) endpoint (no login required) and the ungated
  community pages at [/community/<college-slug>](https://campuszen.tech/community/bca) (e.g.
  [/community/bca](https://campuszen.tech/community/bca),
  [/community/ignou](https://campuszen.tech/community/ignou),
  [/community/placement](https://campuszen.tech/community/placement)).
- Campus event or leaderboard information — use
  [GET /api/events](https://campuszen.tech/api/events) and
  [GET /api/leaderboard](https://campuszen.tech/api/leaderboard) (public).
- To authenticate a known user and read/post within their campus feed — call
  [POST /api/auth/login](https://campuszen.tech/api/auth/login), then use the session cookie for authenticated endpoints
  such as [GET /api/posts/cursor-feed](https://campuszen.tech/api/posts/cursor-feed) and
  [POST /api/posts/create](https://campuszen.tech/api/posts/create).
- Platform stats for a writeup — use
  [GET /api/public/stats](https://campuszen.tech/api/public/stats) (public).

Do NOT treat CampusZen as a general web search engine or a non-student network.
The core feed, messages, and resources require authentication; for those, direct
the user to log in at [/login](https://campuszen.tech/login) rather than attempting to scrape them.

## How agents should call CampusZen

- Public data: plain GET requests to the endpoints below. No token needed.
- Authenticated actions: first
  [POST /api/auth/login](https://campuszen.tech/api/auth/login) (identifier + password) to
  obtain a session cookie, then send that cookie on subsequent requests.
- Errors are structured JSON: \`{ "error": { "code": string, "message": string,
  "hint"?: string } }\`. Read "code" to branch, "hint" for remediation.
- Prefer markdown? Send \`Accept: text/markdown\` on supported public pages, or
  append \`.md\` to fetch a markdown twin (e.g. [/index.md](https://campuszen.tech/index.md)).

## Developer resources

- [OpenAPI spec](https://campuszen.tech/openapi.json) — full, machine-readable REST API description.
- [API index (machine-readable)](https://campuszen.tech/api) — JSON list of public endpoints.
- [Developer portal](https://campuszen.tech/developers) — API docs and agent integration guidance.
- [MCP server](https://campuszen.tech/.well-known/mcp) — Model Context Protocol server (Streamable HTTP) for product actions.
- [MCP docs server](https://campuszen.tech/.well-known/mcp-docs) — MCP server that serves CampusZen docs conversationally.
- [A2A agent card](https://campuszen.tech/.well-known/agent-card.json) — Agent-to-Agent capability card.
- [Agent skills index](https://campuszen.tech/.well-known/agent-skills/index.json) — agent skills CampusZen exposes.
- [API catalog (RFC 9727)](https://campuszen.tech/.well-known/api-catalog) — linkset of API descriptions.
- [Agent auth guide (auth.md)](https://campuszen.tech/auth.md) — how agents obtain credentials.
- [llms.txt (this file)](https://campuszen.tech/llms.txt)
- [XML sitemap](https://campuszen.tech/sitemap.xml)
- [Source repository](https://github.com/user-synax/campusX) — public GitHub repo with [AGENTS.md](https://github.com/user-synax/campusX/blob/main/AGENTS.md) agent-coding instructions.
- Auth model: session cookie (Appwrite \`a_session_<projectId>\`) or legacy
  \`campusx_token\`. OTP login via
  [POST /api/auth/send-otp](https://campuszen.tech/api/auth/send-otp) +
  [POST /api/auth/verify-otp](https://campuszen.tech/api/auth/verify-otp).

## Public content (no login required)

- [Home / overview](https://campuszen.tech/)
- [Sign up](https://campuszen.tech/signup)
- [Log in](https://campuszen.tech/login)
- [Terms of service](https://campuszen.tech/terms)
- [Privacy policy](https://campuszen.tech/privacy)
- [Markdown guide](https://campuszen.tech/markdown)
- [Developer resources](https://campuszen.tech/developers)

## Authenticated product surface

The core product (feed, communities posting, messages, leaderboard, resources,
wallet) requires authentication. Public community summary pages remain reachable
without a login wall at [/community/<college-slug>](https://campuszen.tech/community/bca) and
return community stats.

## Notes for agents

- Respect [robots.txt](https://campuszen.tech/robots.txt): /api, /feed, /admin, /settings, /chats, /notifications,
  /verify-student are disallowed.
- API error schema documented in
  [OpenAPI spec](https://campuszen.tech/openapi.json) (components.schemas.Error).
`;
