# 📧 Email Notification Setup Guide

## Quick Setup (Gmail Example)

### Step 1: Enable 2-Step Verification (If Using Gmail)
1. Go to: https://myaccount.google.com/security
2. Enable **2-Step Verification**

### Step 2: Create App Password (Gmail)
1. Go to: https://myaccount.google.com/apppasswords
2. Select app: **Mail**
3. Select device: **Other (Custom name)** → Enter "Flood Prediction System"
4. Click **Generate**
5. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

### Step 3: Configure Email Settings
Edit `configs/config.py`:

```python
# Email Notification Configuration
EMAIL_NOTIFICATIONS_ENABLED = True  # Set to True to enable
EMAIL_ALERT_THRESHOLD = 0.5  # Send email if flood probability >= 50%

# SMTP Configuration (Gmail)
SMTP_SERVER = 'smtp.gmail.com'
SMTP_PORT = 587
SMTP_USERNAME = 'your_email@gmail.com'  # Your Gmail address
SMTP_PASSWORD = 'abcd efgh ijkl mnop'  # App password from Step 2
SMTP_FROM_EMAIL = 'your_email@gmail.com'  # Same as username
SMTP_FROM_NAME = 'Flood Prediction System'

# Default recipient email
DEFAULT_ALERT_EMAIL = 'admin@example.com'  # Email to receive alerts
```

### Step 4: Restart Server
```bash
# Stop server (Ctrl+C in terminal)
cd api
python flask_app.py
```

### Step 5: Test
1. Make a prediction with flood probability > 50%
2. Check your email inbox for alert

---

## Features

### 🔔 Browser Notifications
- **Automatic popup** when flood probability >= 50%
- Shows risk level, probability, and quick actions
- Auto-dismisses after 10 seconds
- Notification badge in header

### 📧 Email Alerts
- **HTML-formatted emails** with detailed information
- Sent when flood probability >= 50%
- Includes:
  - Risk level and probability
  - Location coordinates
  - Environmental conditions (rainfall, soil moisture, elevation, slope)
  - Recommended actions
  - Direct link to system

### 📱 Notifications Page
- Dedicated page at `/notifications`
- Stores last 50 high-risk predictions
- Persistent storage (localStorage)
- Beautiful UI with color-coded alerts
- Detailed conditions and recommendations
- Individual dismiss or clear all

---

## Configuration Options

### Email Threshold
```python
EMAIL_ALERT_THRESHOLD = 0.5  # Default: 50%
```
- `0.5` = Send email if probability >= 50%
- `0.7` = Send email if probability >= 70% (HIGH risk only)
- `0.4` = Send email if probability >= 40% (MEDIUM and HIGH)

### Disable Email Notifications
```python
EMAIL_NOTIFICATIONS_ENABLED = False
```
Browser notifications will still work, but no emails will be sent.

### Multiple Recipients (Future Enhancement)
Currently supports one default email. To send to multiple recipients, modify `src/email_notifications.py`:

```python
# Add multiple recipients separation by comma
recipient_email = 'admin1@example.com,admin2@example.com'
```

---

## SMTP Settings for Other Email Providers

### Gmail
```python
SMTP_SERVER = 'smtp.gmail.com'
SMTP_PORT = 587
```

### Outlook/Hotmail
```python
SMTP_SERVER = 'smtp-mail.outlook.com'
SMTP_PORT = 587
```

### Yahoo Mail
```python
SMTP_SERVER = 'smtp.mail.yahoo.com'
SMTP_PORT = 587
```

### Custom Domain (cPanel/WHM)
```python
SMTP_SERVER = 'mail.yourdomain.com'
SMTP_PORT = 587  # or 465 for SSL
```

---

## Troubleshooting

### Problem 1: "Email authentication failed"
**Cause**: Incorrect username/password or App Password not created

**Solutions**:
1. For Gmail: Create App Password (Step 2 above)
2. Check username is full email address
3. Verify no extra spaces in password
4. Try regular password if App Password doesn't work (less secure)

### Problem 2: "SMTP connection failed"
**Cause**: Firewall blocking SMTP port or wrong server

**Solutions**:
1. Check SMTP server address is correct
2. Try port 465 with SSL: `smtplib.SMTP_SSL()`
3. Check firewall allows outgoing port 587

