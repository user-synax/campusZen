import Link from "next/link";

export const metadata = {
    title: "CampusZen Developer Resources",
    description:
        "API docs, OpenAPI spec, and agent integration guidance for CampusZen — the social network for Indian college students.",
};

export default function DevelopersPage() {
    return (
        <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0]">
            <div className="mx-auto max-w-3xl px-6 py-16">
                <h1 className="text-4xl font-black tracking-tight">
                    CampusZen Developer Resources
                </h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    CampusZen exposes a small public REST API plus an OpenAPI
                    document so agents and developers can integrate
                    programmatically with the student social network.
                </p>

                <h2 className="mt-10 text-2xl font-bold">API & specs</h2>
                <ul className="mt-4 space-y-2 text-base">
                    <li>
                        <Link
                            href="/openapi.json"
                            className="text-primary underline-offset-4 hover:underline"
                        >
                            OpenAPI spec (/openapi.json)
                        </Link>{" "}
                        — full, machine-readable API description.
                    </li>
                    <li>
                        <Link
                            href="/api"
                            className="text-primary underline-offset-4 hover:underline"
                        >
                            API index (/api)
                        </Link>{" "}
                        — JSON list of public endpoints.
                    </li>
                    <li>
                        <Link
                            href="/llms.txt"
                            className="text-primary underline-offset-4 hover:underline"
                        >
                            llms.txt (/llms.txt)
                        </Link>{" "}
                        — agent when-to-use guidance.
                    </li>
                </ul>

                <h2 className="mt-10 text-2xl font-bold">Authentication</h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                    Most endpoints require a session cookie (Appwrite{" "}
                    <code className="rounded bg-white/10 px-1">
                        a_session_&lt;projectId&gt;
                    </code>{" "}
                    or the legacy <code className="rounded bg-white/10 px-1">campusx_token</code>
                    ). Log in with <code className="rounded bg-white/10 px-1">POST /api/auth/login</code>{" "}
                    (identifier + password). OTP flow:{" "}
                    <code className="rounded bg-white/10 px-1">POST /api/auth/send-otp</code> then{" "}
                    <code className="rounded bg-white/10 px-1">POST /api/auth/verify-otp</code>.
                </p>

                <h2 className="mt-10 text-2xl font-bold">Public endpoints (no auth)</h2>
                <ul className="mt-4 space-y-2 text-base">
                    <li>
                        <code className="rounded bg-white/10 px-1">GET /api/communities</code> —
                        list communities or fetch one by <code>name</code>.
                    </li>
                    <li>
                        <code className="rounded bg-white/10 px-1">GET /api/public/stats</code> —
                        platform counts.
                    </li>
                    <li>
                        <code className="rounded bg-white/10 px-1">GET /api/health</code> —
                        liveness probe.
                    </li>
                    <li>
                        <code className="rounded bg-white/10 px-1">GET /api/leaderboard</code> —
                        top contributors.
                    </li>
                    <li>
                        <code className="rounded bg-white/10 px-1">GET /api/events</code> —
                        upcoming events.
                    </li>
                </ul>

                <h2 className="mt-10 text-2xl font-bold">Error format</h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                    All errors are structured JSON:
                </p>
                <pre className="mt-3 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-4 text-sm">
{`{
  "error": {
    "code": "validation_error",
    "message": "Community name is required.",
    "hint": "Provide a 'name' field in the request body."
  }
}`}
                </pre>

                <p className="mt-10 text-sm text-muted-foreground">
                    Back to{" "}
                    <Link href="/" className="text-primary underline-offset-4 hover:underline">
                        CampusZen home
                    </Link>
                    .
                </p>
            </div>
        </div>
    );
}
