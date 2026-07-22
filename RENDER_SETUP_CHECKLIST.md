# Render Deployment Checklist

**Critical environment variables needed for predictions to work**

## ✅ Essential Variables (Must Have)

### 1. Google Earth Engine (GEE)
```
GOOGLE_APPLICATION_CREDENTIALS = {JSON content from service account key}
GEE_PROJECT = flood-prediction-0325
```

**How to get GEE credentials:**
1. Go to https://console.cloud.google.com/iam-admin/serviceaccounts
2. Create a new service account
3. Generate a JSON key
4. Enable Earth Engine API on the project
5. Copy the entire JSON and paste into Render environment variable

**Alternative: Use Base64 encoding (if JSON won't paste)**
1. Encode JSON: `base64 < service-account-key.json`
2. Add to Render:
   ```
   GEE_CREDENTIALS_B64 = [base64 string here]
   ```
3. Add decoding to `wsgi.py`:
   ```python
   import base64, json, os
   if 'GEE_CREDENTIALS_B64' in os.environ:
       creds_b64 = os.environ['GEE_CREDENTIALS_B64']
       creds_json = base64.b64decode(creds_b64).decode('utf-8')
       creds_dict = json.loads(creds_json)
       with open('/tmp/gee-creds.json', 'w') as f:
           json.dump(creds_dict, f)
       os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = '/tmp/gee-creds.json'
   ```

### 2. Flask/Security
```
SECRET_KEY = [let Render auto-generate]
FLASK_DEBUG = false
```

### 3. Server Configuration
```
HOST = 0.0.0.0
PORT = 10000
```

## 📊 Model & Prediction

### Check Model File

**On GitHub:**
```bash
git ls-files models/random_forest_flood_model.pkl
```

**If missing:**
1. Retrain locally: `python src/model_training.py`
2. Commit and push
3. Force Render rebuild: Settings → **Clear build cache** → **Deploy**

**If file too large (>100MB):**
- Use Git LFS: `git lfs install && git lfs track "*.pkl"`
- Or split model into smaller chunks

### Risk Thresholds
```
RISK_THRESHOLD_HIGH = 0.70      # ≥70% → HIGH risk
RISK_THRESHOLD_MEDIUM = 0.40    # ≥40% → MEDIUM risk
EMAIL_ALERT_THRESHOLD = 0.50    # Send email if ≥50% probability
```

## 📧 Email Alerts (Optional but Nice)

```
EMAIL_NOTIFICATIONS_ENABLED = true
SMTP_SERVER = smtp.gmail.com
SMTP_PORT = 587
SMTP_USERNAME = your-email@gmail.com
SMTP_PASSWORD = your-app-specific-password
SMTP_FROM_NAME = FloodWatch
```

**Gmail Setup:**
1. Enable 2-Factor Authentication on Google Account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use that password (not your actual Gmail password)

## 🔔 Web Push Notifications (Optional)

Generate at https://web-push-codelab.glitch.me/

```
VAPID_PUBLIC_KEY = [public key from above]
VAPID_PRIVATE_KEY = [private key from above]
VAPID_CLAIMS_EMAIL = your-email@example.com
```

## 🌐 CORS Configuration

```
CORS_ORIGINS = https://floodwatch-lc04.onrender.com
```

**Note:** After Render assigns your URL, update this. The URL has format: `https://[service-name].onrender.com`

---

## Verification Checklist

- [ ] Can you access https://floodwatch-lc04.onrender.com/api/status?
  - Should return: `{"status": "online", "gee_status": "connected"}`
  - If `gee_status` is `"disconnected"` → GEE credentials issue

- [ ] Can you log in?
  - If yes → authentication is working

- [ ] Can you make a prediction?
  - Click "Run Prediction" or "Check Flood Risk"
  - Open Browser DevTools (F12) → Network tab
  - Look for `/predict` request
  - Check response status and body

- [ ] Check Render Logs:
  - https://dashboard.render.com → Select service → Logs
  - Look for startup messages:
    ```
    ✓ Google Earth Engine initialized
    ✓ Model loaded successfully
    ```

---

## Troubleshooting

### Symptom: `{"error": "Failed to extract features"}`
**Solution:** GEE not initialized
- Check `GOOGLE_APPLICATION_CREDENTIALS` is set correctly
- Verify Earth Engine API is enabled in Google Cloud
- Check Render logs for GEE init errors

### Symptom: `{"error": "Prediction model not available"}`
**Solution:** Model file missing
- Verify `models/random_forest_flood_model.pkl` is committed to Git
- Force Render rebuild: Settings → **Clear build cache** → **Deploy**

### Symptom: `401 Unauthorized`
**Solution:** Authentication issue
- Make sure you're logged in
- Clear browser cookies and try again
- Check `SECRET_KEY` is set in Render

### Symptom: Timeout (>120s)
**Solution:** GEE query too slow
- Check network in Browser DevTools
- Verify satellite data is available for coordinates
- Add to Render env: `GEE_REQUEST_TIMEOUT = 180`

### Symptom: CORS error in browser console
**Solution:** CORS not configured
- Update `CORS_ORIGINS` to match your Render URL
- Make sure to use `https://`, not `http://`

---

## Quick Debug: Test with cURL

```bash
# First, get session cookie
curl -c cookies.txt -X POST https://floodwatch-lc04.onrender.com/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"testuser","password":"testpass"}'

# Then test prediction
curl -b cookies.txt -X POST https://floodwatch-lc04.onrender.com/predict \
  -H "Content-Type: application/json" \
  -d '{"latitude":17.3850,"longitude":78.4867}' \
  -v
```

Look for `< HTTP/1.1 200` (success) or error messages.

---

## Deploy Commands

```bash
# After updating environment variables:
1. Go to https://dashboard.render.com
2. Select your service
3. Settings → Environment Variables (verify all vars are there)
4. Manual Deploy: Click "Deploy" button
5. Check Logs for startup messages
6. Wait for "Service is live"
```

**If still failing after setting variables:**
1. Click Settings → **Clear build cache**
2. Click **Deploy**
3. Wait for full rebuild
4. Check logs again

