"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    createAppwriteClient,
    getAppwriteAccount,
} from "@/lib/appwrite/client";

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState("Processing Google Sign-In...");

    useEffect(() => {
        const completeSignIn = async () => {
            try {
                console.log("[Auth Callback] Processing Appwrite OAuth callback...");
                setStatus("Checking Appwrite session...");

                // Extract params from searchParams or window.location
                const userIdParam =
                    searchParams.get("userId") ||
                    searchParams.get("user_id") ||
                    (typeof window !== "undefined"
                        ? new URLSearchParams(window.location.search).get("userId") ||
                        new URLSearchParams(window.location.search).get("user_id")
                        : null);

                const secretParam =
                    searchParams.get("secret") ||
                    searchParams.get("key") ||
                    (typeof window !== "undefined"
                        ? new URLSearchParams(window.location.search).get("secret") ||
                        new URLSearchParams(window.location.search).get("key")
                        : null);

                console.log("[Auth Callback] Parameters detected:", {
                    userIdParam,
                    hasSecret: !!secretParam,
                });

                const client = createAppwriteClient();
                const account = getAppwriteAccount(client);

                // Attempt to create session using Appwrite SDK if secret & userId exist
                if (userIdParam && secretParam) {
                    try {
                        console.log("[Auth Callback] Establishing Appwrite session...");
                        await account.createSession(userIdParam, secretParam);
                    } catch (sErr) {
                        console.warn(
                            "[Auth Callback] createSession warning:",
                            sErr?.message || sErr,
                        );
                    }
                }

                // Attempt to retrieve user object from Appwrite Client SDK
                let appwriteUser = null;
                try {
                    appwriteUser = await account.get();
                    console.log(
                        "[Auth Callback] Appwrite user retrieved from Client SDK:",
                        appwriteUser?.$id,
                    );
                } catch (getErr) {
                    console.warn(
                        "[Auth Callback] account.get() client check failed:",
                        getErr?.message || getErr,
                    );
                }

                // Attempt current session check if appwriteUser not resolved yet
                let currentSession = null;
                if (!appwriteUser) {
                    try {
                        currentSession = await account.getSession("current");
                        console.log("[Auth Callback] Active session retrieved:", currentSession);
                    } catch (sessErr) {
                        console.warn(
                            "[Auth Callback] getSession('current') failed:",
                            sessErr?.message || sessErr,
                        );
                    }
                }

                const targetUserId =
                    appwriteUser?.$id || currentSession?.userId || userIdParam;
                const targetSecret = secretParam || currentSession?.secret;

                if (!targetUserId && !targetSecret && !appwriteUser) {
                    console.warn("[Auth Callback] No OAuth credentials found in callback URL.");
                    setStatus("No OAuth session parameters found. Redirecting to login...");
                    setTimeout(() => {
                        router.push("/login?error=oauth_failed");
                    }, 2000);
                    return;
                }

                setStatus("Saving user data to MongoDB & creating session...");

                // Call MongoDB sync endpoint
                const response = await fetch("/api/auth/google/callback", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        appwriteUser,
                        userId: targetUserId,
                        secret: targetSecret,
                    }),
                    credentials: "include",
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(
                        errorData.error || errorData.message || "Failed to sync Appwrite user to MongoDB",
                    );
                }

                const result = await response.json();
                console.log("[Auth Callback] MongoDB sync successful:", result);

                setStatus("Sign in complete! Redirecting...");
                router.push(result.redirectTo || "/feed");
            } catch (error) {
                console.error("[Auth Callback] OAuth Error:", error);
                setStatus(`Authentication error: ${error.message}. Redirecting to login...`);
                setTimeout(() => {
                    router.push("/login?error=oauth_failed");
                }, 2500);
            }
        };

        completeSignIn();
    }, [router, searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
            <div className="text-center space-y-4 max-w-md px-4">
                <div className="animate-pulse">
                    <span className="text-xl font-medium">{status}</span>
                </div>
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                <span className="text-xl font-medium animate-pulse">Loading auth callback...</span>
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}
