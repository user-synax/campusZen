// ━━━ Centralized Environment Configuration ━━━
// All environment variables should be accessed through this file
// Single source of truth — covers all 44 envs from .env.example.
// Fail-closed for critical secrets; warn for optional/feature flags.

const requiredEnvVars = [
    "MONGODB_URI",
    "JWT_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "APPWRITE_API_KEY",
];

// Groups where ANY one of the aliases satisfies the requirement (e.g. APPWRITE_ENDPOINT vs NEXT_PUBLIC_APPWRITE_ENDPOINT)
const requiredEnvGroups = [
    { names: ["APPWRITE_ENDPOINT", "NEXT_PUBLIC_APPWRITE_ENDPOINT"], label: "APPWRITE_ENDPOINT (or NEXT_PUBLIC_APPWRITE_ENDPOINT)" },
    { names: ["APPWRITE_PROJECT_ID", "NEXT_PUBLIC_APPWRITE_PROJECT_ID"], label: "APPWRITE_PROJECT_ID (or NEXT_PUBLIC_APPWRITE_PROJECT_ID)" },
    { names: ["CHAT_BACKEND_URL", "NEXT_PUBLIC_CHAT_BACKEND_URL"], label: "CHAT_BACKEND_URL (or NEXT_PUBLIC_CHAT_BACKEND_URL)" },
    { names: ["CHAT_BACKEND_SECRET", "NEXT_PUBLIC_CHAT_BACKEND_SECRET"], label: "CHAT_BACKEND_SECRET (or NEXT_PUBLIC_CHAT_BACKEND_SECRET)" },
];

const optionalEnvVars = [
    "JWT_EXPIRES_IN",
    "JWT_ABSOLUTE_EXPIRES_IN",
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_FOUNDER_USERNAME",
    "NEXT_PUBLIC_APP_LAUNCH_DATE",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "EMAIL_HOST",
    "EMAIL_PORT",
    "GMAIL_USER",
    "GMAIL_APP_PASS",
    "ADMIN_NOTIFY_EMAIL",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
    "NEXT_PUBLIC_LIVEKIT_URL",
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
    "VAPID_SUBJECT",
    "NEXT_PUBLIC_YT_API_KEY",
    "NEXT_PUBLIC_TLDRAW_LICENSE",
    "NEXT_PUBLIC_GIPHY_API_KEY",
    "NEXT_PUBLIC_APK_DOWNLOAD_URL",
    "NEXT_PUBLIC_CONTACT_DEVELOPER_URL",
    "NEXT_PUBLIC_ADMIN_EMAIL",
    "GOOGLE_REDIRECT_URI",
    "OPENROUTER_API_KEY",
    "CRON_SECRET",
    "NEXT_PUBLIC_APPWRITE_CLIPS_BUCKET_ID",
    "APPWRITE_DATABASE_ID",
    "NEXT_PUBLIC_APPWRITE_DATABASE_ID",
    "NEXT_PUBLIC_APPWRITE_USER_MEDIA_BUCKET_ID",
    "NEXT_PUBLIC_APPWRITE_RESOURCES_BUCKET_ID",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
];

