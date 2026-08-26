// Canonical OpenAPI 3.0 document for CampusZen. Kept free of Next.js imports so
// it can be unit-tested and reused by the /openapi.json route handler.

export const openapiSpec = {
    openapi: "3.0.3",
    info: {
        title: "CampusZen API",
        version: "1.0.0",
        description:
            "Public, machine-readable API description for CampusZen — the social network for Indian college students.\n\n" +
            "## Versioning policy\n" +
            "The API is versioned at v1. The current version is returned on every response via the `X-API-Version` header (value `1`). A future breaking version will be served under a `/v2/` URL prefix; existing `/v1` routes will continue to function.\n\n" +
            "## Deprecation policy\n" +
            "When an operation or field is deprecated, the API responds with a `Deprecation: true` header and, where a removal date is known, a `Sunset: <HTTP-date>` header plus a `Link: <url>; rel=\"deprecation\"` pointing to the migration note. Agents should watch for these headers and migrate before the sunset date.\n\n" +
            "## Authentication\n" +
            "Most endpoints require a session cookie (Appwrite `a_session_<projectId>` or the legacy `campusx_token`). Errors are structured JSON: `{ \"success\": false, \"error\": { \"code\": string, \"message\": string }, \"timestamp\": string }`.\n\n" +
            "## Sandbox / test mode\n" +
            "Agents can exercise the API without touching production data by sending the `X-CampusZen-Test-Mode: true` header (or `?sandbox=1`). Sandbox responses are tagged with an `X-Sandbox: true` header and use isolated, non-destructive sample data. This lets agents script interactions and dry-run calls safely.\n\n" +
            "## Error model\n" +
            "Every error response uses the `Error` schema (a machine-readable `code` plus a human-readable `message`). 4xx and 5xx responses are documented with this schema so agents can branch on `error.code` without parsing HTML. Rate limits return `429` with a `Retry-After` header; deprecations are announced with `Deprecation: true` and a `Sunset` header.",
        contact: {
            name: "CampusZen",
            url: "https://campuszen.tech",
            email: "hello@campuszen.tech",
        },
        license: { name: "Proprietary" },
    },
    externalDocs: {
        description: "CampusZen developer portal — versioning, auth, and agent guidance",
        url: "https://campuszen.tech/developers",
    },
    servers: [{ url: "https://campuszen.tech", description: "Production (v1)" }],
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
            oauth2: {
                type: "oauth2",
                description:
                    "OAuth 2.0 bearer token for agent integrations. See /.well-known/oauth-authorization-server and /auth.md.",
                flows: {
                    clientCredentials: {
                        tokenUrl: "https://campuszen.tech/api/agent/token",
                        scopes: {
                            "read:public": "Read public platform data (stats, events, leaderboard).",
                            "read:profile": "Read the authenticated user's profile.",
                            "read:communities": "Read community metadata.",
                            "write:posts": "Create and delete posts on behalf of the user.",
                            "write:communities": "Create communities on behalf of the user.",
                        },
                    },
                    authorizationCode: {
                        authorizationUrl: "https://campuszen.tech/api/agent/authorize",
                        tokenUrl: "https://campuszen.tech/api/agent/token",
                        scopes: {
                            "read:public": "Read public platform data (stats, events, leaderboard).",
                            "read:profile": "Read the authenticated user's profile.",
                            "read:communities": "Read community metadata.",
                            "write:posts": "Create and delete posts on behalf of the user.",
                            "write:communities": "Create communities on behalf of the user.",
                        },
                    },
                },
            },
        },
        parameters: {
            IdempotencyKey: {
                name: "Idempotency-Key",
                in: "header",
                required: false,
                description:
                    "Client-supplied unique key for safely retrying write requests without duplicating side effects (e.g. creating two posts). Agents should send a UUID per logical operation.",
                schema: { type: "string", format: "uuid" },
            },
        },
        schemas: {
            Error: {
                type: "object",
                required: ["success", "error"],
                properties: {
                    success: { type: "boolean", example: false },
                    error: {
                        type: "object",
                        required: ["code", "message"],
                        properties: {
                            code: { type: "string", example: "BAD_REQUEST" },
                            message: {
                                type: "string",
                                example: "Community name is required.",
                            },
                            details: { type: "array", items: { type: "object" } },
                        },
                    },
                    timestamp: { type: "string", format: "date-time" },
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
                    avatar: { type: "string" },
                },
            },
            Stats: {
                type: "object",
                properties: {
                    users: { type: "integer" },
                    posts: { type: "integer" },
                    resources: { type: "integer" },
                    communities: { type: "integer" },
                },
            },
            Health: {
                type: "object",
                properties: {
                    status: { type: "string", example: "healthy" },
                    timestamp: { type: "string", format: "date-time" },
                    responseTime: { type: "string" },
                    database: { type: "object" },
                    environment: { type: "string" },
                    version: { type: "string" },
                },
            },
            LeaderboardResponse: {
                type: "object",
                properties: {
                    leaderboard: { type: "array", items: { type: "object" } },
                    type: { type: "string" },
                    college: { type: ["string", "null"] },
                },
            },
            Event: {
                type: "object",
                properties: {
                    _id: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    college: { type: "string" },
                    location: { type: "string" },
                    eventDate: { type: "string", format: "date-time" },
                    capacity: { type: "integer" },
                    rsvpCount: { type: "integer" },
                    isFull: { type: "boolean" },
                    isPast: { type: "boolean" },
                },
            },
            EventList: {
                type: "object",
                properties: {
                    events: { type: "array", items: { $ref: "#/components/schemas/Event" } },
                    hasMore: { type: "boolean" },
                    total: { type: "integer" },
                },
            },
            ApiIndex: {
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
            AuthSuccess: {
                type: "object",
                properties: {
                    success: { type: "boolean" },
                    user: { $ref: "#/components/schemas/User" },
                    collegeAutoVerified: { type: "boolean" },
                    collegeName: { type: "string" },
                },
            },
            ResourceList: {
                type: "object",
                properties: {
                    resources: { type: "array", items: { type: "object" } },
                    hasMore: { type: "boolean" },
                },
            },
            AsyncJob: {
                type: "object",
                properties: {
                    jobId: { type: "string" },
                    status: { type: "string", enum: ["pending", "processing", "completed", "failed"] },
                    pollUrl: { type: "string", example: "https://campuszen.tech/api/jobs/abc123" },
                    result: { type: "object", nullable: true },
                    error: { type: "string", nullable: true },
                    createdAt: { type: "string", format: "date-time" },
                },
            },
            BatchRequest: {
                type: "object",
                required: ["operations"],
                properties: {
                    operations: {
                        type: "array",
                        items: {
                            type: "object",
                            required: ["method", "path"],
                            properties: {
                                method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
                                path: { type: "string", example: "/api/posts/create" },
                                body: { type: "object" },
                            },
                        },
                    },
                },
            },
            BatchResponse: {
                type: "object",
                properties: {
                    results: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                status: { type: "integer", example: 200 },
                                body: { type: "object" },
                                error: { type: "object" },
                            },
                        },
                    },
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
                            success: false,
                            error: {
                                code: "UNAUTHORIZED",
                                message: "You must be logged in.",
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
                            success: false,
                            error: { code: "NOT_FOUND", message: "Resource not found." },
                        },
                    },
                },
            },
            InternalServerError: {
                description: "Unexpected server error",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/Error" },
                        example: {
                            success: false,
                            error: { code: "INTERNAL_ERROR", message: "Something went wrong." },
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
                        headers: {
                            "X-API-Version": {
                                description: "Current API version (always \"1\" on this surface).",
                                schema: { type: "string", example: "1" },
                            },
                            "Deprecation": {
                                description:
                                    "Present with value `true` when this operation is deprecated. A `Sunset` header then carries the removal date and a `Link` header points to the migration note.",
                                schema: { type: "string", example: "true" },
                            },
                            "Sunset": {
                                description: "HTTP-date after which this operation may be removed.",
                                schema: { type: "string", format: "date-time" },
                            },
                        },
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiIndex" },
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
                    500: { $ref: "#/components/responses/InternalServerError" },
                },
            },
            post: {
                tags: ["Communities"],
                operationId: "createCommunity",
                summary: "Create a community (authenticated)",
                description:
                    "Requires an authenticated session. Creates a new interest community owned by the current user.",
                security: [{ sessionCookie: [] }, { oauth2: ["write:communities"] }],
                parameters: [{ $ref: "#/components/parameters/IdempotencyKey" }],
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
                    500: { $ref: "#/components/responses/InternalServerError" },
                },
            },
        },
        "/api/public/stats": {
            get: {
                tags: ["Public"],
                operationId: "getPublicStats",
                summary: "Public platform statistics",
                description: "Public counts of users, posts, resources, and communities.",
                security: [],
                responses: {
                    200: {
                        description: "Counts",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Stats" },
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
                description: "Liveness and dependency probe. Returns X-API-Version header.",
                security: [],
                responses: {
                    200: {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Health" },
                            },
                        },
                    },
                    503: { $ref: "#/components/responses/InternalServerError" },
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
                            "application/json": {
                                schema: { $ref: "#/components/schemas/AuthSuccess" },
                            },
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
                description: "Creates a new CampusZen account after OTP verification.",
                security: [],
                responses: {
                    201: {
                        description: "Created",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/AuthSuccess" },
                            },
                        },
                    },
                    400: { $ref: "#/components/responses/BadRequest" },
                },
            },
        },
        "/api/auth/send-otp": {
            post: {
                tags: ["Auth"],
                operationId: "sendOtp",
                summary: "Send an OTP for verification",
                description: "Sends a one-time password to the user's email for login or verification.",
                security: [],
                responses: {
                    200: {
                        description: "Sent",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean" },
                                        message: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                    400: { $ref: "#/components/responses/BadRequest" },
                    429: { $ref: "#/components/responses/BadRequest" },
                },
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
                    200: {
                        description: "Verified",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean" },
                                        verified: { type: "boolean" },
                                    },
                                },
                            },
                        },
                    },
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
                responses: {
                    200: {
                        description: "Logged out",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: { success: { type: "boolean" } },
                                },
                            },
                        },
                    },
                },
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
                security: [{ sessionCookie: [] }, { oauth2: ["write:posts"] }],
                parameters: [{ $ref: "#/components/parameters/IdempotencyKey" }],
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
                    401: { $ref: "#/components/responses/Unauthorized" },
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
                    200: {
                        description: "Deleted",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: { success: { type: "boolean" } },
                                },
                            },
                        },
                    },
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
                    200: {
                        description: "Updated",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: { success: { type: "boolean" } },
                                },
                            },
                        },
                    },
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
                    200: {
                        description: "Updated",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: { success: { type: "boolean" } },
                                },
                            },
                        },
                    },
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
                    200: {
                        description: "Resource list",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ResourceList" },
                            },
                        },
                    },
                    401: { $ref: "#/components/responses/Unauthorized" },
                },
            },
        },
        "/api/leaderboard": {
            get: {
                tags: ["Public"],
                operationId: "getLeaderboard",
                summary: "Leaderboard (public)",
                description: "Returns top contributors by reputation. Public; 'college' type requires login.",
                security: [],
                parameters: [
                    {
                        name: "type",
                        in: "query",
                        required: false,
                        schema: { type: "string", enum: ["global", "weekly", "college"], default: "global" },
                    },
                    {
                        name: "limit",
                        in: "query",
                        required: false,
                        schema: { type: "integer", default: 20 },
                    },
                ],
                responses: {
                    200: {
                        description: "Leaderboard entries",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/LeaderboardResponse" },
                            },
                        },
                    },
                    400: { $ref: "#/components/responses/BadRequest" },
                },
            },
        },
        "/api/events": {
            get: {
                tags: ["Public"],
                operationId: "listEvents",
                summary: "List events (public)",
                description: "Returns upcoming or past campus events, optionally filtered by college.",
                security: [],
                parameters: [
                    {
                        name: "college",
                        in: "query",
                        required: false,
                        schema: { type: "string" },
                    },
                    {
                        name: "filter",
                        in: "query",
                        required: false,
                        schema: { type: "string", enum: ["upcoming", "past"], default: "upcoming" },
                    },
                    {
                        name: "page",
                        in: "query",
                        required: false,
                        schema: { type: "integer", default: 1 },
                    },
                    {
                        name: "limit",
                        in: "query",
                        required: false,
                        schema: { type: "integer", maximum: 50, default: 10 },
                    },
                ],
                responses: {
                    200: {
                        description: "Events",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/EventList" },
                            },
                        },
                    },
                },
            },
            post: {
                tags: ["Public"],
                operationId: "createEvent",
                summary: "Create an event (authenticated)",
                description: "Creates a new campus event. Requires an authenticated session. Long-running imports return 202 Accepted with a job reference to poll at GET /api/jobs/{jobId}.",
                security: [{ sessionCookie: [] }],
                parameters: [{ $ref: "#/components/parameters/IdempotencyKey" }],
                responses: {
                    201: {
                        description: "Created event",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Event" },
                            },
                        },
                    },
                    202: {
                        description: "Accepted — event import is processing; poll the returned job.",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/AsyncJob" },
                            },
                        },
                    },
                    400: { $ref: "#/components/responses/BadRequest" },
                    401: { $ref: "#/components/responses/Unauthorized" },
                },
            },
        },
        "/api/jobs/{jobId}": {
            get: {
                tags: ["Meta"],
                operationId: "getJobStatus",
                summary: "Poll an async job's status",
                description: "Returns the status and result of a long-running operation (e.g. a bulk event import) that previously returned 202 Accepted.",
                security: [{ sessionCookie: [] }],
                parameters: [
                    {
                        name: "jobId",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                    },
                ],
                responses: {
                    200: {
                        description: "Job status",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/AsyncJob" },
                            },
                        },
                    },
                    404: { $ref: "#/components/responses/NotFound" },
                },
            },
        },
        "/api/batch": {
            post: {
                tags: ["Meta"],
                operationId: "batchOperations",
                summary: "Execute multiple operations in one request",
                description: "Accepts an array of operations and executes them in order within a single request, reducing per-call overhead for agents acting on many items. Each operation mirrors a real endpoint and supports Idempotency-Key.",
                security: [{ sessionCookie: [] }],
                parameters: [{ $ref: "#/components/parameters/IdempotencyKey" }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/BatchRequest" },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Batch results (one entry per operation, in order)",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/BatchResponse" },
                            },
                        },
                    },
                    400: { $ref: "#/components/responses/BadRequest" },
                    401: { $ref: "#/components/responses/Unauthorized" },
                },
            },
        },
    },
};
