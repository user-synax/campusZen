"use client";

import { useState, useEffect, useCallback } from "react";
import useUser from "./useUser";
import { getPusherClient } from "@/lib/pusher-client";

export function usePushNotifications() {
    const { user } = useUser();
    const [permission, setPermission] = useState("default");
    const [registration, setRegistration] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(false);

    // Check for service worker and push manager support
    const isSupported =
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window;

    // Initialize on mount
    useEffect(() => {
        if (!isSupported) return;

        const init = async () => {
            try {
                // Get existing registration
                const reg = await navigator.serviceWorker.register("/sw.js");
                setRegistration(reg);
                setPermission(Notification.permission);

                // Check for existing subscription
                const existing = await reg.pushManager.getSubscription();
                setSubscription(existing);
            } catch (err) {
                console.error("[Push] Error initializing:", err);
            }
        };
        init();
    }, []);

    // Request permission and subscribe
    const requestPermissionAndSubscribe = useCallback(async () => {
        if (!isSupported || !user) return;

        setLoading(true);
        try {
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm !== "granted") return;

            const reg =
                registration ||
                (await navigator.serviceWorker.register("/sw.js"));
            setRegistration(reg);

            const existing = await reg.pushManager.getSubscription();
            if (existing) {
                setSubscription(existing);
                await saveSubscriptionToBackend(existing);
                return existing;
            }

            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || await fetchVapidKey();
            if (!vapidKey) {
                console.error("[Push] VAPID public key not configured");
                return;
            }

            const newSub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey),
            });
            setSubscription(newSub);
            await saveSubscriptionToBackend(newSub);
            return newSub;
        } catch (err) {
            console.error("[Push] Error subscribing:", err);
        } finally {
            setLoading(false);
        }
    }, [registration, user, isSupported]);

    // Unsubscribe
    const unsubscribe = useCallback(async () => {
        if (!subscription) return;

        try {
            await subscription.unsubscribe();
            setSubscription(null);
            await fetch("/api/notifications/subscribe", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            });
        } catch (err) {
            console.error("[Push] Error unsubscribing:", err);
        }
    }, [subscription]);

    // Save subscription to backend
    const saveSubscriptionToBackend = async (sub) => {
        try {
            await fetch("/api/notifications/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subscription: sub }),
            });
        } catch (err) {
            console.error("[Push] Error saving to backend:", err);
        }
    };

    return {
        isSupported,
        permission,
        subscription,
        loading,
        requestPermissionAndSubscribe,
        unsubscribe,
    };
}

// Helper: Convert VAPID public key to Uint8Array
function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// Fetch VAPID public key from server (fallback when NEXT_PUBLIC_ build-time value is missing)
let cachedVapidKey = null;
async function fetchVapidKey() {
    if (cachedVapidKey) return cachedVapidKey;
    try {
        const res = await fetch("/api/notifications/vapid-key");
        if (!res.ok) return null;
        const data = await res.json();
        cachedVapidKey = data.publicKey || null;
        return cachedVapidKey;
    } catch {
        return null;
    }
}
