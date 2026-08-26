// Canonical OpenAPI 3.0 document for CampusZen. Kept free of Next.js imports so
// it can be unit-tested and reused by the /openapi.json route handler.

export const openapiSpec = {
    openapi: "3.0.3",
    info: {
        title: "CampusZen API",
        version: "1.0.0",
        description:
            "Public, machine-readable API description for CampusZen — the social network for Indian college students. Most product endpoints require an authenticated session (Appwrite session cookie or legacy campusx_token). Error responses are structured JSON: { error: { code, message, hint? } }.",
        contact: {
            name: "CampusZen",
            url: "https://campuszen.tech",
            email: "hello@campuszen.tech",
        },
        license: { name: "Proprietary" },
    },
    servers: [{ url: "https://campuszen.tech", description: "Production" }],
    tags: [
        { name: "Meta", description: "API discovery and health" },
        { name: "Communities", description: "College and interest communities" },
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
        "/api": {
            get: {
                tags: ["Meta"],
                operationId: "getApiIndex",
                summary: "API discovery index",
                description:
                    "Returns a machine-readable index of the CampusZen public API surface, including links to the OpenAPI document, developer portal, and llms.txt.",
                security: [],
                responses: {
                    200: {
                        description: "API index",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" },
                                        version: { type: "string" },
                                        openapi: { type: "string" },
                                        developerPortal: { type: "string" },
                                        llmsTxt: { type: "string" },
                                        publicEndpoints: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    method: { type: "string" },
                                                    path: { type: "string" },
                                                    description: { type: "string" },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        "/api/communities": {
            get: {
                tags: ["Communities"],
                operationId: "listCommunities",
                summary: "List communities or fetch one by name",
                description:
                    "Public endpoint. When 'name' is supplied, returns a single community object (or zeros if not found). When omitted, returns the list of communities sorted by post count.",
                security: [],
                parameters: [
                    {
                        name: "name",
                        in: "query",
                        required: false,
                        description: "Community name; if omitted returns all communities.",
                        schema: { type: "string" },
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
                operationId: "createCommunity",
                summary: "Create a community (authenticated)",
                description:
                    "Requires an authenticated session. Creates a new interest community owned by the current user.",
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
                operationId: "getPublicStats",
                summary: "Public platform statistics",
                description: "Public counts of users, posts, and approved resources.",
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
                tags: ["Meta"],
                operationId: "getHealth",
                summary: "Health check",
                description: "Lightweight liveness probe.",
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
                operationId: "loginUser",
                summary: "Log in with identifier + password",
                description:
                    "Authenticates a user with email/phone and password (or OTP) and sets a session cookie. Returns the sanitized user object on success.",
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
                operationId: "signupUser",
                summary: "Register a new account",
                description: "Creates a new CampusZen account.",
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
                operationId: "sendOtp",
                summary: "Send an OTP for verification",
                description: "Sends a one-time password to the user's email/phone for login or verification.",
                security: [],
                responses: { 200: { description: "Sent" } },
            },
        },
        "/api/auth/verify-otp": {
            post: {
                tags: ["Auth"],
                operationId: "verifyOtp",
                summary: "Verify an OTP",
                description: "Verifies a one-time password and completes the flow.",
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
                operationId: "logoutUser",
                summary: "Log out",
                description: "Clears the session cookie.",
                security: [{ sessionCookie: [] }],
                responses: { 200: { description: "Logged out" } },
            },
        },
        "/api/posts/cursor-feed": {
            get: {
                tags: ["Posts"],
                operationId: "getCursorFeed",
                summary: "Cursor-paginated feed (authenticated)",
                description: "Returns a page of feed posts using cursor-based pagination.",
                security: [{ sessionCookie: [] }],
                parameters: [
                    {
                        name: "cursor",
                        in: "query",
                        required: false,
                        schema: { type: "string" },
                        description: "Opaque cursor from a previous response.",
                    },
                    {
                        name: "community",
                        in: "query",
                        required: false,
                        schema: { type: "string" },
                        description: "Filter by community name.",
                    },
                ],
                responses: {
                    200: {
                        description: "Feed page",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        posts: {
                                            type: "array",
                                            items: { $ref: "#/components/schemas/Post" },
                                        },
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
                operationId: "createPost",
                summary: "Create a post (authenticated)",
                description: "Publishes a new post, optionally within a community.",
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
        "/api/posts/{postId}": {
            get: {
                tags: ["Posts"],
                operationId: "getPost",
                summary: "Get a post (authenticated)",
                description: "Returns a single post by id.",
                security: [{ sessionCookie: [] }],
                parameters: [
                    {
                        name: "postId",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                    },
                ],
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
                operationId: "deletePost",
                summary: "Delete a post (authenticated owner/admin)",
                description: "Deletes a post owned by the current user or an admin.",
                security: [{ sessionCookie: [] }],
                parameters: [
                    {
                        name: "postId",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                    },
                ],
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
                operationId: "likePost",
                summary: "Like or unlike a post (authenticated)",
                description: "Toggles the current user's like on a post.",
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
                operationId: "getCurrentUser",
                summary: "Current authenticated user",
                description: "Returns the user object for the active session.",
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
                operationId: "updateUserSettings",
                summary: "Update user settings (authenticated)",
                description: "Patches mutable user settings for the active session.",
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
                operationId: "browseResources",
                summary: "Browse approved study resources (authenticated)",
                description: "Returns a list of approved study resources.",
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
                operationId: "getLeaderboard",
                summary: "Leaderboard (public)",
                description: "Returns top contributors by reputation.",
                security: [],
                responses: { 200: { description: "Leaderboard entries" } },
            },
        },
        "/api/events": {
            get: {
                tags: ["Public"],
                operationId: "listEvents",
                summary: "List events (public)",
                description: "Returns upcoming campus events.",
                security: [],
                responses: { 200: { description: "Events" } },
            },
        },
    },
};
