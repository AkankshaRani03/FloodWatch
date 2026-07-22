"""
Flask API for Flood Prediction
Provides REST endpoint for flood probability prediction
"""

from ee import data
from flask import Flask, request, jsonify, render_template, session, redirect, url_for, send_from_directory
from flask_cors import CORS
from functools import wraps
import sys
from pathlib import Path
import os
import uuid
from werkzeug.utils import secure_filename

# Add src to path
sys.path.append(str(Path(__file__).parent.parent / 'src'))
sys.path.append(str(Path(__file__).parent.parent / 'configs'))

from feature_extraction_gee import initialize_gee, extract_features_for_location, get_safe_date_range
from feature_extraction_mock import extract_features_for_location_mock
from gee_setup import setup_gee_credentials_from_env
from model_training import load_model
from utils import validate_coordinates, format_prediction_response
from email_notifications import send_flood_alert_email
from database import (
    init_database, create_user, get_user_by_username, get_user_by_email,
    get_user_by_id, update_last_login, save_prediction,
    save_incident, create_notification, get_incidents,
    get_incident_count, get_notifications,
    get_unread_notification_count, mark_all_notifications_read,
    mark_notification_read
)
from auth import hash_password, verify_password, validate_registration, validate_login, is_email
import config

# Try to import weather API module (it might not exist in older versions)
try:
    from feature_extraction_weather_api import extract_features_from_weather_api
    WEATHER_API_AVAILABLE = True
except ImportError:
    WEATHER_API_AVAILABLE = False
    print("⚠️ Weather API module not found. Using GEE only.")

app = Flask(__name__, 
            template_folder=str(Path(__file__).parent.parent / 'templates'),
            static_folder=str(Path(__file__).parent.parent / 'static'))

UPLOAD_FOLDER = Path(__file__).parent.parent / 'static' / 'uploads' / 'incidents'
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Secret key for session management.
# In production, set SECRET_KEY in the server environment.
app.secret_key = os.environ.get(
    'SECRET_KEY',
    'flood-prediction-dev-secret-change-in-production'
)

# Session configuration for better cookie handling
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True

# CORS configuration. For public deployment, set CORS_ORIGINS to the
# production HTTPS URL, for example: https://floodwatch.gov.example
cors_origins = os.environ.get(
    'CORS_ORIGINS',
    'http://localhost:5000,http://127.0.0.1:5000'
).split(',')

CORS(app,
     supports_credentials=True,
     origins=[origin.strip() for origin in cors_origins if origin.strip()],
     allow_headers=['Content-Type'],
     methods=['GET', 'POST', 'OPTIONS'])

# Global variables
model = None
gee_initialized = False


def login_required(f):
    """
    Decorator to protect routes that require authentication
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.is_json:
                return jsonify({'error': 'Authentication required', 'redirect': '/login'}), 401
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function


def load_trained_model():
    """Load the trained ML model - optional, won't crash if missing"""
    global model
    model_path = Path(__file__).parent.parent / 'models' / 'random_forest_flood_model.pkl'
    
    if not model_path.exists():
        print(f"⚠️ Model file not found: {model_path}")
        print("   App will run without predictions (UI still works)")
        model = None
        return False
    
    try:
        model = load_model(str(model_path))
        print("✓ Model loaded successfully")
        return True
    except Exception as e:
        print(f"⚠️ Failed to load model: {e}")
        model = None
        return False


def initialize_app():
    """Initialize GEE, load model, and set up credentials (all optional for graceful degradation)"""
    global gee_initialized
    
    # Initialize database
    try:
        init_database()
        print("✓ Database initialized")
    except Exception as e:
        print(f"⚠️ Database init warning: {e}")
    
    # Set up GEE credentials from environment (if available)
    try:
        setup_gee_credentials_from_env()
    except Exception as e:
        print(f"⚠️ GEE credentials setup warning: {e}")
    
    # Initialize GEE with project (optional)
    gee_project = os.environ.get('GEE_PROJECT', getattr(config, 'GEE_PROJECT', 'flood-prediction-0325'))
    try:
        gee_initialized = initialize_gee(project=gee_project)
        if gee_initialized:
            print("✓ Google Earth Engine initialized")
        else:
            print("⚠️ GEE not initialized (predictions may not work)")
    except Exception as e:
        print(f"⚠️ GEE init warning: {e}")
        gee_initialized = False
    
    # Load ML model (optional)
    try:
        load_trained_model()
    except Exception as e:
        print(f"⚠️ Model load warning: {e}")
        model = None


