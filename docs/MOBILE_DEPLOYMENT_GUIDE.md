# FloodWatch Mobile Deployment Guide

This app should work like a normal government/citizen mobile app. That means it must run on a public HTTPS server, not on a laptop Wi-Fi address.

## Correct Production Setup

Citizens should open a public URL such as:

```text
https://floodwatch-yourcity.example
```

Then Android Chrome can show:

```text
Install app
```

Local URLs such as these are only for development:

```text
http://127.0.0.1:5000
http://192.168.0.107:5000
```

They are not the final citizen access method.

## Recommended Demo Deployment

For EPICS/government demo, the easiest path is:

1. Push this project to GitHub.
2. Deploy the Flask app to a public HTTPS host.
3. Set production environment variables.
4. Open the public URL on Android Chrome.
5. Tap `Install app`.

Good hosting choices:

- Render
- Railway
- Fly.io
- Azure App Service
- AWS Elastic Beanstalk / EC2

For a student demo, Render or Railway is usually the simplest.

## Required Environment Variables

Set these in the hosting platform:

```text
SECRET_KEY=long-random-secret
FLASK_DEBUG=false
CORS_ORIGINS=https://your-public-domain.example
GEE_PROJECT=flood-prediction-0325
```

If email alerts are enabled, also set:

```text
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@example.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=your_email@example.com
SMTP_FROM_NAME=FloodWatch
DEFAULT_ALERT_EMAIL=admin@example.com
```

## Deployment Files Already Added

The project includes:

```text
Procfile
wsgi.py
runtime.txt
static/manifest.json
static/service-worker.js
static/js/pwa.js
static/offline.html
static/icons/floodwatch-icon.svg
```

The production start command is:

```text
gunicorn wsgi:app
```

## Important: Google Earth Engine

The prediction API depends on Google Earth Engine. On a real server, GEE authentication must be configured for that server.

For production, use a service account or hosted credentials. Do not depend on a browser login from your laptop.

If GEE is not authenticated on the server, the website may open, but prediction will fail.

## Important: Database

The current app uses SQLite. That is okay for local demo and small hosted demos, but for a real government-style app, use PostgreSQL.

For public deployment:

- Demo: SQLite can work if the host has persistent disk.
- Serious deployment: PostgreSQL is recommended.

## How Citizens Use It

After deployment:

1. Citizen opens the public HTTPS URL.
2. Registers or logs in.
3. Uses the mobile dashboard.
4. Android Chrome offers app installation.
5. The app launches from the home screen like a normal mobile app.

## PWA Install Check

Open the deployed HTTPS URL in Chrome DevTools:

```text
Application -> Manifest
Application -> Service Workers
```

Both should show valid entries.

On Android:

```text
Chrome menu -> Install app
```

If install does not appear, check:

- The URL is HTTPS.
- `/manifest.json` opens.
- `/service-worker.js` opens.
- The icon loads.
- No service worker errors appear in browser console.

