// ============================================================
// FloodWatch PWA
// Service Worker registration · Push subscription
// ============================================================

(function () {
    if (!("serviceWorker" in navigator)) return;

    // ── Register service worker ─────────────────────────────
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/service-worker.js")
            .then(reg => {
                console.log("FloodWatch SW registered:", reg.scope);
                // Subscribe to push after SW is ready
                subscribeToPush(reg);
            })
            .catch(err => {
                console.warn("FloodWatch SW registration failed:", err);
            });
    });

    // ── Web Push subscription ──────────────────────────────
    async function subscribeToPush(reg) {
        try {
            // Only subscribe if user is logged in (page has logout button)
            if (!document.querySelector(".logout-button")) return;

            // Check if Notification API is available
            if (!("Notification" in window) || !("PushManager" in window)) return;

            // Fetch VAPID public key
            const res = await fetch("/api/push/vapid-public-key");
            if (!res.ok) return;
            const { public_key, available } = await res.json();
            if (!available || !public_key) return;

            // Check current permission
            if (Notification.permission === "denied") return;

            // Get or create subscription
            const existing = await reg.pushManager.getSubscription();
            if (existing) {
                await syncSubscriptionToServer(existing);
                return;
            }

            // Request permission only if not yet granted
            if (Notification.permission !== "granted") {
                const permission = await Notification.requestPermission();
                if (permission !== "granted") return;
            }

            // Subscribe
            const subscription = await reg.pushManager.subscribe({
                userVisibleOnly:      true,
                applicationServerKey: urlBase64ToUint8Array(public_key),
            });

            await syncSubscriptionToServer(subscription);
        } catch (err) {
            // Non-fatal — push is optional
            console.log("Push subscription skipped:", err.message);
        }
    }

    async function syncSubscriptionToServer(subscription) {
        const json = subscription.toJSON();
        try {
            await fetch("/api/push/subscribe", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    endpoint: json.endpoint,
                    keys: {
                        p256dh: json.keys.p256dh,
                        auth:   json.keys.auth,
                    },
                }),
            });
        } catch {
            // Silent fail — will retry next load
        }
    }

    // ── VAPID key converter ────────────────────────────────
    function urlBase64ToUint8Array(base64String) {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64  = (base64String + padding)
            .replace(/-/g, "+")
            .replace(/_/g, "/");
        const raw = window.atob(base64);
        return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
    }

})();
