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
    const data = event.data?.json() || {
        title: "New Message",
        body: "You have a new message",
    };

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

    event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
    console.log("[SW] Notification clicked:", event.notification);
    event.notification.close();

    event.waitUntil(
        clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList) => {
                for (let client of clientList) {
                    if (client.url === "/" || client.url.startsWith("/")) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(
                        event.notification.data?.url || "/",
                    );
                }
            }),
    );
});

self.addEventListener("notificationclose", (event) => {
    console.log("[SW] Notification closed");
});
