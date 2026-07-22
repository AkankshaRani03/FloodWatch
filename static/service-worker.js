// ============================================================
// FloodWatch Service Worker v3
// Cache · Background Sync · Push Notifications
// ============================================================

const CACHE_NAME      = "floodwatch-pwa-v3";
const OFFLINE_URL     = "/offline.html";
const SYNC_TAG        = "fw-incident-sync";

const CORE_ASSETS = [
    "/",
    "/offline.html",
    "/manifest.json",
    "/static/icons/floodwatch-logo.svg",
    "/static/css/common.css",
    "/static/css/mobile.css",
    "/static/js/common.js",
    "/static/js/mobile.js",
    "/static/js/pwa.js",
];

// ============================================================
// INSTALL — cache core assets
// ============================================================
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(CORE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// ============================================================
// ACTIVATE — purge old caches
// ============================================================
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(k => k !== CACHE_NAME)
                    .map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// ============================================================
// FETCH — network-first for API, cache-first for assets
// ============================================================
self.addEventListener("fetch", event => {
    const req = event.request;

    if (req.method !== "GET") return;

    // Navigation requests → network with offline fallback
    if (req.mode === "navigate") {
        event.respondWith(
            fetch(req)
                .catch(() => caches.match(OFFLINE_URL))
        );
        return;
    }

    // API requests → network only (never cache live data)
    if (req.url.includes("/api/") || req.url.includes("/predict") ||
        req.url.includes("/notifications")) {
        event.respondWith(
            fetch(req).catch(() =>
                new Response(
                    JSON.stringify({ error: "offline" }),
                    { headers: { "Content-Type": "application/json" } }
                )
            )
        );
        return;
    }

    // Static assets → cache-first, update in background
    event.respondWith(
        caches.match(req).then(cached => {
            const networkFetch = fetch(req).then(response => {
                if (response.ok && req.url.startsWith(self.location.origin)) {
                    caches.open(CACHE_NAME)
                        .then(cache => cache.put(req, response.clone()));
                }
                return response;
            });
            return cached || networkFetch;
        })
    );
});

// ============================================================
// BACKGROUND SYNC — replay queued incident reports
// Triggered when the device comes back online after an offline
// incident submission queued via SyncManager in mobile.js
// ============================================================
self.addEventListener("sync", event => {
    if (event.tag === SYNC_TAG) {
        event.waitUntil(replayQueuedIncidents());
    }
});

async function replayQueuedIncidents() {
    let queue = [];
    try {
        const db   = await openSyncDB();
        queue      = await getAllFromDB(db, "incidents");
    } catch {
        return;
    }

    for (const item of queue) {
        try {
            const formData = new FormData();
            Object.entries(item.payload).forEach(([k, v]) => {
                if (v !== null && v !== undefined) formData.append(k, v);
            });

            const res = await fetch("/report_incident", {
                method: "POST",
                body: formData,
                credentials: "same-origin",
            });

            if (res.ok) {
                const db = await openSyncDB();
                await deleteFromDB(db, "incidents", item.id);
                // Notify all open clients
                const clients = await self.clients.matchAll();
                clients.forEach(c =>
                    c.postMessage({ type: "SYNC_SUCCESS", id: item.id })
                );
            }
        } catch {
            // Will retry on next sync
        }
    }
}

// ============================================================
// PUSH NOTIFICATIONS
// ============================================================
self.addEventListener("push", event => {
    let data = { title: "FloodWatch Alert", body: "Tap to view.", icon: "/static/icons/floodwatch-logo.svg", badge: "/static/icons/floodwatch-logo.svg" };

    try {
        if (event.data) data = { ...data, ...event.data.json() };
    } catch {}

    const options = {
        body:              data.body,
        icon:              data.icon,
        badge:             data.badge,
        vibrate:           [100, 50, 200],
        tag:               data.tag || "floodwatch-alert",
        renotify:          true,
        requireInteraction: data.requireInteraction || false,
        data: {
            url: data.url || "/notifications",
        },
        actions: [
            { action: "view",    title: "View Alert" },
            { action: "dismiss", title: "Dismiss"    },
        ],
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener("notificationclick", event => {
    event.notification.close();

    if (event.action === "dismiss") return;

    const url = event.notification.data?.url || "/notifications";

    event.waitUntil(
        clients.matchAll({ type: "window" }).then(windowClients => {
            for (const client of windowClients) {
                if (client.url.includes(url) && "focus" in client) {
                    return client.focus();
                }
            }
            return clients.openWindow(url);
        })
    );
});

// ============================================================
// SYNC DB HELPERS (IndexedDB)
// ============================================================
function openSyncDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open("fw-sync-db", 1);
        req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("incidents")) {
                db.createObjectStore("incidents", {
                    keyPath: "id",
                    autoIncrement: true,
                });
            }
        };
        req.onsuccess  = e => resolve(e.target.result);
        req.onerror    = e => reject(e.target.error);
    });
}

function getAllFromDB(db, store) {
    return new Promise((resolve, reject) => {
        const tx  = db.transaction(store, "readonly");
        const req = tx.objectStore(store).getAll();
        req.onsuccess = e => resolve(e.target.result);
        req.onerror   = e => reject(e.target.error);
    });
}

function deleteFromDB(db, store, id) {
    return new Promise((resolve, reject) => {
        const tx  = db.transaction(store, "readwrite");
        const req = tx.objectStore(store).delete(id);
        req.onsuccess = () => resolve();
        req.onerror   = e  => reject(e.target.error);
    });
}
