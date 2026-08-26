import { NextResponse } from "next/server";
import { createHash } from "crypto";

const ORIGIN = "https://campuszen.tech";

function json(body, init = {}) {
    return new NextResponse(JSON.stringify(body, null, 2), {
        status: init.status ?? 200,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
            ...(init.headers || {}),
        },
    });
}

function sha256(s) {
    return "sha256:" + createHash("sha256").update(s, "utf8").digest("hex");
}

// Progressive-trust manifest shared by every ARD entry.
const TRUST_MANIFEST = {
    identity: {
        type: "domain",
        value: "campuszen.tech",
        verified: true,
        method: "tls-dns",
    },
    attestations: [
        { type: "website", url: ORIGIN },
        { type: "well-known", url: `${ORIGIN}/.well-known/oauth-protected-resource` },
    ],
    signatures: [
        {
            kid: "campuszen-2026",
            alg: "EdDSA",
            url: `${ORIGIN}/.well-known/http-message-signatures-directory`,
        },
    ],
};

// RFC 9727 API catalog (linkset+json)
const API_CATALOG = {
    linkset: [
        {
            anchor: ORIGIN,
            item: [
                {
                    href: `${ORIGIN}/openapi.json`,
                    rel: "service-desc",
                    type: "application/json",
                    title: "CampusZen OpenAPI 3.0 description",
                },
                {
                    href: `${ORIGIN}/.well-known/mcp`,
                    rel: "service-desc",
                    type: "application/json",
                    title: "CampusZen MCP server discovery",
                },
                {
                    href: `${ORIGIN}/api/mcp`,
                    rel: "mcp",
                    type: "application/json",
                    title: "CampusZen MCP server (Streamable HTTP)",
                },
                {
                    href: `${ORIGIN}/.well-known/mcp-docs`,
                    rel: "service-desc",
                    type: "application/json",
                    title: "CampusZen Documentation MCP server",
                },
                {
                    href: `${ORIGIN}/api/mcp-docs`,
                    rel: "mcp",
                    type: "application/json",
                    title: "CampusZen Documentation MCP server (Streamable HTTP)",
                },
                {
                    href: `${ORIGIN}/llms.txt`,
                    rel: "describedby",
                    type: "text/plain",
                    title: "CampusZen llms.txt agent guidance",
                },
                {
                    href: `${ORIGIN}/.well-known/agent-card.json`,
                    rel: "service-desc",
                    type: "application/json",
                    title: "CampusZen A2A agent card",
                },
                {
                    href: `${ORIGIN}/.well-known/agent-skills/index.json`,
                    rel: "service-desc",
                    type: "application/json",
                    title: "CampusZen agent skills index",
                },
                {
                    href: `${ORIGIN}/auth.md`,
                    rel: "help",
                    type: "text/markdown",
                    title: "CampusZen agent auth guide",
                },
            ],
        },
    ],
};

