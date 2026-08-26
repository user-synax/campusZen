---
name: campuszen-agent-integration
description: Integrate AI agents with CampusZen — the social network for Indian college students — using its OpenAPI spec, MCP server, A2A agent card, and agent auth guide.
version: 1.0.0
---

# CampusZen Agent Integration

Use this skill when building or configuring an AI agent that needs to discover,
read, or act on CampusZen, the social network for Indian college students.

## When to use

- A user asks to summarize or find college communities, campus events, or
  leaderboards for Indian students.
- An agent needs to post or read within a student's campus feed.
- You are wiring CampusZen into an agent runtime (Claude, ChatGPT, LangChain,
  or any MCP client).

## Resources (machine-discoverable)

- **OpenAPI spec:** `https://campuszen.tech/openapi.json` — full REST API.
- **MCP server (Streamable HTTP):** `https://campuszen.tech/.well-known/mcp`
  redirects to `https://campuszen.tech/api/mcp`. Tools: `list_communities`,
  `get_public_stats`, `list_events`, `get_leaderboard`, `create_post`, `get_post`.
- **A2A agent card:** `https://campuszen.tech/.well-known/agent-card.json`
- **Agent skills index:** `https://campuszen.tech/.well-known/agent-skills/index.json`
- **API catalog (RFC 9727):** `https://campuszen.tech/.well-known/api-catalog`
- **llms.txt:** `https://campuszen.tech/llms.txt` — natural-language guidance.
- **Agent auth guide:** `https://campuszen.tech/auth.md`

## Authentication

Public endpoints (communities, stats, events, leaderboard, health) need no
token. Authenticated actions use a session cookie from
`POST /api/auth/login` (identifier + password) or an OAuth2 bearer token.
Unauthenticated API probes receive a `WWW-Authenticate: Bearer
resource_metadata="https://campuszen.tech/.well-known/oauth-protected-resource"`
hint. See `https://campuszen.tech/auth.md` for the full flow.

## Quick start (MCP)

Point your MCP client at `https://campuszen.tech/api/mcp` (Streamable HTTP
transport). Call `tools/list`, then `list_communities` or `get_public_stats`
without auth, and forward the user's session cookie/bearer token on
`create_post` / `get_post`.
