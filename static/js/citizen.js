// ==========================================================
// FloodWatch Citizen Dashboard
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {

    initializeMap("map");

    // Sync the map with the lat/lng values already sitting in the
    // input boxes on first load, instead of showing an unrelated
    // zoomed-out view of India.
    syncMapWithInputs();

    initializeCitizenDashboard();

});


// ==========================================================
// Sync map marker with current input values
// ==========================================================

function syncMapWithInputs() {

    const latitude = parseFloat(
        document.getElementById("latitude").value
    );

    const longitude = parseFloat(
        document.getElementById("longitude").value
    );

    if (isNaN(latitude) || isNaN(longitude)) return;

    updateLocation(latitude, longitude);

    if (map) {
        map.setView([latitude, longitude], 11);
    }

}


// ==========================================================
// Initialize Dashboard
// ==========================================================

function initializeCitizenDashboard() {

    const predictBtn = document.getElementById("predictBtn");

    if (predictBtn) {

        predictBtn.addEventListener(

            "click",

            runRiskAssessment

        );

    }

}


// ==========================================================
// Risk Assessment
// ==========================================================

async function runRiskAssessment() {

    const latitude = parseFloat(

        document.getElementById("latitude").value

    );

    const longitude = parseFloat(

        document.getElementById("longitude").value

    );

    if (isNaN(latitude) || isNaN(longitude)) {

        showError(

            "Please enter valid coordinates."

        );

        return;

    }

    document

        .getElementById("loadingCard")

        .classList.remove("hidden");

    document

        .getElementById("resultsCard")

        .classList.add("hidden");

    dismissPredictionAlert();

    try {

        const response = await fetchJSON(
            "/api/predict-simple",

            {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    latitude: latitude,

                    longitude: longitude

                })

            }

        );

        updatePrediction(response);

        broadcastPredictionAlert(response, latitude, longitude);

    }

    catch (error) {

        console.error(error);

        showError(

            "Prediction failed."

        );

    }

    finally {

        document

            .getElementById("loadingCard")

            .classList.add("hidden");

    }

}


// ==========================================================
// Update Prediction
// ==========================================================

function updatePrediction(data) {

    document

        .getElementById("resultsCard")

        .classList.remove("hidden");

    const probability = getPredictionPercent(data);

    const features = getPredictionFeatures(data);

    document

        .getElementById("riskPercentage")

        .textContent =

        probability.toFixed(1) + "%";

    document

        .getElementById("gaugeFill")

        .style.width =

        probability + "%";

    const riskLevel =

        getRiskLevel(probability);

    const badge =

        document.getElementById("riskBadge");

    badge.className =

        "risk-badge " +

        riskLevel.className;

    document

        .getElementById("riskLevel")

        .textContent =

        riskLevel.label;

    document

        .getElementById("riskSummary")

        .textContent =

        riskLevel.label;

    document

        .getElementById("rainfall")

        .textContent =

        formatNumber(

            features.rainfall

        ) + " mm";

    document

        .getElementById("soilMoisture")

        .textContent =

        formatNumber(

            features.soilMoisture

        );

    document

        .getElementById("elevation")

        .textContent =

        formatNumber(

            features.elevation

        ) + " m";

    document

        .getElementById("slope")

        .textContent =

        formatNumber(

            features.slope

        ) + "°";

}


// ==========================================================
// Risk Classification
// ==========================================================

function getRiskLevel(probability) {

    if (probability >= 70) {

        return {

            label: "HIGH",

            className: "risk-high"

        };

    }

    if (probability >= 40) {

        return {

            label: "MEDIUM",

            className: "risk-medium"

        };

    }

    return {

        label: "LOW",

        className: "risk-low"

    };

}
// ==========================================================
// Incident Reporting
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {

    const imageInput = document.getElementById("incidentImage");

    if (imageInput) {

        imageInput.addEventListener(

            "change",

            previewIncidentImage

        );

    }

    const submitBtn = document.getElementById("submitIncident");

    if (submitBtn) {

        submitBtn.addEventListener(

            "click",

            submitIncident

        );

    }

});


// ==========================================================
// Image Preview + EXIF GPS extraction
// ==========================================================

