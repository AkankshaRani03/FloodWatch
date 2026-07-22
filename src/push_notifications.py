"""
FloodWatch Web Push Notification Module
VAPID key generation, subscription storage, push sending
"""

import json
import os
import sqlite3
from pathlib import Path

# ── Optional pywebpush dependency ──────────────────────────────────────────
try:
    from pywebpush import webpush, WebPushException
    WEBPUSH_AVAILABLE = True
except ImportError:
    WEBPUSH_AVAILABLE = False
    print("⚠️  pywebpush not installed. Push notifications disabled.")
    print("   Run: pip install pywebpush")

DB_DIR  = Path(__file__).parent.parent / "data"
DB_PATH = DB_DIR / "users.db"


# ── Database helpers ────────────────────────────────────────────────────────

def init_push_subscriptions_table():
    """Create the push_subscriptions table if it doesn't exist."""
    conn = sqlite3.connect(DB_PATH)
    cur  = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            endpoint   TEXT    NOT NULL UNIQUE,
            p256dh     TEXT    NOT NULL,
            auth       TEXT    NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    conn.commit()
    conn.close()


def save_push_subscription(user_id: int, endpoint: str, p256dh: str, auth: str) -> bool:
    """
    Store or update a push subscription for a user.
    Returns True on success.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cur  = conn.cursor()
        cur.execute("""
            INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(endpoint) DO UPDATE SET
                user_id = excluded.user_id,
                p256dh  = excluded.p256dh,
                auth    = excluded.auth
        """, (user_id, endpoint, p256dh, auth))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error saving push subscription: {e}")
        return False


def delete_push_subscription(endpoint: str) -> bool:
    """Remove a push subscription by endpoint."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cur  = conn.cursor()
        cur.execute("DELETE FROM push_subscriptions WHERE endpoint = ?", (endpoint,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error deleting push subscription: {e}")
        return False


def get_all_subscriptions() -> list:
    """Return all active push subscriptions."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur  = conn.cursor()
        cur.execute("SELECT * FROM push_subscriptions")
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return rows
    except Exception as e:
        print(f"Error fetching subscriptions: {e}")
        return []


def get_user_subscriptions(user_id: int) -> list:
    """Return push subscriptions for a specific user."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur  = conn.cursor()
        cur.execute(
            "SELECT * FROM push_subscriptions WHERE user_id = ?",
            (user_id,)
        )
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return rows
    except Exception as e:
        print(f"Error fetching user subscriptions: {e}")
        return []


# ── VAPID Keys ──────────────────────────────────────────────────────────────

def get_vapid_keys() -> dict:
    """
    Return VAPID public/private keys from environment variables.
    Generate them once with:
        python -c "from py_vapid import Vapid; v=Vapid(); v.generate_keys(); print(v.public_key_urlsafe, v.private_key_urlsafe)"
    or use: https://web-push-codelab.glitch.me/
    """
    return {
        "public_key":  os.environ.get("VAPID_PUBLIC_KEY",  ""),
        "private_key": os.environ.get("VAPID_PRIVATE_KEY", ""),
        "claims_email": os.environ.get("VAPID_CLAIMS_EMAIL", "admin@floodwatch.example"),
    }


# ── Send Push ───────────────────────────────────────────────────────────────

def send_push_to_subscription(subscription: dict, payload: dict) -> bool:
    """
    Send a single Web Push notification.

    Args:
        subscription: dict with keys endpoint, p256dh, auth
        payload:      dict e.g. { title, body, url, tag, requireInteraction }
    Returns:
        True on success, False on failure
    """
    if not WEBPUSH_AVAILABLE:
        return False

    vapid = get_vapid_keys()
    if not vapid["public_key"] or not vapid["private_key"]:
        print("⚠️  VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars.")
        return False

    subscription_info = {
        "endpoint": subscription["endpoint"],
        "keys": {
            "p256dh": subscription["p256dh"],
            "auth":   subscription["auth"],
        },
    }

    try:
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=vapid["private_key"],
            vapid_claims={
                "sub": f"mailto:{vapid['claims_email']}"
            },
        )
        return True
    except WebPushException as e:
        print(f"Push failed: {e}")
        # 410 Gone = subscription expired, clean it up
        if e.response and e.response.status_code == 410:
            delete_push_subscription(subscription["endpoint"])
        return False
    except Exception as e:
        print(f"Push error: {e}")
        return False


def broadcast_push_notification(payload: dict, user_id: int = None) -> int:
    """
    Send a push notification to all subscribers (or one user).

    Args:
        payload:  { title, body, url, tag, requireInteraction, icon }
        user_id:  if set, send only to that user's subscriptions

    Returns:
        Number of successful sends
    """
    if user_id:
        subs = get_user_subscriptions(user_id)
    else:
        subs = get_all_subscriptions()

    # Ensure icon is set
    payload.setdefault("icon",  "/static/icons/floodwatch-logo.svg")
    payload.setdefault("badge", "/static/icons/floodwatch-logo.svg")

    count = 0
    for sub in subs:
        if send_push_to_subscription(sub, payload):
            count += 1

    print(f"✓ Push sent to {count}/{len(subs)} subscribers")
    return count
