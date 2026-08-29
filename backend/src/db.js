import mongoose from "mongoose";
import config from "./config.js";

let connecting = null;

export async function connectDB() {
    if (mongoose.connection.readyState === 1) return;
    if (connecting) return connecting;
    connecting = mongoose.connect(config.mongoUri, {
        // Reuse the same connection settings the Next app uses implicitly.
        maxPoolSize: 10,
    });
    await connecting;
    return;
}
