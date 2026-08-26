import { NextResponse } from "next/server";

// Agent-friendly structured JSON responses.
// Shape: { error: { code, message, hint? } } for errors, raw data for success.

export function successResponse(data, status = 200) {
    return NextResponse.json(data, { status });
}

export function errorResponse(
    status,
    { code, message, hint } = {},
) {
    const body = {
        error: {
            code: code || "error",
            message: message || "An unexpected error occurred.",
        },
    };
    if (hint) body.error.hint = hint;
    return NextResponse.json(body, { status });
}