// Agentic Resource Discovery catalog (ARD / ai-catalog.json).
// Conforms to the ai-catalog schema: top-level specVersion, an `entries`
// array where each entry carries a urn:air identifier, a media type, and a
// url (or data), plus a trustManifest for progressive trust.
const AI_CATALOG = {
    specVersion: "1.0",
    name: "CampusZen Agentic Resource Catalog",
    description:
        "Machine-discoverable agentic resources for CampusZen, the social network for Indian college students.",
    homepage: ORIGIN,
    trustManifest: TRUST_MANIFEST,
    entries: [
        {
            urn: "urn:air:campuszen.tech:mcp-server:product",
            name: "CampusZen MCP Server",
            mediaType: "application/json",
            url: `${ORIGIN}/.well-known/mcp`,
            description:
                "Model Context Protocol server exposing CampusZen's public product surface over Streamable HTTP.",
            trustManifest: TRUST_MANIFEST,
        },
        {
            urn: "urn:air:campuszen.tech:mcp-server:docs",
            name: "CampusZen Documentation MCP Server",
            mediaType: "application/json",
            url: `${ORIGIN}/.well-known/mcp-docs`,
            description:
                "MCP server that lets agents pull CampusZen docs (OpenAPI, llms.txt, auth.md) conversationally.",
            trustManifest: TRUST_MANIFEST,
        },
        {
            urn: "urn:air:campuszen.tech:agent-card:main",
            name: "CampusZen A2A Agent Card",
            mediaType: "application/json",
            url: `${ORIGIN}/.well-known/agent-card.json`,
            description: "Agent-to-Agent capability card (A2A 0.2.6).",
            trustManifest: TRUST_MANIFEST,
        },
        {
            urn: "urn:air:campuszen.tech:agent-skills:index",
            name: "CampusZen Agent Skills",
            mediaType: "application/json",
            url: `${ORIGIN}/.well-known/agent-skills/index.json`,
            description: "Index of agent skills CampusZen exposes.",
            trustManifest: TRUST_MANIFEST,
        },
        {
            urn: "urn:air:campuszen.tech:openapi:main",
            name: "CampusZen OpenAPI",
            mediaType: "application/json",
            url: `${ORIGIN}/openapi.json`,
            description: "Full REST API description.",
            trustManifest: TRUST_MANIFEST,
        },
        {
            urn: "urn:air:campuszen.tech:llms-txt:main",
            name: "CampusZen llms.txt",
            mediaType: "text/plain",
            url: `${ORIGIN}/llms.txt`,
            description: "Natural-language agent guidance.",
            trustManifest: TRUST_MANIFEST,
        },
        {
            urn: "urn:air:campuszen.tech:api-catalog:rfc9727",
            name: "CampusZen API Catalog (RFC 9727)",
            mediaType: "application/linkset+json",
            url: `${ORIGIN}/.well-known/api-catalog`,
            description: "RFC 9727 linkset of API descriptions.",
            trustManifest: TRUST_MANIFEST,
        },
        {
            urn: "urn:air:campuszen.tech:auth-md:main",
            name: "CampusZen Agent Auth Guide",
            mediaType: "text/markdown",
            url: `${ORIGIN}/auth.md`,
            description: "How agents obtain and use credentials.",
            trustManifest: TRUST_MANIFEST,
        },
    ],
};

// Markdown bodies for each published agent skill (served at
// /.well-known/agent-skills/<name>.md). Digests are computed from the raw
// bytes so the v0.2.0 index can advertise verifiable artifacts.
const SKILL_MARKDOWNS = {
    "campuszen-community-explorer": `# CampusZen — Community Explorer

Discover, list, and summarize campus communities by name or college slug
(e.g. bca, ignou, placement).

## When to use
- "Show the BCA community"
- "Summarize the IGNOU community stats"

## How
Call \`GET /api/communities\` (public, no auth). Pass \`name\` to fetch one
community, or omit it to list communities sorted by post count.

## Sources
- API: https://campuszen.tech/api/communities
- OpenAPI: https://campuszen.tech/openapi.json
`,
    "campuszen-events-browser": `# CampusZen — Events Browser

List upcoming or past campus events, optionally filtered by college.

## When to use
- "What campus events are coming up at IIT Delhi?"

## How
Call \`GET /api/events\` (public). Query params: \`college\`, \`filter\`
(upcoming|past), \`page\`, \`limit\`.

## Sources
- API: https://campuszen.tech/api/events
- OpenAPI: https://campuszen.tech/openapi.json
`,
    "campuszen-leaderboard-reader": `# CampusZen — Leaderboard Reader

Read public leaderboards of top contributors by reputation.

## When to use
- "Who are the top contributors this week?"

## How
Call \`GET /api/leaderboard\` (public). Query params: \`type\`
(global|weekly|college), \`limit\`.

## Sources
- API: https://campuszen.tech/api/leaderboard
- OpenAPI: https://campuszen.tech/openapi.json
`,
    "campuszen-stats-reader": `# CampusZen — Stats Reader

Read platform statistics (users, posts, resources, communities).

## When to use
- "How many students use CampusZen?"

## How
Call \`GET /api/public/stats\` (public, no auth).

## Sources
- API: https://campuszen.tech/api/public/stats
- OpenAPI: https://campuszen.tech/openapi.json
`,
    "campuszen-post-publisher": `# CampusZen — Post Publisher

Create and read feed posts within the authenticated user's campus feed.

## When to use
- "Post an announcement to my campus community"

## How
Authenticate via \`POST /api/auth/login\`, then call
\`POST /api/posts/create\` with a session cookie or bearer token.

## Sources
- API: https://campuszen.tech/api/posts/create
- Auth guide: https://campuszen.tech/auth.md
`,
};

const AGENT_SKILLS = {
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    name: "CampusZen Agent Skills",
    homepage: ORIGIN,
    skills: Object.entries(SKILL_MARKDOWNS).map(([name, md]) => ({
        type: "skill-md",
        name,
        url: `${ORIGIN}/.well-known/agent-skills/${name}.md`,
        digest: sha256(md),
    })),
};

