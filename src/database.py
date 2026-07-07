"""
Database Module for User Management
SQLite database for storing user credentials and sessions
"""

import sqlite3
import os
from pathlib import Path
from datetime import datetime

# Database path
DB_DIR = Path(__file__).parent.parent / 'data'
DB_DIR.mkdir(exist_ok=True)
DB_PATH = DB_DIR / 'users.db'


def init_database():
    """
    Initialize database and create users table if not exists
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )
    ''')

    # Create sessions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_token TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    # Create predictions_history table (optional, for tracking user predictions)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS predictions_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            flood_probability REAL NOT NULL,
            risk_level TEXT NOT NULL,
            prediction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            email_sent BOOLEAN DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    # Create incidents table (citizen-reported incidents, surfaced on
    # the community dashboard's Incident Queue)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS incidents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            incident_type TEXT NOT NULL,
            description TEXT NOT NULL,
            latitude REAL,
            longitude REAL,
            location_name TEXT,
            image_path TEXT,
            status TEXT DEFAULT 'pending',
            severity TEXT DEFAULT 'MEDIUM',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    # Create notifications table (drives the community dashboard's
    # alert bell + activity feed whenever a new incident comes in)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT NOT NULL,
            incident_id INTEGER,
            is_read BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (incident_id) REFERENCES incidents(id)
        )
    ''')

    conn.commit()
    conn.close()
    print(f"✓ Database initialized at {DB_PATH}")


def get_connection():
    """
    Get database connection
    """
    return sqlite3.connect(DB_PATH)


def create_user(
    username,
    email,
    phone,
    password_hash,
    role,
    sub_role,
    district,
    city,
    area
):
    """
    Create a new user
    """

    try:

        conn = get_connection()
        cursor = conn.cursor()

        # Username check
        cursor.execute(
            'SELECT id FROM users WHERE username = ?',
            (username,)
        )

        if cursor.fetchone():
            conn.close()
            return (False, 'Username already exists', None)

        # Email check
        cursor.execute(
            'SELECT id FROM users WHERE email = ?',
            (email,)
        )

        if cursor.fetchone():
            conn.close()
            return (False, 'Email already exists', None)

        # Insert new user
        cursor.execute('''
            INSERT INTO users
            (
                username,
                email,
                phone,
                password_hash,
                role,
                sub_role,
                district,
                city,
                area
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''',
        (
            username,
            email,
            phone,
            password_hash,
            role,
            sub_role,
            district,
            city,
            area
        ))

        user_id = cursor.lastrowid

        conn.commit()
        conn.close()

        return (
            True,
            'User created successfully',
            user_id
        )

    except Exception as e:

        return (
            False,
            f'Database error: {str(e)}',
            None
        )


def get_user_by_username(username):
    """
    Get user by username

    Args:
        username (str): Username

    Returns:
        dict or None: User data or None if not found
    """
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
        row = cursor.fetchone()
        conn.close()

        if row:
            return dict(row)
        return None

    except Exception as e:
        print(f"Error fetching user: {e}")
        return None


def get_user_by_email(email):
    """
    Get user by email

    Args:
        email (str): Email address

    Returns:
        dict or None: User data or None if not found
    """
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        row = cursor.fetchone()
        conn.close()

        if row:
            return dict(row)
        return None

    except Exception as e:
        print(f"Error fetching user: {e}")
        return None


def get_user_by_id(user_id):
    """
    Get user by ID

    Args:
        user_id (int): User ID

    Returns:
        dict or None: User data or None if not found
    """
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            return dict(row)
        return None

    except Exception as e:
        print(f"Error fetching user: {e}")
        return None


def update_last_login(user_id):
    """
    Update user's last login timestamp

    Args:
        user_id (int): User ID
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            UPDATE users
            SET last_login = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (user_id,))

        conn.commit()
        conn.close()

    except Exception as e:
        print(f"Error updating last login: {e}")


def save_prediction(user_id, latitude, longitude, flood_probability, risk_level, email_sent=False):
    """
    Save prediction to history

    Args:
        user_id (int): User ID
        latitude (float): Latitude
        longitude (float): Longitude
        flood_probability (float): Flood probability
        risk_level (str): Risk level (LOW/MEDIUM/HIGH)
        email_sent (bool): Whether email was sent

    Returns:
        int or None: Prediction ID or None if failed
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO predictions_history
            (user_id, latitude, longitude, flood_probability, risk_level, email_sent)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user_id, latitude, longitude, flood_probability, risk_level, email_sent))

        prediction_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return prediction_id

    except Exception as e:
        print(f"Error saving prediction: {e}")
        return None


def get_user_predictions(user_id, limit=50):
    """
    Get user's prediction history

    Args:
        user_id (int): User ID
        limit (int): Maximum number of records to return

    Returns:
        list: List of prediction records
    """
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('''
            SELECT * FROM predictions_history
            WHERE user_id = ?
            ORDER BY prediction_date DESC
            LIMIT ?
        ''', (user_id, limit))

        rows = cursor.fetchall()
        conn.close()

        return [dict(row) for row in rows]

    except Exception as e:
        print(f"Error fetching predictions: {e}")
        return []


# ==========================================================
# Incidents (citizen -> community bridge)
# ==========================================================

def save_incident(user_id, incident_type, description, latitude=None, longitude=None,
                   image_path=None, location_name=None, severity='MEDIUM', status='pending'):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO incidents
            (user_id, incident_type, description, latitude, longitude,
             location_name, image_path, status, severity)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, incident_type, description, latitude, longitude,
              location_name, image_path, status, severity))
        incident_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return incident_id
    except Exception as e:
        print(f"Error saving incident: {e}")
        return None


def get_incidents(limit=50, status=None):
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        if status:
            cursor.execute('SELECT * FROM incidents WHERE status = ? ORDER BY created_at DESC LIMIT ?',
                            (status, limit))
        else:
            cursor.execute('SELECT * FROM incidents ORDER BY created_at DESC LIMIT ?', (limit,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except Exception as e:
        print(f"Error fetching incidents: {e}")
        return []


def get_incident_count(status=None):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        if status:
            cursor.execute('SELECT COUNT(*) FROM incidents WHERE status = ?', (status,))
        else:
            cursor.execute('SELECT COUNT(*) FROM incidents')
        count = cursor.fetchone()[0]
        conn.close()
        return count
    except Exception as e:
        print(f"Error counting incidents: {e}")
        return 0


def update_incident_status(incident_id, status):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('UPDATE incidents SET status = ? WHERE id = ?', (status, incident_id))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error updating incident status: {e}")
        return False


# ==========================================================
# Notifications (drives the community dashboard bell/feed)
# ==========================================================

def create_notification(message, incident_id=None):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('INSERT INTO notifications (message, incident_id) VALUES (?, ?)',
                        (message, incident_id))
        notification_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return notification_id
    except Exception as e:
        print(f"Error creating notification: {e}")
        return None


def get_notifications(limit=20):
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?', (limit,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except Exception as e:
        print(f"Error fetching notifications: {e}")
        return []


def get_unread_notification_count():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM notifications WHERE is_read = 0')
        count = cursor.fetchone()[0]
        conn.close()
        return count
    except Exception as e:
        print(f"Error counting notifications: {e}")
        return 0


def mark_all_notifications_read():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('UPDATE notifications SET is_read = 1 WHERE is_read = 0')
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error marking notifications read: {e}")
        return False


# Initialize database on module import
if __name__ == "__main__":
    init_database()
    print("Database initialization complete!")