// Fail closed at boot: missing required server secrets must never fall back to a
// constant (e.g. the string "undefined"), which would let anyone forge sessions.
export function validateEnv() {
    const missing = requiredEnvVars.filter((name) => !process.env[name]);
    const missingGroups = requiredEnvGroups.filter((g) => !g.names.some((n) => process.env[n])).map((g) => g.label);
    const allMissing = [...missing, ...missingGroups];
    if (allMissing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${allMissing.join(", ")}. ` +
                `Refusing to start with unvalidated secrets.`,
        );
    }
    // Warn for optional but important feature envs (only in production or when explicitly verbose)
    const missingOptional = optionalEnvVars.filter((name) => !process.env[name]);
    if (missingOptional.length > 0 && process.env.NODE_ENV === "production") {
        console.warn(
            `[config] Optional env not set (features may be disabled): ${missingOptional.join(", ")}`,
        );
    }
    return { missingOptional };
}

validateEnv();

const config = {
    // Database
    mongodb: {
        uri: process.env.MONGODB_URI,
    },

    // Authentication
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
        absoluteExpiresIn: process.env.JWT_ABSOLUTE_EXPIRES_IN || "30d",
    },

    // Web Push (VAPID)
    webpush: {
        subject: process.env.VAPID_SUBJECT || "mailto:user-synax@proton.me",
        publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "",
        privateKey: process.env.VAPID_PRIVATE_KEY || "",
    },

    // Realtime (Socket.IO chat backend on Render — single realtime layer)
    realtime: {
        emitUrl: process.env.CHAT_BACKEND_URL || process.env.NEXT_PUBLIC_CHAT_BACKEND_URL || "",
        secret: process.env.CHAT_BACKEND_SECRET || process.env.NEXT_PUBLIC_CHAT_BACKEND_SECRET || "",
    },

    // LiveKit (voice chat)
    livekit: {
        url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
        apiKey: process.env.LIVEKIT_API_KEY,
        apiSecret: process.env.LIVEKIT_API_SECRET,
    },

    // Storage — Appwrite only (no auth)
    appwrite: {
        endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT || "",
        projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || "",
        apiKey: process.env.APPWRITE_API_KEY || "",
        buckets: {
            clips: process.env.NEXT_PUBLIC_APPWRITE_CLIPS_BUCKET_ID || "",
            userMedia: process.env.NEXT_PUBLIC_APPWRITE_USER_MEDIA_BUCKET_ID || process.env.APPWRITE_USER_MEDIA_BUCKET_ID || "",
            resources: process.env.NEXT_PUBLIC_APPWRITE_RESOURCES_BUCKET_ID || process.env.APPWRITE_RESOURCES_BUCKET_ID || "",
        },
        databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || "",
    },

    // Cloudinary (legacy / fallback for some uploads)
    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
        apiKey: process.env.CLOUDINARY_API_KEY || "",
        apiSecret: process.env.CLOUDINARY_API_SECRET || "",
    },

    // Email — Resend (primary) + Gmail SMTP (legacy fallback for OTP)
    email: {
        apiKey: process.env.RESEND_API_KEY || "",
        from: process.env.RESEND_FROM_EMAIL || process.env.ADMIN_NOTIFY_EMAIL || "",
        gmail: {
            host: process.env.EMAIL_HOST || "smtp.gmail.com",
            port: process.env.EMAIL_PORT || "587",
            user: process.env.GMAIL_USER || "",
            pass: process.env.GMAIL_APP_PASS || "",
        },
    },

    // Admin
    admin: {
        notifyEmail: process.env.ADMIN_NOTIFY_EMAIL || "",
        adminEmail: process.env.NEXT_PUBLIC_ADMIN_EMAIL || "",
    },

    // App meta
    app: {
        url: process.env.NEXT_PUBLIC_APP_URL || "",
        founderUsername: process.env.NEXT_PUBLIC_FOUNDER_USERNAME || "",
        launchDate: process.env.NEXT_PUBLIC_APP_LAUNCH_DATE || "",
    },

    // App Links
    links: {
        apkDownload: process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL || "",
        contactDeveloper: process.env.NEXT_PUBLIC_CONTACT_DEVELOPER_URL || "",
    },

    // Google OAuth
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri:
            process.env.GOOGLE_REDIRECT_URI ||
            (process.env.NODE_ENV === "production"
                ? "https://" +
                  (process.env.VERCEL_URL || "yourdomain.com") +
                  "/api/auth/google/callback"
                : "http://localhost:3000/api/auth/google/callback"),
    },

    // Security / Cron
    cron: {
        secret: process.env.CRON_SECRET || "",
    },

    // Environment
    env: {
        node: process.env.NODE_ENV || "development",
        isDev: process.env.NODE_ENV !== "production",
        isProd: process.env.NODE_ENV === "production",
    },

    // AI
    ai: {
        openrouter: {
            apiKey: process.env.OPENROUTER_API_KEY || "",
            baseUrl: "https://openrouter.ai/api/v1",
            model: "nvidia/nemotron-3-ultra-550b-a55b",
        },
    },

    // Public feature flags
    features: {
        youtubeApiKey: process.env.NEXT_PUBLIC_YT_API_KEY || "",
        tldrawLicense: process.env.NEXT_PUBLIC_TLDRAW_LICENSE || "",
        giphyApiKey: process.env.NEXT_PUBLIC_GIPHY_API_KEY || "",
    },
};

// Export for testing / introspection — total validated env count should be 44+ (required + groups + optional)
export const __allValidatedEnvNames = [
    ...requiredEnvVars,
    ...requiredEnvGroups.flatMap((g) => g.names),
    ...optionalEnvVars,
];
export const __requiredEnvNames = requiredEnvVars;
export const __requiredEnvGroups = requiredEnvGroups;
export const __optionalEnvNames = optionalEnvVars;

export default config;