const AGENT_CARD = {
    protocolVersion: "0.2.6",
    name: "CampusZen Agent",
    description:
        "CampusZen is the social network for Indian college students. This agent card advertises the capabilities exposed to other agents via A2A and MCP.",
    url: `${ORIGIN}/.well-known/agent-card.json`,
    provider: {
        organization: "CampusZen",
        url: ORIGIN,
    },
    version: "1.0.0",
    capabilities: {
        streaming: false,
        pushNotifications: false,
        stateTransitionHistory: false,
    },
    authentication: {
        schemes: ["session-cookie", "oauth2"],
        description:
            "Public endpoints are unauthenticated. Write actions require a session cookie obtained from POST /api/auth/login or an OAuth2 bearer token. See https://campuszen.tech/auth.md",
    },
    defaultInputModes: ["application/json", "text/plain"],
    defaultOutputModes: ["application/json", "text/markdown"],
    skills: [
        {
            id: "community-explorer",
            name: "Community Explorer",
            description:
                "Discover and summarize campus communities by name or college slug.",
            tags: ["communities", "discovery"],
            examples: [
                "List the BCA community",
                "Summarize the IGNOU community stats",
            ],
        },
        {
            id: "events-browser",
            name: "Events Browser",
            description: "List upcoming or past campus events by college.",
            tags: ["events"],
            examples: ["What campus events are coming up at IIT Delhi?"],
        },
        {
            id: "leaderboard-reader",
            name: "Leaderboard Reader",
            description: "Read public reputation leaderboards.",
            tags: ["leaderboard"],
            examples: ["Who are the top contributors this week?"],
        },
        {
            id: "post-publisher",
            name: "Post Publisher",
            description:
                "Create and read feed posts within the authenticated campus feed.",
            tags: ["posts", "feed"],
            examples: ["Post an announcement to my campus community"],
        },
    ],
};

const MCP_SERVER_CARD = {
    name: "CampusZen MCP Server",
    description:
        "Model Context Protocol server for CampusZen. Exposes public discovery and authenticated product actions so Claude, ChatGPT, and other agents can call CampusZen natively over Streamable HTTP.",
    version: "1.0.0",
    protocolVersion: "2025-06-18",
    serverUrl: `${ORIGIN}/api/mcp`,
    transport: ["streamable-http"],
    documentation: `${ORIGIN}/openapi.json`,
    capabilities: {
        tools: true,
        resources: true,
        ui: true,
    },
    uiResources: [`ui://campuszen.tech/tools`],
    tools: [
        { name: "list_communities", description: "List or fetch a campus community by name." },
        { name: "get_public_stats", description: "Get platform user/post/resource counts." },
        { name: "list_events", description: "List upcoming or past campus events." },
        { name: "get_leaderboard", description: "Read the public reputation leaderboard." },
        { name: "create_post", description: "Create a feed post (authenticated)." },
        { name: "get_post", description: "Fetch a single post by id (authenticated)." },
    ],
};

const MCP_DOCS_SERVER_CARD = {
    name: "CampusZen Documentation MCP Server",
    description:
        "MCP server that lets agents pull CampusZen reference material (OpenAPI spec, llms.txt, agent auth guide, API catalog) conversationally over Streamable HTTP.",
    version: "1.0.0",
    protocolVersion: "2025-06-18",
    serverUrl: `${ORIGIN}/api/mcp-docs`,
    transport: ["streamable-http"],
    documentation: `${ORIGIN}/openapi.json`,
    capabilities: {
        tools: true,
        resources: true,
        ui: false,
    },
    tools: [
        { name: "read_openapi", description: "Return the CampusZen OpenAPI 3.0 document." },
        { name: "read_llms_txt", description: "Return the CampusZen llms.txt agent guidance." },
        { name: "read_auth_md", description: "Return the CampusZen agent auth guide (auth.md)." },
        { name: "read_api_catalog", description: "Return the RFC 9727 API catalog." },
    ],
};

// Stable Ed25519 JWK for the Web Bot Auth directory (generated once).
const SIGNATURES_DIRECTORY = {
    keys: [
        {
            kty: "OKP",
            crv: "Ed25519",
            kid: "campuszen-2026",
            x: "8DCFrg5_17EFr1AiwGNLR2zmPYH_o1EfR_JQycI-v6I",
            nbf: 1700000000,
            exp: 1999999999,
            alg: "EdDSA",
        },
    ],
};

