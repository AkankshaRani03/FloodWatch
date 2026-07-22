# Twilio Setup Guide for FloodWatch SMS & WhatsApp

This guide walks you through setting up Twilio for sending SMS and WhatsApp notifications.

---

## 🚀 Quick Start (5 minutes)

### Step 1: Create Twilio Account

1. Go to **https://www.twilio.com/try-twilio**
2. Sign up with email/phone
3. Verify your phone number
4. Complete onboarding

You'll get a **free $20 trial credit** (enough to test ~100 messages)

---

### Step 2: Get Your Credentials

1. Go to **Twilio Console**: https://console.twilio.com
2. Look for **Account SID** (looks like: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
3. Look for **Auth Token** (looks like: `3xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
4. **COPY BOTH** - you'll need them in Render environment variables

---

### Step 3: Get SMS Phone Number

1. In Twilio Console, go to **Messaging > Services > Messaging Services**
2. Click **Create Messaging Service**
3. Name it: `FloodWatch`
4. Choose **Conversations**
5. In **Phone Numbers**, click **Add Senders**
6. Choose **Buy a Phone Number**
7. Select country: **United States** (or your country)
8. Find a number you like
9. **BUY IT** (trial credit covers it)
10. **COPY THE PHONE NUMBER** (format: `+1234567890`)

---

### Step 4: Set Up WhatsApp Integration

#### Option A: Twilio WhatsApp Sandbox (Easiest - For Testing)

1. Go to **Twilio Console > Messaging > Try it out > Send an SMS**
2. Click **WhatsApp** tab
3. Click **Learn more about WhatsApp**
4. Scroll to **Try WhatsApp Sandbox**
5. Copy the **Sandbox Number** (format: `+1415xxxxxxx`)
6. Send a WhatsApp message to that number with: `join your-code`
7. You'll get back a message confirming setup
8. Your **phone is now verified in the sandbox**

#### Option B: Twilio WhatsApp Business Account (Production)

1. Go to **Messaging > WhatsApp Business Accounts**
2. Click **Create Business Account**
3. Follow Twilio's setup wizard
4. Connect your WhatsApp Business Account
5. Get your WhatsApp phone number (usually your Twilio SMS number)

**For now, use Option A (Sandbox) for testing.**

---

### Step 5: Add to Render Environment Variables

1. Go to **https://dashboard.render.com**
2. Select **floodwatch** service
3. Go to **Settings > Environment Variables**
4. Add these variables:

```
TWILIO_ACCOUNT_SID = ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN = 3xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER = +1234567890
TWILIO_WHATSAPP_FROM = +1415xxxxxxx
```

Replace with your actual values from Twilio.

5. Click **Save**
6. Render will auto-redeploy

---

### Step 6: Install Twilio SDK

Add to `requirements.txt`:

```
twilio==8.10.0
```

Or install locally:

```bash
pip install twilio==8.10.0
```

---

## 📋 Environment Variables Reference

| Variable | Value | Where to Find |
|----------|-------|---------------|
| `TWILIO_ACCOUNT_SID` | Your Account SID | Twilio Console > Account Info |
| `TWILIO_AUTH_TOKEN` | Your Auth Token | Twilio Console > Auth Token |
| `TWILIO_PHONE_NUMBER` | SMS sender number | Twilio > Phone Numbers (format: `+1234567890`) |
| `TWILIO_WHATSAPP_FROM` | WhatsApp number | Twilio > WhatsApp Sandbox (format: `+1415xxxxxxx`) |

---

## ✅ Test Credentials

Once added to Render, test with:

```python
from src.notification_service import notification_service

# Test SMS
notification_service.send_sms(
    '+919876543210',  # Your actual phone
    'Test SMS from FloodWatch'
)

# Test WhatsApp
notification_service.send_whatsapp(
    '+919876543210',  # Your actual phone
    'Test WhatsApp from FloodWatch'
)
```

---

## 💰 Pricing

**Trial Account (First 30 days):**
- SMS: $0.01/message (free within trial credit)
- WhatsApp: $0.07/message (free within trial credit)

**After Trial:**
- SMS: $0.01-$0.02 per message (depending on country)
- WhatsApp: $0.04-$0.10 per message
- **Monthly cost for 1000 alerts:** ~$30-50

**Free alternatives to reduce cost:**
- Use only Email for general users
- Use SMS/WhatsApp for HIGH risk alerts only
- Set up alerts threshold to reduce volume

---

## 🧪 Test WhatsApp Sandbox

Before sending to real users, test the sandbox:

1. Add your phone to Twilio WhatsApp Sandbox
2. Send message to sandbox number: `join your-code`
3. Receive confirmation from Twilio
4. Now you can receive WhatsApp messages in sandbox

**Sandbox Rules:**
- Only numbers you manually add can receive messages
- Good for testing before going production
- Add user numbers one by one in Twilio console

---

## 🚀 Go Live with WhatsApp Business Account

When ready for production:

1. Request WhatsApp Business Account approval
2. Provide:
   - Business name
   - Contact info
   - Website
   - Use case (flood alerts)
3. WhatsApp verifies (24-48 hours)
4. Once approved, users can receive messages

---

## 🔧 Troubleshooting

### "Twilio not configured" Error
→ Check that all 4 environment variables are set in Render

### "Invalid phone number" Error
→ Phone must be in E.164 format: `+1234567890` (with country code)

### SMS not receiving
→ Check Twilio SMS number is active in console
→ Verify phone number isn't in trial mode restriction

### WhatsApp not receiving
→ Ensure your phone is added to WhatsApp Sandbox
→ Send message to sandbox number with "join" keyword first

### Messages too long
→ SMS limit is 160 characters (auto-truncated in code)
→ WhatsApp supports longer messages

---

## 📞 Support

- **Twilio Docs**: https://www.twilio.com/docs
- **WhatsApp Setup**: https://www.twilio.com/docs/whatsapp
- **SMS API**: https://www.twilio.com/docs/sms
- **Status Page**: https://status.twilio.com

---

## Next Steps

1. ✅ Create Twilio account
2. ✅ Get credentials
3. ✅ Buy SMS number
4. ✅ Set up WhatsApp Sandbox
5. ✅ Add to Render env vars
6. ✅ Test messages
7. → Move to Task 3: Update Flask app to send notifications

