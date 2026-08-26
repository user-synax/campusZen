import { NextResponse } from "next/server";

const ORIGIN = "https://campuszen.tech";
const PRM = `${ORIGIN}/.well-known/oauth-protected-resource`;

// Primary auth challenge endpoint. Returns a 401 with a spec-shaped
// WWW-Authenticate header so an agent learns the auth requirements from a
// single response instead of hunting for the well-known document.
export function GET() {
    return new NextResponse(
        JSON.stringify({
            success: false,
            error: {
                code: "UNAUTHORIZED",
                message:
                    "Authentication required. See https://campuszen.tech/auth.md for agent credentials.",
            },
            timestamp: new Date().toISOString(),
        }),
        {
            status: 401,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "WWW-Authenticate": `Bearer resource_metadata="${PRM}"`,
                "Cache-Control": "no-store",
            },
        },
    );
}

export const dynamic = "force-dynamic";