### Problem 3: Emails going to spam
**Cause**: Email not properly authenticated

**Solutions**:
1. Add sender to contacts/whitelist
2. Check SPF/DKIM records (if using custom domain)
3. Use professional "From Name"

### Problem 4: No email received
**Cause**: Threshold not met or email disabled

**Solutions**:
1. Check `EMAIL_NOTIFICATIONS_ENABLED = True`
2. Verify `EMAIL_ALERT_THRESHOLD` is set correctly
3. Make prediction with probability > threshold
4. Check `DEFAULT_ALERT_EMAIL` is configured
5. Look at terminal for email sending logs

### Problem 5: Gmail "Less secure app" error
**Cause**: Gmail requires App Password

**Solution**:
- Enable 2-Step Verification
- Create App Password (see Step 2 above)
- Use App Password in `SMTP_PASSWORD`

---

## Testing Email Configuration

Run this Python snippet to test email:

```bash
cd D:\flood_prediction
.\venv\Scripts\activate
python
```

```python
import sys
sys.path.append('src')
sys.path.append('configs')

from email_notifications import test_email_configuration
import config

smtp_config = {
    'enabled': config.EMAIL_NOTIFICATIONS_ENABLED,
    'server': config.SMTP_SERVER,
    'port': config.SMTP_PORT,
    'username': config.SMTP_USERNAME,
    'password': config.SMTP_PASSWORD,
    'from_email': config.SMTP_FROM_EMAIL,
    'from_name': config.SMTP_FROM_NAME
}

# Test email
result = test_email_configuration(smtp_config, 'your_test_email@example.com')

if result:
    print("✅ Email configuration is working!")
else:
    print("❌ Email configuration has issues. Check settings.")
```

---

## Email Template Preview

The email looks like this:

```
╔════════════════════════════════════════╗
║                                        ║
║  🌊 Flood Alert Notification          ║
║                                        ║
╚════════════════════════════════════════╝

🚨 HIGH RISK ALERT

Flood Probability: 78.5%
[HIGH RISK]

📍 Location Details
Latitude: 28.6139°
Longitude: 77.2090°
Date & Time: 2026-02-06 15:30:45

📊 Environmental Conditions
🌧️ Rainfall (7-day): 125.3 mm
💧 Soil Moisture: 45.2
⛰️ Elevation: 220.5 m
📐 Slope: 3.2°

⚠️ Recommended Actions
• Monitor weather updates closely
• Prepare emergency supplies
• Stay informed about local warnings
• Avoid low-lying areas
• Keep emergency contacts ready

[View Full Details]

────────────────────────────────────────
This is an automated alert from the
Flood Prediction System
Powered by Google Earth Engine,
OpenWeatherMap, and Machine Learning
© 2026 Flood Prediction System
```

---

## Security Best Practices

### ✅ DO:
- Use App Passwords (Gmail, Outlook)
- Keep SMTP credentials in config.py (not in code)
- Use environment variables for production
- Enable 2-Step Verification
- Regularly rotate passwords

### ❌ DON'T:
- Commit config.py with real passwords to Git
- Share SMTP credentials
- Use main account password (use App Password)
- Hardcode credentials in code files
- Allow "Less secure apps" on Gmail

---

## Production Deployment

For production, use environment variables instead:

```python
# In config.py
import os

SMTP_USERNAME = os.getenv('SMTP_USERNAME', '')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
DEFAULT_ALERT_EMAIL = os.getenv('ALERT_EMAIL', '')
```

Then set environment variables:
```bash
# Windows
set SMTP_USERNAME=your_email@gmail.com
set SMTP_PASSWORD=your_app_password
set ALERT_EMAIL=admin@example.com

# Linux/Mac
export SMTP_USERNAME=your_email@gmail.com
export SMTP_PASSWORD=your_app_password
export ALERT_EMAIL=admin@example.com
```

---

## Summary

✅ **Enabled**: Email notifications + Browser notifications + Notifications page  
📧 **Threshold**: 50% flood probability (configurable)  
🔐 **Secure**: Gmail App Passwords supported  
📱 **Persistent**: Last 50 high-risk predictions saved  
🎨 **Beautiful**: HTML emails + Modern UI  

**Get started**: Follow Step 1-5 above and test with a prediction! 🚀
