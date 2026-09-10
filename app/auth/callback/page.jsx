"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Appwrite auth removed - JWT-only via jose. This route is deprecated but kept
// for legacy deep-links; it now redirects to the Google OAuth entry point.

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState("Redirecting...");

    useEffect(() => {
        const handleLegacyCallback = async () => {
            try {
                // Legacy Appwrite params (userId/secret) are no longer honored.
                // Google OAuth now uses /api/auth/google/callback?code=...&state=...
                // If this page is hit, guide user to proper login.
                const hasLegacyParams = searchParams.get("userId") || searchParams.get("secret");
                if (hasLegacyParams) {
                    console.warn("[Auth Callback] Legacy Appwrite params detected - auth is now JWT-only. Redirecting to login.");
                }
                setStatus("This sign-in method is deprecated. Redirecting to login...");
                setTimeout(() => {
                    router.push("/login");
                }, 1200);
                return;
            } catch (error) {
                console.error("[Auth Callback] Error:", error);
                setStatus(`Authentication error: ${error.message}. Redirecting to login...`);
                setTimeout(() => {
                    router.push("/login?error=oauth_failed");
                }, 1500);
            }
        };

        handleLegacyCallback();
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
