import jwt from "jsonwebtoken";
import config from "../config.js";

/**
 * Express middleware protecting the REST history endpoints. The browser cannot
 * send the httpOnly cookie cross-origin, so the Next.js history proxy mints a
 * same-secret JWT and passes it as a Bearer token. Same verification as the
 * socket handshake.
 */
export function httpAuth(req, res, next) {
    try {
        const header = req.headers.authorization || "";
        const token = header.startsWith("Bearer ")
            ? header.slice(7)
            : req.query.token;
        if (!token) return res.status(401).json({ error: "Unauthorized" });
        const payload = jwt.verify(token, config.jwtSecret, {
            algorithms: ["HS256"],
        });
        if (!payload || !payload.userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        req.userId = String(payload.userId);
        next();
    } catch (err) {
        return res.status(401).json({ error: "Unauthorized" });
    }
}
