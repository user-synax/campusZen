import { NextResponse } from "next/server";
import { openapiSpec } from "@/lib/openapi-spec";

export const dynamic = "force-static";

export function GET() {
    return NextResponse.json(openapiSpec, {
        status: 200,
        headers: { "Cache-Control": "public, max-age=3600" },
    });
}