@app.route('/')
def home():
    """Public landing page - shows index if not logged in, dashboard if logged in"""
    # If user is logged in, show their dashboard
    if 'user_id' in session:
        user = get_user_by_id(session['user_id'])
        role = session.get('role')

        if role == 'citizen':
            return render_template(
                'citizen_dashboard.html',
                user=user
            )

        elif role == 'community_partner':
            return render_template(
                'community_dashboard.html',
                user=user
            )

        elif role == 'government':
            return render_template(
                'government_dashboard.html',
                user=user
            )

        elif role == 'admin':
            return render_template(
                'admin_dashboard.html',
                user=user
            )
        else:
            # Developer or other roles
            return render_template(
                'index.html',
                user=user
            )
    
    # If user is NOT logged in, show public landing page
    return render_template('index.html')


@app.route('/manifest.json')
def manifest():
    """Serve PWA manifest from the app root."""
    return send_from_directory(app.static_folder, 'manifest.json')


@app.route('/service-worker.js')
def service_worker():
    """Serve service worker from the app root so it can control the whole app."""
    return send_from_directory(app.static_folder, 'service-worker.js', mimetype='application/javascript')


@app.route('/offline.html')
def offline_page():
    """Offline fallback page used by the service worker."""
    return send_from_directory(app.static_folder, 'offline.html')

@app.route('/notifications', methods=['GET'])
@login_required
def notifications():
    """Serve the notifications page (protected)"""
    user = get_user_by_id(session['user_id'])
    return render_template('notifications.html', user=user)


