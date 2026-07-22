"""
Multi-Channel Notification Service
Sends flood alerts via Email, SMS, and WhatsApp
"""

import os
import smtplib
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime


class NotificationService:
    """Unified notification service for all channels"""
    
    def __init__(self):
        # Email configuration
        self.smtp_server = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.environ.get('SMTP_PORT', 587))
        self.smtp_username = os.environ.get('SMTP_USERNAME', '')
        self.smtp_password = os.environ.get('SMTP_PASSWORD', '')
        self.from_email = os.environ.get('SMTP_USERNAME', self.smtp_username)
        self.from_name = os.environ.get('SMTP_FROM_NAME', 'FloodWatch Alerts')
        
        # Twilio configuration (for SMS and WhatsApp)
        self.twilio_account_sid = os.environ.get('TWILIO_ACCOUNT_SID', '')
        self.twilio_auth_token = os.environ.get('TWILIO_AUTH_TOKEN', '')
        self.twilio_phone = os.environ.get('TWILIO_PHONE_NUMBER', '')  # SMS from number
        self.twilio_whatsapp = os.environ.get('TWILIO_WHATSAPP_FROM', '')  # WhatsApp from number
        
        # Try to import Twilio
        self.twilio_available = False
        try:
            from twilio.rest import Client
            if self.twilio_account_sid and self.twilio_auth_token:
                self.twilio_client = Client(self.twilio_account_sid, self.twilio_auth_token)
                self.twilio_available = True
                print("✓ Twilio client initialized")
            else:
                print("⚠️ Twilio credentials not found. SMS/WhatsApp will be disabled.")
        except ImportError:
            print("⚠️ Twilio SDK not installed. SMS/WhatsApp will be disabled.")
    
    def send_email(self, recipient_email, subject, body_text, body_html=None):
        """
        Send email notification
        
        Args:
            recipient_email (str): Recipient email address
            subject (str): Email subject
            body_text (str): Plain text body
            body_html (str): HTML body (optional)
            
        Returns:
            bool: True if sent, False otherwise
        """
        if not self.smtp_username or not self.smtp_password:
            print("⚠️ Email not configured. Skipping email notification.")
            return False
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = recipient_email
            
            # Add plain text part
            msg.attach(MIMEText(body_text, 'plain'))
            
            # Add HTML part if provided
            if body_html:
                msg.attach(MIMEText(body_html, 'html'))
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            print(f"✓ Email sent to {recipient_email}")
            return True
        
        except Exception as e:
            print(f"❌ Email failed for {recipient_email}: {str(e)}")
            return False
    
    def send_sms(self, phone_number, message):
        """
        Send SMS notification via Twilio
        
        Args:
            phone_number (str): Recipient phone in E.164 format (e.g., +919876543210)
            message (str): SMS message body
            
        Returns:
            bool: True if sent, False otherwise
        """
        if not self.twilio_available or not self.twilio_phone:
            print("⚠️ SMS not configured. Skipping SMS notification.")
            return False
        
        try:
            # Twilio message limit is 160 chars, truncate if needed
            if len(message) > 160:
                message = message[:157] + "..."
            
            msg = self.twilio_client.messages.create(
                body=message,
                from_=self.twilio_phone,
                to=phone_number
            )
            
            print(f"✓ SMS sent to {phone_number} (SID: {msg.sid})")
            return True
        
        except Exception as e:
            print(f"❌ SMS failed for {phone_number}: {str(e)}")
            return False
    
    def send_whatsapp(self, phone_number, message, image_url=None):
        """
        Send WhatsApp notification via Twilio
        
        Args:
            phone_number (str): Recipient phone in E.164 format (e.g., +919876543210)
            message (str): WhatsApp message body
            image_url (str): Optional image URL to send
            
        Returns:
            bool: True if sent, False otherwise
        """
        if not self.twilio_available or not self.twilio_whatsapp:
            print("⚠️ WhatsApp not configured. Skipping WhatsApp notification.")
            return False
        
        try:
            # Format phone number for WhatsApp (add 'whatsapp:' prefix)
            whatsapp_number = f"whatsapp:{phone_number}"
            from_number = f"whatsapp:{self.twilio_whatsapp}"
            
            if image_url:
                # Send message with image
                msg = self.twilio_client.messages.create(
                    body=message,
                    from_=from_number,
                    to=whatsapp_number,
                    media_url=image_url
                )
            else:
                # Send text-only message
                msg = self.twilio_client.messages.create(
                    body=message,
                    from_=from_number,
                    to=whatsapp_number
                )
            
            print(f"✓ WhatsApp sent to {phone_number} (SID: {msg.sid})")
            return True
        
        except Exception as e:
            print(f"❌ WhatsApp failed for {phone_number}: {str(e)}")
            return False
    
    def send_flood_alert(self, recipient_email, recipient_phone, risk_level, 
                        latitude, longitude, probability, features=None,
                        channels=['email', 'sms', 'whatsapp']):
        """
        Send comprehensive flood alert via multiple channels
        
        Args:
            recipient_email (str): Email address
            recipient_phone (str): Phone number (E.164 format)
            risk_level (str): 'LOW', 'MEDIUM', or 'HIGH'
            latitude (float): Prediction latitude
            longitude (float): Prediction longitude
            probability (float): Flood probability (0-1)
            features (dict): Feature data for detailed alert
            channels (list): Notification channels to use
            
        Returns:
            dict: Delivery status for each channel
        """
        
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        probability_pct = probability * 100
        
        # Color coding for risk levels
        risk_colors = {
            'LOW': '🟢',
            'MEDIUM': '🟡',
            'HIGH': '🔴'
        }
        
        results = {}
        
        # ========== EMAIL ==========
        if 'email' in channels:
            subject = f"🚨 {risk_colors.get(risk_level, '⚪')} FloodWatch Alert: {risk_level} FLOOD RISK"
            
            body_text = f"""
FLOODWATCH FLOOD ALERT
{'='*50}

Risk Level: {risk_level}
Probability: {probability_pct:.1f}%
Location: {latitude:.4f}, {longitude:.4f}
Timestamp: {timestamp}

{'='*50}

ALERT DETAILS:
- High flood risk detected at your location
- Probability: {probability_pct:.1f}%
- Risk Classification: {risk_level}

RECOMMENDATIONS:
"""
            
            if risk_level == 'HIGH':
                body_text += """- Evacuate immediately if in flood-prone area
- Move to higher ground
- Contact emergency services: 911 or local disaster management
- Do NOT attempt to cross flooded areas"""
            elif risk_level == 'MEDIUM':
                body_text += """- Remain alert and monitor weather
- Prepare evacuation plan
- Keep emergency contacts ready
- Avoid low-lying areas"""
            else:  # LOW
                body_text += """- Monitor weather updates
- Be prepared for unexpected changes
- Keep emergency kit accessible"""
            
            body_text += f"""

FEATURES DETECTED:
- Rainfall (7d): {features.get('rainfall_7d_mm', 'N/A'):.1f} mm
- Soil Moisture: {features.get('soil_moisture', 'N/A'):.2%}
- Elevation: {features.get('elevation_m', 'N/A'):.0f} m
- Slope: {features.get('slope_deg', 'N/A'):.1f}°

For more details, visit: https://floodwatch-lc04.onrender.com

Stay Safe!
FloodWatch Team
"""
            
            body_html = f"""
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6;">
    <div style="max-width: 600px; margin: 0 auto; border: 2px solid {self._risk_color(risk_level)}; border-radius: 10px; padding: 20px;">
      <h1 style="color: {self._risk_color(risk_level)}; text-align: center;">
        {risk_colors.get(risk_level, '⚪')} FloodWatch Flood Alert
      </h1>
      
      <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h2>Risk Level: <span style="color: {self._risk_color(risk_level)};">{risk_level}</span></h2>
        <p><strong>Flood Probability:</strong> {probability_pct:.1f}%</p>
        <p><strong>Location:</strong> {latitude:.4f}, {longitude:.4f}</p>
        <p><strong>Time:</strong> {timestamp}</p>
      </div>
      
      <h3>⚠️ Recommendations:</h3>
      <ul>
        {self._get_recommendations_html(risk_level)}
      </ul>
      
      <h3>📊 Environmental Features:</h3>
      <ul>
        <li>Rainfall (7 days): {features.get('rainfall_7d_mm', 'N/A'):.1f} mm</li>
        <li>Soil Moisture: {features.get('soil_moisture', 'N/A'):.2%}</li>
        <li>Elevation: {features.get('elevation_m', 'N/A'):.0f} m</li>
        <li>Slope: {features.get('slope_deg', 'N/A'):.1f}°</li>
      </ul>
      
      <p style="text-align: center; color: #666; margin-top: 30px;">
        <a href="https://floodwatch-lc04.onrender.com" style="color: #0066cc; text-decoration: none;">
          View Details in FloodWatch App
        </a>
      </p>
      
      <p style="text-align: center; color: #999; font-size: 12px;">
        FloodWatch - Real-time Flood Prediction System<br/>
        Stay Safe. Stay Informed.
      </p>
    </div>
  </body>
</html>
"""
            
            results['email'] = self.send_email(recipient_email, subject, body_text, body_html)
        
        # ========== SMS ==========
        if 'sms' in channels:
            sms_message = f"{risk_colors.get(risk_level, '⚪')} FLOODWATCH ALERT: {risk_level} flood risk ({probability_pct:.0f}%) at {latitude:.2f}, {longitude:.2f}. {self._get_sms_action(risk_level)} Info: https://floodwatch-lc04.onrender.com"
            results['sms'] = self.send_sms(recipient_phone, sms_message)
        
        # ========== WHATSAPP ==========
        if 'whatsapp' in channels:
            whatsapp_message = f"""{risk_colors.get(risk_level, '⚪')} *FLOODWATCH FLOOD ALERT*

*Risk Level:* {risk_level}
*Probability:* {probability_pct:.1f}%
*Location:* {latitude:.4f}, {longitude:.4f}
*Time:* {timestamp}

*Action:*
{self._get_whatsapp_action(risk_level)}

📍 Rainfall: {features.get('rainfall_7d_mm', 'N/A'):.1f}mm
💧 Soil Moisture: {features.get('soil_moisture', 'N/A'):.0%}
⛰️ Elevation: {features.get('elevation_m', 'N/A'):.0f}m
📐 Slope: {features.get('slope_deg', 'N/A'):.1f}°

Learn more: https://floodwatch-lc04.onrender.com"""
            
            results['whatsapp'] = self.send_whatsapp(recipient_phone, whatsapp_message)
        
        return results
    
    def _risk_color(self, risk_level):
        """Get HTML color code for risk level"""
        colors = {
            'HIGH': '#dc3545',
            'MEDIUM': '#ffc107',
            'LOW': '#28a745'
        }
        return colors.get(risk_level, '#6c757d')
    
    def _get_recommendations_html(self, risk_level):
        """Get HTML formatted recommendations"""
        recommendations = {
            'HIGH': '<li>❌ EVACUATE IMMEDIATELY</li><li>Move to higher ground</li><li>Call emergency services</li><li>Do NOT cross flooded areas</li>',
            'MEDIUM': '<li>⚠️ STAY ALERT</li><li>Prepare evacuation route</li><li>Keep emergency contacts ready</li><li>Avoid low-lying areas</li>',
            'LOW': '<li>ℹ️ STAY INFORMED</li><li>Monitor weather updates</li><li>Keep emergency kit ready</li><li>Be prepared for changes</li>'
        }
        return recommendations.get(risk_level, '')
    
    def _get_sms_action(self, risk_level):
        """Get SMS action text (short due to character limit)"""
        actions = {
            'HIGH': 'EVACUATE NOW!',
            'MEDIUM': 'Prepare to evacuate.',
            'LOW': 'Monitor updates.'
        }
        return actions.get(risk_level, 'Stay informed.')
    
    def _get_whatsapp_action(self, risk_level):
        """Get WhatsApp action text"""
        actions = {
            'HIGH': '🚨 EVACUATE IMMEDIATELY\n• Move to higher ground\n• Contact emergency services\n• Avoid flooded areas',
            'MEDIUM': '⚠️ STAY ALERT\n• Prepare evacuation plan\n• Keep contacts ready\n• Monitor weather',
            'LOW': 'ℹ️ STAY INFORMED\n• Monitor weather updates\n• Prepare emergency kit\n• Be ready for changes'
        }
        return actions.get(risk_level, 'Stay informed.')


# Create global instance
notification_service = NotificationService()


if __name__ == '__main__':
    # Test the service
    print("Testing Notification Service...\n")
    
    test_features = {
        'rainfall_7d_mm': 45.5,
        'soil_moisture': 0.65,
        'elevation_m': 450.0,
        'slope_deg': 8.5
    }
    
    results = notification_service.send_flood_alert(
        recipient_email='test@example.com',
        recipient_phone='+919876543210',
        risk_level='HIGH',
        latitude=17.3850,
        longitude=78.4867,
        probability=0.75,
        features=test_features,
        channels=['email', 'sms', 'whatsapp']
    )
    
    print("\nDelivery Results:")
    print(json.dumps(results, indent=2))
