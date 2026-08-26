import { NextResponse } from "next/server";
import { LLMS_TXT } from "@/lib/llms-txt";

export const dynamic = "force-static";

export function GET() {
    return new NextResponse(LLMS_TXT, {
        status: 200,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
        },
    });
}