function previewIncidentImage(event) {

    const file = event.target.files[0];
    const preview = document.getElementById("imagePreview");
    const image   = document.getElementById("previewImage");

    if (!file || !preview || !image) return;

    // Compress image before preview/upload (max 1200px, 0.82 quality)
    compressImage(file, 1200, 0.82).then(compressed => {

        // Replace the file input with the compressed blob
        _compressedImageBlob = compressed;

        const url = URL.createObjectURL(compressed);
        image.src = url;
        preview.style.display = "block";

        // Show compression badge
        const ratio = ((1 - compressed.size / file.size) * 100).toFixed(0);
        let badge = document.getElementById("compressBadge");
        if (!badge) {
            badge = document.createElement("span");
            badge.id = "compressBadge";
            badge.className = "fw-compress-badge";
            preview.parentNode.insertBefore(badge, preview.nextSibling);
        }
        badge.innerHTML =
            `<i class="fa-solid fa-compress"></i> Compressed ${ratio}% smaller`;

    }).catch(() => {
        // Fallback: use original file
        _compressedImageBlob = file;
        const reader = new FileReader();
        reader.onload = e => { image.src = e.target.result; preview.style.display = "block"; };
        reader.readAsDataURL(file);
    });

    // Try to extract GPS coordinates from EXIF data
    extractExifGPS(file).then(coords => {
        if (!coords) return;
        const latInput = document.getElementById("latitude");
        const lonInput = document.getElementById("longitude");
        if (latInput) latInput.value = coords.lat.toFixed(6);
        if (lonInput) lonInput.value = coords.lon.toFixed(6);
        if (typeof updateLocation === "function") {
            updateLocation(coords.lat, coords.lon);
            if (typeof map !== "undefined" && map) map.setView([coords.lat, coords.lon], 13);
        }
        if (typeof showMobileToast === "function")
            showMobileToast("GPS location extracted from photo!", "success");
    });
}

// Holds the compressed blob between preview and submit
let _compressedImageBlob = null;

// ---- Image compression helper ----
function compressImage(file, maxPx, quality) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;
            if (width > maxPx || height > maxPx) {
                if (width > height) { height = Math.round(height * maxPx / width);  width  = maxPx; }
                else                { width  = Math.round(width  * maxPx / height); height = maxPx; }
            }
            const canvas = document.createElement("canvas");
            canvas.width  = width;
            canvas.height = height;
            canvas.getContext("2d").drawImage(img, 0, 0, width, height);
            canvas.toBlob(blob => blob ? resolve(blob) : reject(), "image/jpeg", quality);
        };
        img.onerror = reject;
        img.src = url;
    });
}

// ---- EXIF GPS extractor (no library needed) ----
function extractExifGPS(file) {
    return new Promise(resolve => {
        if (!file.type.startsWith("image/jpeg")) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const view   = new DataView(e.target.result);
                if (view.getUint16(0) !== 0xFFD8) { resolve(null); return; }
                let offset = 2;
                while (offset < view.byteLength) {
                    const marker = view.getUint16(offset);
                    if (marker === 0xFFE1) {        // APP1 / EXIF
                        const gps = parseExifGPS(view, offset + 4);
                        resolve(gps);
                        return;
                    }
                    if ((marker & 0xFF00) !== 0xFF00) break;
                    offset += 2 + view.getUint16(offset + 2);
                }
            } catch {}
            resolve(null);
        };
        reader.readAsArrayBuffer(file.slice(0, 65536));
    });
}

function parseExifGPS(view, start) {
    try {
        const exifStr = String.fromCharCode(...new Uint8Array(view.buffer, start, 6));
        if (!exifStr.startsWith("Exif")) return null;
        const little = view.getUint16(start + 6) === 0x4949;
        const ifd0   = start + 6 + view.getUint32(start + 10, little);
        const count  = view.getUint16(ifd0, little);
        let gpsOffset = null;
        for (let i = 0; i < count; i++) {
            const tag = view.getUint16(ifd0 + 2 + i * 12, little);
            if (tag === 0x8825) { gpsOffset = view.getUint32(ifd0 + 2 + i * 12 + 8, little) + start + 6; break; }
        }
        if (!gpsOffset) return null;
        const gpsCount = view.getUint16(gpsOffset, little);
        const gpsData  = {};
        for (let i = 0; i < gpsCount; i++) {
            const tag  = view.getUint16(gpsOffset + 2 + i * 12, little);
            const type = view.getUint16(gpsOffset + 2 + i * 12 + 2, little);
            const cnt  = view.getUint32(gpsOffset + 2 + i * 12 + 4, little);
            const vOff = gpsOffset + 2 + i * 12 + 8;
            if (type === 5 && cnt === 3) {  // RATIONAL x3 = lat/lon DMS
                const ptr = view.getUint32(vOff, little) + start + 6;
                const toDecimal = (off) => {
                    const d = view.getUint32(off, little) / view.getUint32(off + 4, little);
                    const m = view.getUint32(off + 8, little) / view.getUint32(off + 12, little);
                    const s = view.getUint32(off + 16, little) / view.getUint32(off + 20, little);
                    return d + m / 60 + s / 3600;
                };
                gpsData[tag] = toDecimal(ptr);
            }
            if (type === 2) {  // ASCII = N/S/E/W ref
                gpsData[tag] = String.fromCharCode(view.getUint8(vOff));
            }
        }
        if (gpsData[2] === undefined || gpsData[4] === undefined) return null;
        const lat = gpsData[1] === "S" ? -gpsData[2] : gpsData[2];
        const lon = gpsData[3] === "W" ? -gpsData[4] : gpsData[4];
        if (isNaN(lat) || isNaN(lon)) return null;
        return { lat, lon };
    } catch { return null; }
}


