import http from "http";
import express from "express";
import { Server } from "socket.io";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";

import config from "./config.js";
import { connectDB } from "./db.js";
import { socketAuth } from "./middleware/socketAuth.js";
import { registerSocket } from "./socket/index.js";
import historyRouter from "./routes/history.js";

async function main() {
    await connectDB();

    const app = express();
    app.set("trust proxy", 1);

    app.use(helmet());
    app.use(
        cors({
            origin: [config.clientOrigin, config.devOrigin],
            credentials: true,
        }),
    );
    app.use(express.json());
    app.use(cookieParser());

    app.get("/health", (_req, res) => res.json({ ok: true }));
    app.use("/", historyRouter);

    const server = http.createServer(app);

    // Allow configured origins plus localhost variants (dev). In non-production
    // we reflect any origin so local debugging (127.0.0.1 vs localhost) works.
    const allowedOrigins = new Set([
        config.clientOrigin,
        config.devOrigin,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]);
    const io = new Server(server, {
        cors: {
            origin: (origin, cb) => {
                if (!origin) return cb(null, true);
                if (allowedOrigins.has(origin)) return cb(null, true);
                if (process.env.NODE_ENV !== "production") return cb(null, true);
                cb(null, true);
            },
            credentials: true,
            methods: ["GET", "POST"],
        },
    });

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
