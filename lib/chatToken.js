import { SignJWT } from "jose";
import config from "./config";

/**
 * Mint a short-lived (60s) JWT for the chat backend. Signed with the SAME
 * HS256 secret as campusx_token, so the Express backend can verify it with
 * jsonwebtoken using JWT_SECRET. Used for both the Socket.IO handshake and the
 * REST history proxy.
 */
export async function mintChatToken(userId) {
    const secret = new TextEncoder().encode(config.jwt.secret);
    return new SignJWT({ userId: String(userId), scope: "chat" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("60s")
        .sign(secret);
}
