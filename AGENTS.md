# AGENTS.md — CampusZen

Guidance for AI coding agents working in this repository.

## What this is

CampusZen is a Next.js 16 (App Router) + React 19 student
social platform for Indian college students. The repo is at
`https://github.com/user-synax/campusX`.

## Commands

- `npm run dev` — start the dev server.
- `npm run build` / `npm start` — production build and serve.
- `npm run lint` — ESLint (next lint).
- `npm test` — runs `tests/agent-readiness.test.mjs` (node:test). This verifies
  the OpenAPI spec, llms.txt, markdown negotiation, robots.txt, and JSON-LD.

## Architecture notes

- App Router with parallel route groups: `(auth)`, `(main)`, `(public)`.
- API route handlers live under `app/api/**/route.js`.
- Mongoose models in `models/`, shared lib in `lib/`, hooks in `hooks/`.
- Auth is mid-migration: Appwrite session cookie (`a_session_<projectId>`),
  legacy JWT cookie (`campusx_token`), and Better Auth coexist. Always verify
  the session server-side in API routes via `lib/auth.js`.
- Agent-readiness surfaces (all machine-discoverable) live in `lib/` and are
  served by route handlers: `lib/openapi-spec.js`, `lib/llms-txt.js`,
  `lib/markdown-content.js`. Do not inline JSON-LD/markdown there; edit the lib
  sources so the unit tests stay valid.

## Well-known agent endpoints (do not break)

- `/.well-known/agent-card.json` (A2A), `/.well-known/agent-skills/index.json`,
  `/.well-known/api-catalog` (RFC 9727), `/.well-known/ai-catalog.json` (ARD),
  `/.well-known/mcp` (redirect to the MCP server), `/.well-known/mcp/server-card.json`,
  `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`,
  `/.well-known/http-message-signatures-directory`.
- These are served by `app/api/.well-known/[...slug]/route.js` via a rewrite in
  `next.config.mjs`. Add new well-known resources there.
- `/api/mcp` is the MCP (Streamable HTTP) server. `/api/ask` is the NLWeb
  endpoint. `/auth.md` and `/index.md` serve markdown.

## Conventions

- Keep `operationId`, `description`, and JSON response schemas in
  `lib/openapi-spec.js` (the test enforces >60% schema coverage and unique ids).
- Public pages served via middleware markdown negotiation must keep their
  frontmatter + heading shape (see `lib/markdown-content.js`).
- Never commit secrets. Validate env in `lib/config.js`.
