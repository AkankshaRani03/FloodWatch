# Prediction Endpoint Diagnostic Guide

**URL:** https://floodwatch-lc04.onrender.com  
**Test Coordinates:** Hyderabad (17.3850, 78.4867)

---

## MOST LIKELY FAILURE POINTS

Based on code analysis of `/predict` endpoint, here are the most common issues:

### 1. **GEE (Google Earth Engine) Not Initialized** ⚠️ HIGH PROBABILITY
- **Location:** `flask_app.py:670` - `gee_initialized` flag
- **Symptom:** Endpoint returns error about feature extraction
- **Cause:** 
  - `GOOGLE_APPLICATION_CREDENTIALS` env var not set on Render
  - GEE JSON key file not configured
  - Service account permissions missing
- **Evidence to look for in Render logs:**
  ```
  ❌ GEE initialization failed
  GEE not initialized (predictions may not work)
  ```

### 2. **Model File Missing or Corrupt** ⚠️ MEDIUM PROBABILITY
- **Location:** `flask_app.py:699` - model loading
- **Symptom:** `"Prediction model not available"` error
- **Cause:**
  - `random_forest_flood_model.pkl` not deployed to Render
  - Model file too large for Render's build cache
- **Response you'd see:**
  ```json
  {
    "error": "Prediction model not available",
    "message": "The ML model is not loaded. Predictions unavailable."
  }
  ```

### 3. **Feature Extraction Returns None** ⚠️ MEDIUM PROBABILITY
- **Location:** `flask_app.py:657-659` - feature extraction
- **Symptom:** Generic error with no details
- **Cause:**
  - GEE working but location is outside dataset coverage (unlikely for India)
  - API rate limits exceeded
  - Network timeout during data fetch
- **Response you'd see:**
  ```json
  {
    "error": "Failed to extract features (data unavailable for this location)"
  }
  ```

### 4. **Feature Array Contains None Values** ⚠️ MEDIUM PROBABILITY
- **Location:** `flask_app.py:666-667` - validation
- **Symptom:** Same as above
- **Cause:** One or more satellite data sources returned null

### 5. **Session/Authentication Issue** ⚠️ LOW PROBABILITY
- **Location:** `flask_app.py:587` - `@login_required` decorator
- **Symptom:** `401 Unauthorized` response
- **Cause:** Session cookie not being sent
- **Response you'd see:**
  ```json
  {
    "error": "Authentication required",
    "redirect": "/login"
  }
  ```

---

## How to Diagnose

### STEP 1: Check Render Logs

1. Go to **https://dashboard.render.com**
2. Select your **floodwatch** service
3. Click **Logs** tab
4. Look for startup messages (scroll to top):
   ```
   ✓ GEE initialized successfully
   OR
   ❌ GEE initialization failed
   ✓ Model loaded successfully
   OR
   ⚠️ Model file not found
   ```

### STEP 2: Test via Browser Developer Tools

1. Open https://floodwatch-lc04.onrender.com in browser
2. **Register/Login** with a test account
3. Open **Browser Dev Tools** (F12 → Network tab)
4. Enter coordinates: `17.3850` (lat), `78.4867` (lon)
5. Click "Run Prediction" / "Check Flood Risk"
6. In Network tab, find the `/predict` request:
   - **Status Code** — should be `200` (success) or `5xx` (server error)
   - **Response** — copy the exact JSON error message
   - **Size** — how long the request took (timeout issues?)

### STEP 3: Read the Error Message

**If you see:**
```json
{
  "error": "Failed to extract features (data unavailable for this location)"
}
```
→ **GEE is initialized but returning no data** — likely coordinates or date range issue

---

## SOLUTIONS

### ✅ If GEE is not initialized:

**On Render Dashboard:**
1. Go to **Settings** → **Environment Variables**
2. Add `GOOGLE_APPLICATION_CREDENTIALS` (one of these):

**Option A: Paste JSON contents directly**
```
GOOGLE_APPLICATION_CREDENTIALS = {"type": "service_account", "project_id": "...", ...}
```

**Option B: Base64-encode the JSON**
```bash
# On your local machine:
base64 -i /path/to/service-account-key.json  # Mac/Linux
certutil -encode service-account-key.json output.txt  # Windows
```
Then add:
```
GEE_CREDENTIALS_B64 = [base64 string]
```
And add this to `wsgi.py` to decode:
```python
import base64
import json
import os

if 'GEE_CREDENTIALS_B64' in os.environ:
    creds_b64 = os.environ['GEE_CREDENTIALS_B64']
    creds_json = base64.b64decode(creds_b64).decode('utf-8')
    creds_dict = json.loads(creds_json)
    with open('/tmp/gee-credentials.json', 'w') as f:
        json.dump(creds_dict, f)
    os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = '/tmp/gee-credentials.json'
```

### ✅ If Model file is missing:

**Check if file exists in repo:**
```bash
ls -la models/random_forest_flood_model.pkl
```

**If missing:**
1. Retrain model locally: `python src/model_training.py`
2. Commit & push to GitHub
3. Redeploy on Render (Render → Settings → **Deploys** → **Clear build cache** → **Deploy**)

### ✅ If feature extraction times out:

**On Render Dashboard → Environment Variables:**
Add/increase timeout:
```
GEE_REQUEST_TIMEOUT = 120  # seconds
```

Update `feature_extraction_gee.py` to use this timeout in GEE requests.

---

## Test the Endpoint with cURL

Run this from your local terminal to test without browser:

```bash
# 1. Login and get session cookie
curl -c cookies.txt -X POST https://floodwatch-lc04.onrender.com/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"testuser","password":"testpass"}'

# 2. Make prediction request with session cookie
curl -b cookies.txt -X POST https://floodwatch-lc04.onrender.com/predict \
  -H "Content-Type: application/json" \
  -d '{"latitude":17.3850,"longitude":78.4867}' \
  -v
```

**Look for in the response:**
- `< HTTP/1.1 200 OK` — Success
- `< HTTP/1.1 500 Internal Server Error` — Server error (check Render logs)
- `< HTTP/1.1 401 Unauthorized` — Session issue

---

## Render Logs Expected Output (Healthy App)

When app starts, you should see:
```
✓ Database initialized
✓ Google Earth Engine initialized
✓ Model loaded successfully
🚀 Starting Flood Prediction API...
```

**If you see any❌ or ⚠️ warnings, that's the root cause.**

---

## Quick Checklist

- [ ] Can you see Render logs?
- [ ] Do logs show `✓ GEE initialized`?
- [ ] Do logs show `✓ Model loaded successfully`?
- [ ] Can you log in to the app?
- [ ] When you click predict, what HTTP status code appears in Network tab?
- [ ] What is the exact error message in the response?

**Share these details in your next request and I can pinpoint the exact issue.**
