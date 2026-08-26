import { NextResponse } from "next/server";
import { getAuthMarkdown } from "@/lib/markdown-content";

export const dynamic = "force-dynamic";

export function GET() {
    return new NextResponse(getAuthMarkdown(), {
        status: 200,
        headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
        },
    });
}
