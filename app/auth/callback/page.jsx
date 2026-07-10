"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    createAppwriteClient,
    getAppwriteAccount,
} from "@/lib/appwrite/client";

export default function AuthCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState("Processing...");

    useEffect(() => {
        const completeSignIn = async () => {
            try {
                console.log(
                    "[Auth Callback] Starting client-side auth handling",
                );
                setStatus("Checking Appwrite session...");

                // Get Appwrite user client-side
                const client = createAppwriteClient();
                const account = getAppwriteAccount(client);
                const appwriteUser = await account.get();

                console.log("[Auth Callback] Got Appwrite user:", appwriteUser);
                setStatus("Linking to your account...");

                // Call our API to link Appwrite user to MongoDB and set JWT cookie
                const response = await fetch("/api/auth/google/callback", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ appwriteUser }),
                    credentials: "include", // Important to send/receive cookies
                });

                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(error || "Failed to complete sign-in");
                }

                const result = await response.json();
                console.log("[Auth Callback] API response:", result);

                setStatus("Redirecting...");

                // Redirect to onboarding or feed
                router.push(result.redirectTo || "/feed");
            } catch (error) {
                console.error("[Auth Callback] Error:", error);
                setStatus("Sign-in failed. Redirecting to login...");
                setTimeout(() => {
                    router.push("/login?error=oauth_failed");
                }, 2000);
            }
        };

        completeSignIn();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
            <div className="text-center space-y-4">
                <div className="animate-pulse">
                    <span className="text-2xl">{status}</span>
                </div>
            </div>
        </div>
    );
}