// ==========================================================
// Submit Incident
// ==========================================================

async function submitIncident() {

    const incidentType = document

        .getElementById("incidentType")

        .value;

    const description = document

        .getElementById("incidentDescription")

        .value

        .trim();

    const latitude = document

        .getElementById("latitude")

        .value;

    const longitude = document

        .getElementById("longitude")

        .value;

    const imageFile = document

        .getElementById("incidentImage")

        .files[0];

    if (!description) {

        showError(

            "Please describe the incident."

        );

        return;

    }

    const formData = new FormData();

    formData.append(

        "incident_type",

        incidentType

    );

    formData.append(

        "description",

        description

    );

    formData.append(

        "latitude",

        latitude

    );

    formData.append(

        "longitude",

        longitude

    );

    if (imageFile || _compressedImageBlob) {

        formData.append(

            "image",

            _compressedImageBlob || imageFile

        );

    }

    try {

        const response = await fetch(

            "/report_incident",

            {

                method: "POST",

                body: formData

            }

        );

        const data = await response.json();

        if (data.success) {

            showSuccess(

                "Incident submitted successfully."

            );

            clearIncidentForm();
            _compressedImageBlob = null;

            refreshAlerts();

        }

        else {

            showError(

                data.message ||

                "Unable to submit incident."

            );

        }

    }

    catch (error) {

        console.error(error);

        // ── Offline: queue for background sync ──────────────
        await queueIncidentForSync({
            incident_type: incidentType,
            description,
            latitude,
            longitude,
        });

        if (typeof showMobileToast === "function") {
            showMobileToast(
                "You're offline. Incident saved and will auto-submit when reconnected.",
                "warning"
            );
        } else {
            showError("Offline — incident queued for sync.");
        }

    }

}


// ==========================================================
// Clear Form
// ==========================================================

function clearIncidentForm() {

    document

        .getElementById("incidentDescription")

        .value = "";

    document

        .getElementById("incidentImage")

        .value = "";

    const preview =

        document.getElementById(

            "imagePreview"

        );

    if (preview) {

        preview.style.display = "none";

    }

}


// ==========================================================
// Citizen Alerts
// ==========================================================

function updateCitizenAlerts(data) {

    if (!data) return;

    const floodCard = document.getElementById(

        "floodAlertCard"

    );

    const weatherCard = document.getElementById(

        "weatherAlertCard"

    );

    const reportCard = document.getElementById(

        "citizenReportCard"

    );

    const evacuationCard = document.getElementById(

        "evacuationCard"

    );

    if (floodCard && data.flood_alert) {

        floodCard.querySelector("strong").textContent =

            data.flood_alert;

    }

    if (weatherCard && data.weather_alert) {

        weatherCard.querySelector("strong").textContent =

            data.weather_alert;

    }

    if (reportCard && data.incident_count !== undefined) {

        reportCard.querySelector("strong").textContent =

            data.incident_count;

    }

    if (evacuationCard && data.evacuation_status) {

        evacuationCard.querySelector("strong").textContent =

            data.evacuation_status;

    }

}


// ==========================================================
// Refresh Citizen Alerts
// ==========================================================

async function refreshAlerts() {

    try {

        const data = await fetchJSON(

            "/citizen_alerts"

        );

        updateCitizenAlerts(data);

    }

    catch (error) {

        console.log(

            "Alerts unavailable."

        );

    }

}


// ==========================================================
// Nearby Shelters / Emergency Contacts / Local Authorities
// ==========================================================
// NOTE: this expects a backend route "/citizen_services" that
// returns JSON shaped like:
// {
//   "shelter_count": 4,
//   "emergency_contact_count": 6,
//   "ward_officer": "...",
//   "municipal_office": "...",
//   "disaster_response_cell": "...",
//   "community_coordinator": "..."
// }
// If your Flask route is named differently, just change the URL
// below to match.

function updateCitizenServices(data) {

    if (!data) return;

    const shelterCount = document.getElementById("shelterCount");
    const shelterStatus = document.getElementById("shelterStatus");

    if (shelterCount && data.shelter_count !== undefined) {

        shelterCount.textContent = data.shelter_count;

        if (shelterStatus) {

            shelterStatus.textContent =

                data.shelter_count > 0

                    ? "Verified shelters near you"

                    : "No shelters registered nearby";

        }

    }

    const emergencyCount = document.getElementById("emergencyContactCount");
    const emergencyStatus = document.getElementById("emergencyContactStatus");

    if (emergencyCount && data.emergency_contact_count !== undefined) {

        emergencyCount.textContent = data.emergency_contact_count;

        if (emergencyStatus) {

            emergencyStatus.textContent = "Tap Alerts for full contact list";

        }

    }

    const fields = [

        ["wardOfficerContact", data.ward_officer],
        ["municipalOfficeContact", data.municipal_office],
        ["disasterResponseContact", data.disaster_response_cell],
        ["communityCoordinatorContact", data.community_coordinator]

    ];

    fields.forEach(([id, value]) => {

        const element = document.getElementById(id);

        if (element) {

            element.textContent = value || "Not available";

        }

    });

}


