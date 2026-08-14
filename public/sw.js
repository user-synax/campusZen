const CACHE_NAME = "campuszen-v1";

self.addEventListener("install", (event) => {
    console.log("[SW] Installing...");
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    console.log("[SW] Activating...");
    event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
    console.log("[SW] Push received:", event.data);

    let data;
    try {
        data = event.data?.json() || {
            title: "New Message",
            body: "You have a new message",
        };
    } catch (err) {
        console.error("[SW] Failed to parse push data:", err);
        data = {
            title: "New Message",
            body: "You have a new message",
        };
    }

    const options = {
        body: data.body,
        icon: data.icon || "/android-chrome-192x192.png",
        badge: data.badge || "/android-chrome-192x192.png",
        data: data.data,
        vibrate: data.vibrate || [200, 100, 200],
        actions: data.actions || [],
        tag: data.tag,
        requireInteraction: data.requireInteraction || false,
        renotify: data.renotify || true,
        silent: data.silent || false,
        priority: data.priority || "high",
    };

    const showNotification = async () => {
        // Skip OS notification if user is focused on the matching chat route
        const targetUrl = data.data?.url;
        if (targetUrl && targetUrl.startsWith("/chats/")) {
            try {
                const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });
                const isViewingChat = clientList.some((client) => {
                    try {
                        const clientPath = new URL(client.url).pathname;
                        return client.focused && (
                            clientPath === targetUrl ||
                            clientPath.startsWith(targetUrl + "/")
                        );
                    } catch {
                        return false;
                    }
                });
                if (isViewingChat) return;
            } catch {
                // clients.matchAll failed — show notification as fallback
            }
        }

        await self.registration.showNotification(data.title, options);
    };

    event.waitUntil(showNotification());
});

self.addEventListener("notificationclick", (event) => {
    console.log("[SW] Notification clicked:", event.notification);
    event.notification.close();

    const targetUrl = event.notification.data?.url || "/";

    event.waitUntil(
        clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList) => {
                for (let client of clientList) {
                    try {
                        const clientPath = new URL(client.url).pathname;
                        if (
                            clientPath === targetUrl ||
                            client.url.startsWith(self.location.origin)
                        ) {
                            client.navigate(targetUrl);
                            return client.focus();
                        }
                    } catch (err) {
                        console.error("[SW] Failed to parse client URL:", err);
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(targetUrl);
                }
            }),
    );
});

self.addEventListener("notificationclose", (event) => {
    console.log("[SW] Notification closed");
});

self.addEventListener("pushsubscriptionchange", (event) => {
    console.log("[SW] Push subscription changed");

    event.waitUntil(
        self.registration.pushManager
            .subscribe(event.oldSubscription?.options || { userVisibleOnly: true })
            .then((subscription) => {
                return fetch("/api/notifications/subscribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(subscription),
                });
            })
            .catch((err) => {
                console.error("[SW] Failed to resubscribe after subscription change:", err);
            }),
    );
});

const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
    );
    self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(OFFLINE_URL))
        );
    }
});