import http from "http";
import express from "express";
import mongoose from "mongoose";
import { Server } from "socket.io";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";

import config from "./config.js";
import { connectDB } from "./db.js";
import { setIo } from "./io.js";
import { socketAuth } from "./middleware/socketAuth.js";
import { registerSocket } from "./socket/index.js";
import historyRouter from "./routes/history.js";
import conversationsRouter from "./routes/conversations.js";
import groupsRouter from "./routes/groups.js";
import emitRouter from "./lib/emit.js";

async function main() {
    await connectDB();

    const app = express();
    app.set("trust proxy", 1);

    app.use(helmet());

    // CORS for HTTP routes — include extraOrigins so previews/variants work.
    const httpOrigins = [
        config.clientOrigin,
        config.devOrigin,
        ...config.extraOrigins,
    ];
    app.use(
        cors({
            origin: httpOrigins,
            credentials: true,
        }),
    );
    app.use(express.json({ limit: "256kb" }));
    app.use(cookieParser());

    // ━━━ Health check: verifies Mongo connectivity + basic uptime ━━━
    app.get("/health", async (_req, res) => {
        const checks = {
            ok: true,
            uptime: process.uptime(),
            mongo: "disconnected",
        };
        try {
            const state = mongoose.connection.readyState;
            // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
            if (state === 1) {
                // Run a quick ping to confirm the connection is alive
                await mongoose.connection.db.admin().ping();
                checks.mongo = "ok";
            } else {
                checks.mongo = ["disconnected", "connecting", "disconnecting"][state] || `state=${state}`;
                checks.ok = false;
            }
        } catch (err) {
            checks.mongo = `error: ${err.message}`;
            checks.ok = false;
        }
        const statusCode = checks.ok ? 200 : 503;
        res.status(statusCode).json(checks);
    });

    app.use("/", historyRouter);
    app.use("/", conversationsRouter);
    app.use("/", groupsRouter);

    // Internal realtime emit API — the single realtime layer.
    app.use("/api/emit", emitRouter);

    const server = http.createServer(app);

    // ━━━ Socket.IO: strict CORS allowlist (same set as HTTP routes) ━━━
    const allowedOrigins = new Set([
        config.clientOrigin,
        config.devOrigin,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        ...config.extraOrigins,
    ]);

    const io = new Server(server, {
        cors: {
            origin: (origin, cb) => {
                // No Origin header → non-browser client (curl, health checks):
                // harmless, the socket handshake is still JWT-authenticated.
                if (!origin) return cb(null, true);
                if (allowedOrigins.has(origin)) return cb(null, true);
                // Unknown origin → reject. Handshake will fail for that client.
                cb(new Error("Origin not allowed"), false);
            },
            credentials: true,
            methods: ["GET", "POST"],
        },
        // Websocket-only: disable HTTP long-polling fallback.
        // All clients must support WS (which every modern browser does).
        transports: ["websocket"],
        // Reject connections that take too long to authenticate.
        connectTimeout: 10_000,
        // Close idle sockets after 5 minutes of inactivity.
        pingInterval: 25_000,
        pingTimeout: 10_000,
    });

    setIo(io);

    io.use(socketAuth);
    registerSocket(io);

    server.listen(config.port, () => {
        console.log(`[chat-backend] listening on :${config.port}`);
    });
}

main().catch((err) => {
    console.error("[chat-backend] failed to start:", err);
    process.exit(1);
});