async function refreshCitizenServices() {

    try {

        const data = await fetchJSON("/citizen_services");

        updateCitizenServices(data);

    }

    catch (error) {

        console.log("Citizen services unavailable.");

        const shelterStatus = document.getElementById("shelterStatus");
        const emergencyStatus = document.getElementById("emergencyContactStatus");

        if (shelterStatus) shelterStatus.textContent = "Authority Integration Pending";
        if (emergencyStatus) emergencyStatus.textContent = "Authority Integration Pending";

        ["wardOfficerContact", "municipalOfficeContact", "disasterResponseContact", "communityCoordinatorContact"]
            .forEach((id) => {

                const element = document.getElementById(id);

                if (element) element.textContent = "Not available";

            });

    }

}


// ==========================================================
// Auto Refresh
// ==========================================================

setInterval(

    refreshAlerts,

    300000

);


// ==========================================================
// Initial Load
// ==========================================================

document.addEventListener(

    "DOMContentLoaded",

    () => {

        refreshAlerts();

        refreshCitizenServices();

    }

);


// ==========================================================
// Prediction Alert Banner (MEDIUM/HIGH)
// ==========================================================

function broadcastPredictionAlert(data, lat, lon) {
    const probability = getPredictionPercent(data);
    const riskLevel = getRiskLevel(probability);
    
    if (riskLevel.label === 'MEDIUM' || riskLevel.label === 'HIGH') {
        // Resolve place name first, then show the banner
        reverseGeocode(lat, lon).then(placeName => {
            showPredictionAlertBanner(riskLevel.label, probability, placeName);
        });
        updateNotificationBadge();
    }
}

function showPredictionAlertBanner(level, probability, placeName) {
    dismissPredictionAlert();
    
    const banner = document.createElement('div');
    banner.id = 'predictionAlertBanner';
    banner.className = `prediction-alert-banner alert-${level.toLowerCase()}`;
    banner.innerHTML = `
        <div class="alert-icon">
            <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <div class="alert-content">
            <strong>${level} FLOOD RISK DETECTED</strong>
            <p>${probability.toFixed(1)}% flood probability — ${placeName}</p>
        </div>
        <button class="alert-dismiss" onclick="dismissPredictionAlert()">
            <i class="fa-solid fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(banner);
    setTimeout(() => banner.classList.add('show'), 100);
}

function dismissPredictionAlert() {
    const existing = document.getElementById('predictionAlertBanner');
    if (existing) {
        existing.classList.remove('show');
        setTimeout(() => existing.remove(), 300);
    }
}

async function updateNotificationBadge() {
    try {
        const data = await fetchJSON('/notifications/count');
        const badge = document.getElementById('notificationBadge');
        if (badge) badge.textContent = data.count || 0;
    } catch (error) {
        console.log('Could not update notification badge');
    }
}


// ==========================================================
// Background Sync — queue incidents when offline
// Uses IndexedDB + SyncManager (service worker replays)
// ==========================================================

async function queueIncidentForSync(payload) {
    try {
        const db  = await openSyncDB();
        await addToDB(db, "incidents", { payload, queued_at: Date.now() });

        if ("serviceWorker" in navigator && "SyncManager" in window) {
            const reg = await navigator.serviceWorker.ready;
            await reg.sync.register("fw-incident-sync");
        }
    } catch (err) {
        console.error("Failed to queue incident:", err);
    }
}

function openSyncDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open("fw-sync-db", 1);
        req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("incidents")) {
                db.createObjectStore("incidents", { keyPath: "id", autoIncrement: true });
            }
        };
        req.onsuccess = e => resolve(e.target.result);
        req.onerror   = e => reject(e.target.error);
    });
}

function addToDB(db, store, record) {
    return new Promise((resolve, reject) => {
        const tx  = db.transaction(store, "readwrite");
        const req = tx.objectStore(store).add(record);
        req.onsuccess = () => resolve();
        req.onerror   = e  => reject(e.target.error);
    });
}

// Listen for successful background sync confirmation from SW
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", event => {
        if (event.data?.type === "SYNC_SUCCESS") {
            if (typeof showMobileToast === "function")
                showMobileToast("Queued incident submitted successfully!", "success");
            refreshAlerts();
        }
    });
}