@app.route('/register', methods=['GET', 'POST'])
def register():
    """User registration"""

    if request.method == 'GET':
        if 'user_id' in session:
            return redirect(url_for('home'))

        return render_template('register.html')

    try:

        data = request.get_json() if request.is_json else request.form

        username = data.get('username', '').strip()
        email = data.get('email', '').strip().lower()
        phone = data.get('phone', '').strip()

        role = data.get('role', 'citizen')
        sub_role = data.get('sub_role', '')

        district = data.get('district', '')
        city = data.get('city', '')
        area = data.get('area', '')

        password = data.get('password', '')
        retype_password = data.get('retype_password', '')

        # Validate input
        valid, errors = validate_registration(
            username,
            email,
            password,
            retype_password
        )

        if not valid:
            return jsonify({
                'success': False,
                'errors': errors
            }), 400

        # Hash password
        password_hash = hash_password(password)

        # Create user
        success, message, user_id = create_user(
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

        if not success:
            return jsonify({
                'success': False,
                'errors': {
                    'general': message
                }
            }), 400

        # Auto login
        session['user_id'] = user_id
        session['username'] = username
        session['email'] = email
        session['role'] = role
        session['sub_role'] = sub_role

        return jsonify({
            'success': True,
            'message': 'Registration successful!',
            'redirect': url_for('home')
        }), 201

    except Exception as e:

        return jsonify({
            'success': False,
            'errors': {
                'general': str(e)
            }
        }), 500

@app.route('/login', methods=['GET', 'POST'])
def login():
    """User login"""
    if request.method == 'GET':
        # Redirect to home if already logged in
        if 'user_id' in session:
            return redirect(url_for('home'))
        return render_template('login.html')
    
    # POST request - handle login
    try:
        data = request.get_json() if request.is_json else request.form
        
        identifier = data.get('identifier', '').strip()
        password = data.get('password', '')
        
        # Validate input
        valid, errors = validate_login(identifier, password)
        
        if not valid:
            return jsonify({'success': False, 'errors': errors}), 400
        
        # Get user by username or email
        if is_email(identifier):
            user = get_user_by_email(identifier.lower())
        else:
            user = get_user_by_username(identifier)
        
        # Check if user exists
        if not user:
            return jsonify({
                'success': False,
                'errors': {'general': 'Invalid username/email or password'}
            }), 401
        
        # Verify password
        if not verify_password(password, user['password_hash']):
            return jsonify({
                'success': False,
                'errors': {'general': 'Invalid username/email or password'}
            }), 401
        
        # Login successful - create session
        session['user_id'] = user['id']
        session['username'] = user['username']
        session['email'] = user['email']

        session['role'] = user['role']
        session['sub_role'] = user['sub_role']
        
        # Update last login
        update_last_login(user['id'])
        
        return jsonify({
            'success': True,
            'message': 'Login successful!',
            'redirect': url_for('home')
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'errors': {'general': str(e)}}), 500

@app.route('/test-logout')
def test_logout():

    session.clear()

    return redirect(url_for('login'))

@app.route('/logout', methods=['GET', 'POST'])
def logout():
    """User logout"""
    session.clear()
    return redirect(url_for('login'))


@app.route('/api/status', methods=['GET'])
def api_status():
    """API health check endpoint"""
    return jsonify({
        'status': 'online',
        'service': 'Flood Prediction API',
        'gee_status': 'connected' if gee_initialized else 'disconnected'
    })


@app.route('/system/status', methods=['GET'])
def system_status():
    """System status endpoint for public dashboard"""
    return jsonify({
        'status': 'operational'
    })


@app.route('/stats/summary', methods=['GET'])
def stats_summary():
    """Summary statistics for public dashboard"""
    active_alerts = get_unread_notification_count(alert_type='prediction')
    pending_incidents = get_incident_count(status='pending')
    total_incidents = get_incident_count()
    return jsonify({
        'activeAlerts': active_alerts,
        'regionsMonitored': 12,
        'reportsThisWeek': pending_incidents,
        'teamsOnline': total_incidents
    })


@app.route('/activity/recent', methods=['GET'])
def activity_recent():
    """Recent activity feed for public dashboard"""
    return jsonify([
        {
            'timestamp': '2026-07-03T14:30:00Z',
            'location': 'Hyderabad, Telangana',
            'type': 'Waterlogging Report',
            'status': 'in_progress'
        },
        {
            'timestamp': '2026-07-03T12:15:00Z',
            'location': 'Bangalore, Karnataka',
            'type': 'Flood Alert',
            'status': 'critical'
        },
        {
            'timestamp': '2026-07-03T10:00:00Z',
            'location': 'Chennai, Tamil Nadu',
            'type': 'All Clear',
            'status': 'resolved'
        }
    ])


@app.route('/api/community/stats', methods=['GET'])
def community_stats():
    """Community dashboard statistics"""
    return jsonify({
        'active_incidents': 8,
        'active_volunteers': 24,
        'shelters_active': 5,
        'pending_tasks': 13
    })


@app.route('/api/community/incidents', methods=['GET'])
def community_incidents():
    incidents = get_incidents(limit=50)
    result = []
    for inc in incidents:
        result.append({
            'id': str(inc['id']),
            'location': inc.get('location_name') or f"{inc['latitude']}, {inc['longitude']}",
            'description': f"{inc['incident_type']}: {inc['description']}",
            'status': inc['status'],
            'timestamp': inc['created_at'],
            'severity': inc['severity'],
            'image': inc.get('image_path')
        })
    return jsonify(result)

@app.route('/api/community/notifications', methods=['GET'])
def community_notifications():
    return jsonify(get_notifications(limit=20))


@app.route('/api/notifications', methods=['GET'])
def api_notifications():
    unread_only = request.args.get('unread', '').lower() in ('1', 'true', 'yes')
    alert_type = request.args.get('type')
    return jsonify(get_notifications(limit=50, unread_only=unread_only, alert_type=alert_type))


@app.route('/api/notifications/<int:notification_id>/read', methods=['POST'])
def api_notification_mark_read(notification_id):
    if mark_notification_read(notification_id):
        return jsonify({'success': True})

    return jsonify({'success': False, 'error': 'Notification not found'}), 404


@app.route('/api/government/alerts', methods=['GET'])
def government_alerts():
    notifications = get_notifications(limit=20, unread_only=True, alert_type='prediction')
    alerts = []

    for notification in notifications:
        risk_level = (notification.get('risk_level') or 'MEDIUM').upper()
        alerts.append({
            'title': notification.get('message', 'Flood prediction alert'),
            'level': risk_level.lower(),
            'time': notification.get('created_at', ''),
            'risk_level': risk_level,
            'flood_probability': notification.get('flood_probability'),
            'latitude': notification.get('latitude'),
            'longitude': notification.get('longitude'),
            'features': notification.get('features')
        })

    return jsonify(alerts)


@app.route('/api/community/volunteers', methods=['GET'])
def community_volunteers():
    """Community volunteers status"""
    return jsonify([
        {
            'id': 'v1',
            'name': 'Rahul Kumar',
            'area': 'Tarnaka',
            'status': 'available',
            'tasks_completed': 12
        },
        {
            'id': 'v2',
            'name': 'Priya Singh',
            'area': 'Habsiguda',
            'status': 'busy',
            'tasks_completed': 8
        },
        {
            'id': 'v3',
            'name': 'Amit Patel',
            'area': 'Uppal',
            'status': 'available',
            'tasks_completed': 15
        }
    ])


@app.route('/citizen', methods=['GET'])
def citizen_portal():
    """Citizen dashboard portal"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    user = get_user_by_id(session['user_id'])
    return render_template('citizen_dashboard.html', user=user)


@app.route('/community', methods=['GET'])
def community_portal():
    """Community dashboard portal"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    user = get_user_by_id(session['user_id'])
    return render_template('community_dashboard.html', user=user)


@app.route('/government', methods=['GET'])
def government_portal():
    """Government dashboard portal"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    user = get_user_by_id(session['user_id'])
    return render_template('government_dashboard.html', user=user)


@app.route('/admin', methods=['GET'])
def admin_portal():
    """Admin dashboard portal"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    user = get_user_by_id(session['user_id'])
    return render_template('admin_dashboard.html', user=user)


@app.route('/report', methods=['GET'])
def report_incident():
    """Incident reporting (redirects to citizen dashboard)"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    user = get_user_by_id(session['user_id'])
    return render_template('citizen_dashboard.html', user=user)


@app.route('/predict', methods=['POST'])
@login_required
def predict():
    """
    Predict flood probability for a given location (requires authentication)
    
    Request Body:
    {
        "latitude": 17.385,
        "longitude": 78.486
    }
    
    Response:
    {
        "flood_probability": 0.82,
        "risk_level": "HIGH",
        "confidence": "high",
        "features": {...}
    }
    """
    try:
        # Get logged-in user
        user_id = session['user_id']
        user_email = session['email']
        
        # Parse request
        data = request.get_json()
        lat = float(data.get('latitude'))
        lon = float(data.get('longitude'))
        
        # Validate coordinates
        if not validate_coordinates(lat, lon):
            return jsonify({'error': 'Invalid coordinates'}), 400
        
        # Check GEE status
        if not gee_initialized:
            return jsonify({'error': 'GEE not initialized'}), 500
        
        # Get safe date range (avoid real-time data issues)
        start_date, end_date = get_safe_date_range(days_back=30, window_days=7)
        
        # Try GEE first, fallback to mock if unavailable
        if gee_initialized:
            print(f"\n🛰️ Using GEE for real-time data...")
            features = extract_features_for_location(lat, lon, start_date, end_date)
            data_source = "GEE (Satellite)"
        else:
            print(f"\n📊 GEE unavailable, using mock features for testing...")
            features = extract_features_for_location_mock(lat, lon, start_date, end_date)
            data_source = "Mock (Testing Mode)"
        
        # Check if features extraction failed
        if features is None:
            return jsonify({'error': 'Failed to extract features (data unavailable for this location)'}), 500
        
        # Check for None values in features
        if None in features.values():
            return jsonify({'error': 'Failed to extract features (data unavailable)'}), 500
        
        # Prepare features in correct order
        feature_array = [[
            features['rainfall_7d_mm'],
            features['soil_moisture'],
            features['elevation_m'],
            features['slope_deg']
        ]]
        
        # Check if model is available
        if model is None:
            return jsonify({
                'error': 'Prediction model not available',
                'message': 'The ML model is not loaded. Predictions unavailable.',
                'features': features
            }), 503
        
        # Predict
        probability = model.predict_proba(feature_array)[0][1]
        
        # Format response
        response = format_prediction_response(probability, features)
        
        # Add data source info
        response['data_source'] = data_source
        response['date_range'] = {'start': start_date, 'end': end_date}
        
        # Save prediction to user's history
        email_sent_flag = False
        
        # Send email notification if probability exceeds threshold
        if hasattr(config, 'EMAIL_NOTIFICATIONS_ENABLED') and config.EMAIL_NOTIFICATIONS_ENABLED:
            email_threshold = getattr(config, 'EMAIL_ALERT_THRESHOLD', 0.5)
            
            if probability >= email_threshold:
                print(f"\n📧 Flood probability ({probability:.1%}) exceeds threshold ({email_threshold:.1%})")
                
                # Use logged-in user's email
                recipient_email = user_email
                
                if recipient_email:
                    # Prepare SMTP config
                    smtp_config = {
                        'enabled': config.EMAIL_NOTIFICATIONS_ENABLED,
                        'server': getattr(config, 'SMTP_SERVER', ''),
                        'port': getattr(config, 'SMTP_PORT', 587),
                        'username': getattr(config, 'SMTP_USERNAME', ''),
                        'password': getattr(config, 'SMTP_PASSWORD', ''),
                        'from_email': getattr(config, 'SMTP_FROM_EMAIL', ''),
                        'from_name': getattr(config, 'SMTP_FROM_NAME', 'Flood Alert System')
                    }
                    
                    # Send email in background (don't block response)
                    try:
                        email_sent_flag = send_flood_alert_email(
                            recipient_email=recipient_email,
                            location_lat=lat,
                            location_lon=lon,
                            flood_probability=probability,
                            risk_level=response['risk_level'],
                            features=features,
                            smtp_config=smtp_config
                        )
                        response['email_sent'] = email_sent_flag
                    except Exception as email_error:
                        print(f"⚠️ Email notification failed: {str(email_error)}")
                        response['email_sent'] = False
                else:
                    print("⚠️ No recipient email configured. Skipping email notification.")
                    response['email_sent'] = False
        
        # Save prediction to database
        save_prediction(
            user_id=user_id,
            latitude=lat,
            longitude=lon,
            flood_probability=probability,
            risk_level=response['risk_level'],
            email_sent=email_sent_flag
        )

        if response['risk_level'] in ('MEDIUM', 'HIGH'):
            create_notification(
                message=(
                    f"{response['risk_level']} flood risk predicted at "
                    f"{lat:.4f}, {lon:.4f} ({response['flood_probability_percent']:.1f}%)."
                ),
                alert_type='prediction',
                risk_level=response['risk_level'],
                flood_probability=probability,
                latitude=lat,
                longitude=lon,
                features=response.get('features')
            )
        
        return jsonify(response), 200
        
    except Exception as e:
        # Log the full error for debugging
        import traceback
        print(f"\n❌ ERROR in /predict endpoint:")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print(f"Traceback:")
        traceback.print_exc()
        
        return jsonify({'error': str(e)}), 500

@app.route('/report_incident', methods=['POST'])
@login_required
def report_incident_route():
    try:
        user_id = session['user_id']
        username = session.get('username', 'A citizen')

        incident_type = request.form.get('incident_type', 'Incident')
        description = request.form.get('description', '').strip()
        latitude = request.form.get('latitude')
        longitude = request.form.get('longitude')

        if not description:
            return jsonify({'success': False, 'message': 'Description is required'}), 400

        image_path = None
        image_file = request.files.get('image')

        if image_file and image_file.filename and allowed_file(image_file.filename):
            ext = image_file.filename.rsplit('.', 1)[1].lower()
            filename = secure_filename(f"{uuid.uuid4().hex}.{ext}")
            image_file.save(str(UPLOAD_FOLDER / filename))
            image_path = f"uploads/incidents/{filename}"

        incident_id = save_incident(
            user_id=user_id,
            incident_type=incident_type,
            description=description,
            latitude=float(latitude) if latitude else None,
            longitude=float(longitude) if longitude else None,
            image_path=image_path
        )

        if incident_id is None:
            return jsonify({'success': False, 'message': 'Failed to save incident'}), 500

        # This is what makes it show up as an alert on the community dashboard
        create_notification(
            message=f"{username} reported '{incident_type}': {description[:80]}",
            incident_id=incident_id
        )

        return jsonify({
            'success': True,
            'message': 'Incident submitted successfully',
            'incident_id': incident_id
        }), 201

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    
@app.route('/citizen_alerts', methods=['GET'])
@login_required
def citizen_alerts():
    return jsonify({
        'flood_alert': 'None',
        'weather_alert': 'Normal',
        'incident_count': get_incident_count(status='pending'),
        'evacuation_status': 'Not Required'
    })

@app.route('/notifications/count', methods=['GET'])
def notifications_count():
    return jsonify({'count': get_unread_notification_count(alert_type='prediction')})


# ============================================================
# WEB PUSH NOTIFICATION ROUTES
# ============================================================

@app.route('/api/push/vapid-public-key', methods=['GET'])
def push_vapid_public_key():
    """Return VAPID public key for client-side subscription."""
    key = os.environ.get('VAPID_PUBLIC_KEY', '')
    return jsonify({'public_key': key, 'available': bool(key)})


@app.route('/api/push/subscribe', methods=['POST'])
@login_required
def push_subscribe():
    """Save a Web Push subscription from the browser."""
    try:
        sys.path.append(str(Path(__file__).parent.parent / 'src'))
        from push_notifications import (
            init_push_subscriptions_table,
            save_push_subscription,
        )
        init_push_subscriptions_table()

        data     = request.get_json() or {}
        endpoint = data.get('endpoint', '').strip()
        keys     = data.get('keys', {})
        p256dh   = keys.get('p256dh', '').strip()
        auth     = keys.get('auth', '').strip()

        if not endpoint or not p256dh or not auth:
            return jsonify({'success': False, 'error': 'Missing subscription fields'}), 400

        ok = save_push_subscription(
            user_id  = session['user_id'],
            endpoint = endpoint,
            p256dh   = p256dh,
            auth     = auth,
        )
        return jsonify({'success': ok}), 201 if ok else 500

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/push/unsubscribe', methods=['POST'])
@login_required
def push_unsubscribe():
    """Remove a Web Push subscription."""
    try:
        from push_notifications import delete_push_subscription
        data     = request.get_json() or {}
        endpoint = data.get('endpoint', '').strip()
        if not endpoint:
            return jsonify({'success': False, 'error': 'Missing endpoint'}), 400
        ok = delete_push_subscription(endpoint)
        return jsonify({'success': ok})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/push/test', methods=['POST'])
@login_required
def push_test():
    """Send a test push notification to the logged-in user."""
    try:
        from push_notifications import (
            init_push_subscriptions_table,
            broadcast_push_notification,
        )
        init_push_subscriptions_table()
        sent = broadcast_push_notification(
            payload = {
                'title': 'FloodWatch Test',
                'body':  'Push notifications are working correctly.',
                'url':   '/notifications',
                'tag':   'fw-test',
            },
            user_id = session['user_id'],
        )
        return jsonify({'success': True, 'sent': sent})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/notifications/mark_read', methods=['POST'])
def notifications_mark_read():
    mark_all_notifications_read()
    return jsonify({'success': True})


@app.route('/api/broadcast_alert', methods=['POST'])
@login_required
def broadcast_alert():
    """
    Explicitly push a prediction alert into the notifications table
    so all other open dashboards pick it up on their next poll.
    Called by the frontend after a MEDIUM / HIGH prediction result.
    Body: { risk_level, flood_probability, latitude, longitude }
    """
    try:
        data = request.get_json() or {}
        risk_level = str(data.get('risk_level', 'MEDIUM')).upper()
        probability = float(data.get('flood_probability', 0))
        lat = data.get('latitude')
        lon = data.get('longitude')

        if risk_level not in ('MEDIUM', 'HIGH'):
            return jsonify({'success': False, 'error': 'Only MEDIUM/HIGH alerts are broadcast'}), 400

        pct = probability * 100 if probability <= 1 else probability

        notification_id = create_notification(
            message=(
                f"\u26a0\ufe0f {risk_level} flood risk: {pct:.1f}% probability at "
                f"{float(lat):.4f}, {float(lon):.4f}"
            ),
            alert_type='prediction',
            risk_level=risk_level,
            flood_probability=probability,
            latitude=float(lat) if lat is not None else None,
            longitude=float(lon) if lon is not None else None
        )

        return jsonify({'success': True, 'notification_id': notification_id}), 201

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print("\n🚀 Starting Flood Prediction API...")
    initialize_app()
    app.run(
        debug=os.environ.get('FLASK_DEBUG', str(getattr(config, 'DEBUG_MODE', False))).lower() == 'true',
        host=os.environ.get('HOST', getattr(config, 'API_HOST', '0.0.0.0')),
        port=int(os.environ.get('PORT', getattr(config, 'API_PORT', 5000)))
    )
