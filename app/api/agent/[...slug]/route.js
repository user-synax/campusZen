import { NextResponse } from "next/server";

const ORIGIN = "https://campuszen.tech";
const PRM = `${ORIGIN}/.well-known/oauth-protected-resource`;

// Lightweight, honest agent-auth endpoints. These exist so discovery URIs
// advertised in the OAuth/agent_auth metadata resolve (no 404) and so an
// unauthenticated probe of the API gets a spec-shaped WWW-Authenticate hint.
// Full credential issuance is documented in /auth.md.

export function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}

export async function POST(request, { params }) {
    const { slug } = await params;
    const key = slug.join("/");

    if (key === "auth") {
        // Primary API entry point returns a 401 with a spec-shaped hint.
        return new NextResponse(
            JSON.stringify({
                success: false,
                error: {
                    code: "UNAUTHORIZED",
                    message:
                        "Authentication required. See https://campuszen.tech/auth.md",
                },
            }),
            {
                status: 401,
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "WWW-Authenticate": `Bearer resource_metadata="${PRM}"`,
                },
            },
        );
    }

    const guidance = {
        "register": {
            description:
                "Register an agent credential. CampusZen issues session-based API access; see /auth.md.",
            next: "POST /api/auth/login with identifier + password to obtain a session cookie.",
        },
        "authorize": {
            description:
                "Begin an authorization flow. CampusZen uses session-cookie and OAuth2 bearer auth; see /auth.md.",
            next: "Use POST /api/auth/login or the OAuth2 token endpoint.",
        },
        "token": {
            description:
                "Exchange credentials for a session. CampusZen returns a session cookie (a_session_<projectId> or campusx_token).",
            next: "Send the session cookie on subsequent requests.",
        },
        "claim": {
            description:
                "Claim an issued credential. See /auth.md identity_assertion flow.",
            next: "Provide an id-jag assertion as documented in /auth.md.",
        },
        "revoke": {
            description: "Revoke an agent credential or session.",
            next: "Call POST /api/auth/logout to clear the session cookie.",
        },
    };

    const body = guidance[key] || {
        description: "CampusZen agent-auth endpoint.",
        documentation: `${ORIGIN}/auth.md`,
    };

    return NextResponse.json(
        { success: true, endpoint: key, ...body },
        { headers: { "Cache-Control": "no-store" } },
    );
}

export async function GET(request, { params }) {
    return POST(request, { params });
}

export const dynamic = "force-dynamic";
