import { NextResponse } from "next/server";

const openapi = {
    openapi: "3.0.3",
    info: {
        title: "CampusZen API",
        version: "1.0.0",
        description:
            "Public, machine-readable API description for CampusZen (campus social network for Indian college students). Most product endpoints require an authenticated session (Appwrite session cookie or legacy campusx_token). Error responses are structured JSON.",
        contact: {
            name: "CampusZen",
            url: "https://campuszen.tech",
        },
        license: { name: "Proprietary" },
    },
    servers: [{ url: "https://campuszen.tech", description: "Production" }],
    tags: [
        { name: "Communities", description: "College/interest communities" },
        { name: "Auth", description: "Authentication (OTP + password)" },
        { name: "Posts", description: "Feed posts and interactions" },
        { name: "Users", description: "User profiles and settings" },
        { name: "Resources", description: "Study resources" },
        { name: "Public", description: "Public, unauthenticated endpoints" },
    ],
    components: {
        securitySchemes: {
            sessionCookie: {
                type: "apiKey",
                in: "cookie",
                name: "a_session",
                description:
                    "Appwrite session cookie (a_session_<projectId>) or legacy campusx_token cookie.",
            },
        },
        schemas: {
            Error: {
                type: "object",
                required: ["error"],
                properties: {
                    error: {
                        type: "object",
                        required: ["code", "message"],
                        properties: {
                            code: { type: "string", example: "validation_error" },
                            message: {
                                type: "string",
                                example: "Community name is required.",
                            },
                            hint: {
                                type: "string",
                                example: "Provide a 'name' field in the request body.",
                            },
                        },
                    },
                },
            },
            Community: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    slug: { type: "string" },
                    emoji: { type: "string" },
                    description: { type: "string" },
                    type: { type: "string" },
                    postCount: { type: "integer" },
                    memberCount: { type: "integer" },
                },
            },
            Post: {
                type: "object",
                properties: {
                    _id: { type: "string" },
                    content: { type: "string" },
                    community: { type: "string" },
                    author: { type: "object" },
                    likes: { type: "integer" },
                    createdAt: { type: "string", format: "date-time" },
                },
            },
            User: {
                type: "object",
                properties: {
                    _id: { type: "string" },
                    username: { type: "string" },
                    name: { type: "string" },
                    college: { type: "string" },
                    isPro: { type: "boolean" },
                },
            },
        },
        responses: {
            Unauthorized: {
                description: "Authentication required",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/Error" },
                        example: {
                            error: {
                                code: "unauthorized",
                                message: "You must be logged in.",
                                hint: "Authenticate via /api/auth/login first.",
                            },
                        },
                    },
                },
            },
            BadRequest: {
                description: "Validation error",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/Error" },
                    },
                },
            },
            NotFound: {
                description: "Resource not found",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/Error" },
                        example: {
                            error: { code: "not_found", message: "Resource not found." },
                        },
                    },
                },
            },
        },
    },
    paths: {
        "/api/communities": {
            get: {
                tags: ["Communities"],
                summary: "List communities or fetch a single community by name",
                security: [],
                parameters: [
                    {
                        name: "name",
                        in: "query",
                        required: false,
                        schema: { type: "string" },
                        description: "Community name; if omitted returns all communities.",
                    },
                    {
                        name: "limit",
                        in: "query",
                        required: false,
                        schema: { type: "integer", maximum: 50, default: 50 },
                    },
                ],
                responses: {
                    200: {
                        description: "Community or list of communities",
                        content: {
                            "application/json": {
                                schema: {
                                    oneOf: [
                                        { $ref: "#/components/schemas/Community" },
                                        {
                                            type: "array",
                                            items: { $ref: "#/components/schemas/Community" },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                    500: { $ref: "#/components/responses/NotFound" },
                },
            },
            post: {
                tags: ["Communities"],
                summary: "Create a community (authenticated)",
                security: [{ sessionCookie: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    emoji: { type: "string" },
                                    description: { type: "string" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Created community",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Community" },
                            },
                        },
                    },
                    400: { $ref: "#/components/responses/BadRequest" },
                    401: { $ref: "#/components/responses/Unauthorized" },
                },
            },
        },
        "/api/public/stats": {
            get: {
                tags: ["Public"],
                summary: "Public platform statistics",
                security: [],
                responses: {
                    200: {
                        description: "Counts",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        users: { type: "integer" },
                                        posts: { type: "integer" },
                                        resources: { type: "integer" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        "/api/health": {
            get: {
                tags: ["Public"],
                summary: "Health check",
                security: [],
                responses: {
                    200: {
                        description: "OK",
                        content: {
                            "application/json": { schema: { type: "object" } },
                        },
                    },
                },
            },
        },
        "/api/auth/login": {
            post: {
                tags: ["Auth"],
                summary: "Log in with email/phone + password or OTP",
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    identifier: { type: "string" },
                                    password: { type: "string" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Authenticated",
                        content: {
                            "application/json": { schema: { $ref: "#/components/schemas/User" } },
                        },
                    },
                    401: { $ref: "#/components/responses/Unauthorized" },
                },
            },
        },
        "/api/auth/signup": {
            post: {
                tags: ["Auth"],
                summary: "Register a new account",
                security: [],
                responses: {
                    200: { description: "Created" },
                    400: { $ref: "#/components/responses/BadRequest" },
                },
            },
        },
        "/api/auth/send-otp": {
            post: {
                tags: ["Auth"],
                summary: "Send an OTP for verification",
                security: [],
                responses: { 200: { description: "Sent" } },
            },
        },
        "/api/auth/verify-otp": {
            post: {
                tags: ["Auth"],
                summary: "Verify an OTP",
                security: [],
                responses: {
                    200: { description: "Verified" },
                    400: { $ref: "#/components/responses/BadRequest" },
                },
            },
        },
        "/api/auth/logout": {
            post: {
                tags: ["Auth"],
                summary: "Log out (clears session)",
                security: [{ sessionCookie: [] }],
                responses: { 200: { description: "Logged out" } },
            },
        },
        "/api/posts/cursor-feed": {
            get: {
                tags: ["Posts"],
                summary: "Cursor-paginated feed (authenticated)",
                security: [{ sessionCookie: [] }],
                parameters: [
                    { name: "cursor", in: "query", schema: { type: "string" } },
                    { name: "community", in: "query", schema: { type: "string" } },
                ],
                responses: {
                    200: {
                        description: "Feed page",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        posts: { type: "array", items: { $ref: "#/components/schemas/Post" } },
                                        nextCursor: { type: "string", nullable: true },
                                    },
                                },
                            },
                        },
                    },
                    401: { $ref: "#/components/responses/Unauthorized" },
                },
            },
        },
        "/api/posts/create": {
            post: {
                tags: ["Posts"],
                summary: "Create a post (authenticated)",
                security: [{ sessionCookie: [] }],
                responses: {
                    200: {
                        description: "Created post",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/Post" } } },
                    },
                    401: { $ref: "#/components/responses/Unauthorized" },
                },
            },
        },
        "/api/posts/[postId]": {
            get: {
                tags: ["Posts"],
                summary: "Get a post (authenticated)",
                security: [{ sessionCookie: [] }],
                parameters: [{ name: "postId", in: "path", required: true, schema: { type: "string" } }],
                responses: {
                    200: {
                        description: "Post",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/Post" } } },
                    },
                    404: { $ref: "#/components/responses/NotFound" },
                },
            },
            delete: {
                tags: ["Posts"],
                summary: "Delete a post (authenticated owner/admin)",
                security: [{ sessionCookie: [] }],
                parameters: [{ name: "postId", in: "path", required: true, schema: { type: "string" } }],
                responses: {
                    200: { description: "Deleted" },
                    401: { $ref: "#/components/responses/Unauthorized" },
                    404: { $ref: "#/components/responses/NotFound" },
                },
            },
        },
        "/api/posts/like": {
            post: {
                tags: ["Posts"],
                summary: "Like/unlike a post (authenticated)",
                security: [{ sessionCookie: [] }],
                responses: {
                    200: { description: "Updated" },
                    401: { $ref: "#/components/responses/Unauthorized" },
                },
            },
        },
        "/api/users/me": {
            get: {
                tags: ["Users"],
                summary: "Current authenticated user",
                security: [{ sessionCookie: [] }],
                responses: {
                    200: {
                        description: "User",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
                    },
                    401: { $ref: "#/components/responses/Unauthorized" },
                },
            },
        },
        "/api/users/settings": {
            patch: {
                tags: ["Users"],
                summary: "Update user settings (authenticated)",
                security: [{ sessionCookie: [] }],
                responses: {
                    200: { description: "Updated" },
                    401: { $ref: "#/components/responses/Unauthorized" },
                },
            },
        },
        "/api/resources/browse": {
            get: {
                tags: ["Resources"],
                summary: "Browse approved study resources (authenticated)",
                security: [{ sessionCookie: [] }],
                responses: {
                    200: { description: "Resource list" },
                    401: { $ref: "#/components/responses/Unauthorized" },
                },
            },
        },
        "/api/leaderboard": {
            get: {
                tags: ["Public"],
                summary: "Leaderboard (public)",
                security: [],
                responses: { 200: { description: "Leaderboard entries" } },
            },
        },
        "/api/events": {
            get: {
                tags: ["Public"],
                summary: "List events (public)",
                security: [],
                responses: { 200: { description: "Events" } },
            },
        },
    },
};

export const dynamic = "force-static";

export function GET() {
    return NextResponse.json(openapi, {
        status: 200,
        headers: { "Cache-Control": "public, max-age=3600" },
    });
}
