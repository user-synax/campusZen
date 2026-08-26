import { NextResponse } from "next/server";

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
                    title: "CampusZen MCP server (Streamable HTTP)",
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

// Agentic Resource Discovery catalog
const AI_CATALOG = {
    version: "1.0",
    name: "CampusZen Agentic Resource Catalog",
    description:
        "Machine-discoverable agentic resources for CampusZen, the social network for Indian college students.",
    homepage: ORIGIN,
    resources: [
        {
            type: "mcp-server",
            name: "CampusZen MCP Server",
            url: `${ORIGIN}/.well-known/mcp`,
            description:
                "Model Context Protocol server exposing CampusZen's public product and documentation surfaces over Streamable HTTP.",
        },
        {
            type: "agent-card",
            name: "CampusZen A2A Agent Card",
            url: `${ORIGIN}/.well-known/agent-card.json`,
            description: "Agent-to-Agent capability card (A2A 0.2.6).",
        },
        {
            type: "agent-skills",
            name: "CampusZen Agent Skills",
            url: `${ORIGIN}/.well-known/agent-skills/index.json`,
            description: "Index of agent skills CampusZen exposes.",
        },
        {
            type: "openapi",
            name: "CampusZen OpenAPI",
            url: `${ORIGIN}/openapi.json`,
            description: "Full REST API description.",
        },
        {
            type: "llms-txt",
            name: "CampusZen llms.txt",
            url: `${ORIGIN}/llms.txt`,
            description: "Natural-language agent guidance.",
        },
        {
            type: "api-catalog",
            name: "CampusZen API Catalog (RFC 9727)",
            url: `${ORIGIN}/.well-known/api-catalog`,
            description: "RFC 9727 linkset of API descriptions.",
        },
        {
            type: "auth",
            name: "CampusZen Agent Auth Guide",
            url: `${ORIGIN}/auth.md`,
            description: "How agents obtain and use credentials.",
        },
    ],
};

const AGENT_SKILLS = {
    schemaVersion: "1.0",
    name: "CampusZen Agent Skills",
    homepage: ORIGIN,
    skills: [
        {
            name: "campuszen-community-explorer",
            description:
                "Discover, list, and summarize campus communities by name or college slug (e.g. bca, ignou, placement).",
            url: `${ORIGIN}/api/communities`,
            tags: ["communities", "discovery"],
        },
        {
            name: "campuszen-events-browser",
            description:
                "List upcoming or past campus events, optionally filtered by college.",
            url: `${ORIGIN}/api/events`,
            tags: ["events", "schedule"],
        },
        {
            name: "campuszen-leaderboard-reader",
            description:
                "Read public leaderboards of top contributors by reputation.",
            url: `${ORIGIN}/api/leaderboard`,
            tags: ["leaderboard", "reputation"],
        },
        {
            name: "campuszen-stats-reader",
            description: "Read platform statistics (users, posts, resources).",
            url: `${ORIGIN}/api/public/stats`,
            tags: ["stats", "metrics"],
        },
        {
            name: "campuszen-post-publisher",
            description:
                "Create and read feed posts within the authenticated user's campus feed.",
            url: `${ORIGIN}/api/posts/create`,
            tags: ["posts", "feed", "write"],
        },
    ],
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
    tools: [
        { name: "list_communities", description: "List or fetch a campus community by name." },
        { name: "get_public_stats", description: "Get platform user/post/resource counts." },
        { name: "list_events", description: "List upcoming or past campus events." },
        { name: "get_leaderboard", description: "Read the public reputation leaderboard." },
        { name: "create_post", description: "Create a feed post (authenticated)." },
        { name: "get_post", description: "Fetch a single post by id (authenticated)." },
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
        "Agent plugins for CampusZen: MCP server, agent skills, and A2A card for the Indian college student social network.",
    homepage: ORIGIN,
    author: { name: "CampusZen", url: ORIGIN },
    capabilities: {
        mcp: `${ORIGIN}/.well-known/mcp`,
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
        case "mcp":
            // Advertise the MCP endpoint per well-known discovery.
            return json(
                {
                    type: "mcp",
                    protocol: "streamable-http",
                    url: `${ORIGIN}/api/mcp`,
                    serverCard: `${ORIGIN}/.well-known/mcp/server-card.json`,
                },
                {
                    status: 200,
                    headers: {
                        Link: `<${ORIGIN}/api/mcp>; rel="service-desc"; type="application/json"`,
                    },
                },
            );
        default:
            return json({ error: "Not found", key }, { status: 404 });
    }
}

export const dynamic = "force-dynamic";