const OAUTH_AS = {
    issuer: ORIGIN,
    authorization_endpoint: `${ORIGIN}/api/agent/authorize`,
    token_endpoint: `${ORIGIN}/api/agent/token`,
    jwks_uri: `${ORIGIN}/.well-known/http-message-signatures-directory`,
    scopes_supported: [
        "read:public",
        "read:profile",
        "read:communities",
        "write:posts",
        "write:communities",
    ],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "client_credentials"],
    token_endpoint_auth_methods_supported: ["none", "private_key_jwt"],
    service_documentation: `${ORIGIN}/auth.md`,
    agent_auth: {
        register_uri: `${ORIGIN}/api/agent/register`,
        skill: `${ORIGIN}/auth.md`,
        identity_types_supported: ["anonymous", "identity_assertion"],
        anonymous: {
            credential_types_supported: ["api-key"],
        },
        identity_assertion: {
            assertion_types_supported: ["id-jag"],
            credential_types_supported: ["id-token"],
        },
    },
};

const OAUTH_PR = {
    resource: `${ORIGIN}/api`,
    authorization_servers: [ORIGIN],
    scopes_supported: [
        "read:public",
        "read:profile",
        "read:communities",
        "write:posts",
        "write:communities",
    ],
    bearer_methods_supported: ["header"],
    resource_signing_alg_values_supported: ["EdDSA"],
    resource_documentation: `${ORIGIN}/auth.md`,
};

const AGENT_PLUGIN = {
    $schema: "https://agent-plugins.org/specification",
    name: "CampusZen",
    version: "1.0.0",
    description:
        "Agent plugins for CampusZen: MCP servers, agent skills, and A2A card for the Indian college student social network.",
    homepage: ORIGIN,
    repository: "https://github.com/user-synax/campusX",
    author: { name: "CampusZen", url: ORIGIN },
    capabilities: {
        mcp: `${ORIGIN}/.well-known/mcp`,
        mcpDocs: `${ORIGIN}/.well-known/mcp-docs`,
        skills: `${ORIGIN}/.well-known/agent-skills/index.json`,
        agentCard: `${ORIGIN}/.well-known/agent-card.json`,
    },
};

export async function GET(request, { params }) {
    const { slug } = await params;
    const key = slug.join("/");

    switch (key) {
        case "ai-catalog.json":
            return json(AI_CATALOG);
        case "agent-skills/index.json":
            return json(AGENT_SKILLS);
        case "agent-card.json":
            return json(AGENT_CARD);
        case "api-catalog":
            return new NextResponse(JSON.stringify(API_CATALOG, null, 2), {
                status: 200,
                headers: {
                    "Content-Type":
                        'application/linkset+json;profile="https://www.rfc-editor.org/info/rfc9727"; charset=utf-8',
                    "Cache-Control": "public, max-age=3600",
                },
            });
        case "http-message-signatures-directory":
            return json(SIGNATURES_DIRECTORY);
        case "oauth-authorization-server":
            return json(OAUTH_AS);
        case "oauth-protected-resource":
            return json(OAUTH_PR);
        case "ai-plugin.json":
        case "plugin.json":
            return json(AGENT_PLUGIN);
        case "mcp/server-card.json":
            return json(MCP_SERVER_CARD);
        case "mcp-docs/server-card.json":
            return json(MCP_DOCS_SERVER_CARD);
        case "mcp":
        case "mcp-docs": {
            // Advertise the MCP endpoint(s) per well-known discovery.
            const isDocs = key === "mcp-docs";
            const card = isDocs ? MCP_DOCS_SERVER_CARD : MCP_SERVER_CARD;
            return json(
                {
                    type: "mcp",
                    protocol: "streamable-http",
                    url: card.serverUrl,
                    serverCard: `${ORIGIN}/.well-known/${key}/server-card.json`,
                },
                {
                    status: 200,
                    headers: {
                        Link: `<${card.serverUrl}>; rel="service-desc"; type="application/json"`,
                    },
                },
            );
        }
        default:
            // Serve agent skill markdown artifacts for the v0.2.0 index.
            if (key.startsWith("agent-skills/") && key.endsWith(".md")) {
                const name = key.replace("agent-skills/", "").replace(/\.md$/, "");
                const md = SKILL_MARKDOWNS[name];
                if (md) {
                    return new NextResponse(md, {
                        status: 200,
                        headers: {
                            "Content-Type": "text/markdown; charset=utf-8",
                            "Cache-Control": "public, max-age=3600",
                        },
                    });
                }
            }
            return json({ error: "Not found", key }, { status: 404 });
    }
}

export const dynamic = "force-dynamic";
