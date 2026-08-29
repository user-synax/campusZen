import jwt from "jsonwebtoken";
import config from "../config.js";

/**
 * Socket.IO connection middleware. Verifies the short-lived handshake token
 * minted by the Next.js route /api/chat-socket-token. We do NOT read
 * campusx_token or the Appwrite cookie (they are httpOnly and will not cross
 * origins). The token is passed in socket.handshake.auth.token.
 */
export function socketAuth(socket, next) {
    try {
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "");
        if (!token || typeof token !== "string") {
            return next(new Error("unauthorized"));
        }
        const payload = jwt.verify(token, config.jwtSecret, {
            algorithms: ["HS256"],
        });
        if (!payload || !payload.userId) {
            return next(new Error("unauthorized"));
        }
        socket.userId = String(payload.userId);
        next();
    } catch (err) {
        next(new Error("unauthorized"));
    }
}
