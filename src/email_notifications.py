"""
Email Notification System
Sends alert emails when flood probability exceeds threshold
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional

def send_flood_alert_email(
    recipient_email: str,
    location_lat: float,
    location_lon: float,
    flood_probability: float,
    risk_level: str,
    features: dict,
    smtp_config: dict
) -> bool:
    """
    Send flood alert email notification
    
    Args:
        recipient_email: Email address to send alert to
        location_lat: Latitude of prediction location
        location_lon: Longitude of prediction location
        flood_probability: Flood probability (0.0 to 1.0)
        risk_level: Risk level (HIGH/MEDIUM/LOW)
        features: Dictionary of feature values
        smtp_config: SMTP configuration dictionary
        
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    
    # Skip if email notifications disabled
    if not smtp_config.get('enabled', True):
        return False
    
    # Skip if SMTP not configured
    if not smtp_config.get('username') or not smtp_config.get('password'):
        print("⚠️ Email notifications not configured. Skipping email.")
        return False
    
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'🚨 FLOOD ALERT: {risk_level} Risk Detected'
        msg['From'] = f"{smtp_config.get('from_name', 'Flood Alert')} <{smtp_config.get('from_email')}>"
        msg['To'] = recipient_email
        
        # Create HTML email body
        probability_percent = flood_probability * 100
        
        # Determine color based on risk level
        if risk_level == 'HIGH':
            color = '#ef4444'
            emoji = '🔴'
        elif risk_level == 'MEDIUM':
            color = '#fbbf24'
            emoji = '🟡'
        else:
            color = '#4ade80'
            emoji = '🟢'
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }}
                .content {{
                    background: #f9fafb;
                    padding: 30px;
                    border: 1px solid #e5e7eb;
                    border-top: none;
                }}
                .alert-box {{
                    background: white;
                    border-left: 5px solid {color};
                    padding: 20px;
                    margin: 20px 0;
                    border-radius: 5px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}
                .risk-badge {{
                    display: inline-block;
                    background: {color};
                    color: white;
                    padding: 10px 20px;
                    border-radius: 20px;
                    font-weight: bold;
                    font-size: 18px;
                }}
                .feature-grid {{
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-top: 20px;
                }}
                .feature-item {{
                    background: white;
                    padding: 15px;
                    border-radius: 8px;
                    border: 1px solid #e5e7eb;
                }}
                .feature-label {{
                    font-size: 12px;
                    color: #6b7280;
                    text-transform: uppercase;
                }}
                .feature-value {{
                    font-size: 20px;
                    font-weight: bold;
                    color: #1e293b;
                    margin-top: 5px;
                }}
                .footer {{
                    text-align: center;
                    padding: 20px;
                    color: #6b7280;
                    font-size: 12px;
                    border: 1px solid #e5e7eb;
                    border-top: none;
                    border-radius: 0 0 10px 10px;
                    background: white;
                }}
                .button {{
                    display: inline-block;
                    background: #667eea;
                    color: white;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 5px;
                    margin-top: 20px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🌊 Flood Alert Notification</h1>
                <p>High flood risk detected at your monitored location</p>
            </div>
            
            <div class="content">
                <div class="alert-box">
                    <h2>{emoji} {risk_level} RISK ALERT</h2>
                    <p><strong>Flood Probability: {probability_percent:.1f}%</strong></p>
                    <span class="risk-badge">{risk_level} RISK</span>
                </div>
                
                <h3>📍 Location Details</h3>
                <p>
                    <strong>Latitude:</strong> {location_lat:.4f}°<br>
                    <strong>Longitude:</strong> {location_lon:.4f}°<br>
                    <strong>Date & Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
                </p>
                
                <h3>📊 Environmental Conditions</h3>
                <div class="feature-grid">
                    <div class="feature-item">
                        <div class="feature-label">🌧️ Rainfall (7-day)</div>
                        <div class="feature-value">{features.get('rainfall_7d_mm', 0):.1f} mm</div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-label">💧 Soil Moisture</div>
                        <div class="feature-value">{features.get('soil_moisture', 0):.1f}</div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-label">⛰️ Elevation</div>
                        <div class="feature-value">{features.get('elevation_m', 0):.1f} m</div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-label">📐 Slope</div>
                        <div class="feature-value">{features.get('slope_deg', 0):.1f}°</div>
                    </div>
                </div>
                
                <h3>⚠️ Recommended Actions</h3>
                <ul>
                    <li>Monitor weather updates closely</li>
                    <li>Prepare emergency supplies and evacuation kit</li>
                    <li>Stay informed about local flood warnings</li>
                    <li>Avoid low-lying areas and flood-prone zones</li>
                    <li>Keep emergency contacts readily available</li>
                </ul>
                
                <center>
                    <a href="http://localhost:5000" class="button">View Full Details</a>
                </center>
            </div>
            
            <div class="footer">
                <p>This is an automated alert from the Flood Prediction System</p>
                <p>Powered by Google Earth Engine, OpenWeatherMap, and Machine Learning</p>
                <p>© {datetime.now().year} Flood Prediction System. All rights reserved.</p>
            </div>
        </body>
        </html>
        """
        
        # Attach HTML body
        html_part = MIMEText(html_body, 'html')
        msg.attach(html_part)
        
        # Send email
        print(f"📧 Sending flood alert email to {recipient_email}...")
        
        with smtplib.SMTP(smtp_config['server'], smtp_config['port']) as server:
            server.starttls()
            server.login(smtp_config['username'], smtp_config['password'])
            server.send_message(msg)
        
        print(f"✅ Email sent successfully to {recipient_email}")
        return True
        
    except smtplib.SMTPAuthenticationError:
        print("❌ Email authentication failed. Check SMTP username/password.")
        return False
    except smtplib.SMTPException as e:
        print(f"❌ SMTP error: {str(e)}")
        return False
    except Exception as e:
        print(f"❌ Failed to send email: {str(e)}")
        return False


def test_email_configuration(smtp_config: dict, recipient_email: str) -> bool:
    """
    Test email configuration by sending a test email
    
    Args:
        smtp_config: SMTP configuration dictionary
        recipient_email: Email to send test message to
        
    Returns:
        bool: True if test successful, False otherwise
    """
    try:
        msg = MIMEText("This is a test email from the Flood Prediction System. Email notifications are working correctly!")
        msg['Subject'] = '✅ Flood Alert System - Test Email'
        msg['From'] = f"{smtp_config.get('from_name', 'Flood Alert')} <{smtp_config.get('from_email')}>"
        msg['To'] = recipient_email
        
        with smtplib.SMTP(smtp_config['server'], smtp_config['port']) as server:
            server.starttls()
            server.login(smtp_config['username'], smtp_config['password'])
            server.send_message(msg)
        
        print(f"✅ Test email sent successfully to {recipient_email}")
        return True
        
    except Exception as e:
        print(f"❌ Email test failed: {str(e)}")
        return False
