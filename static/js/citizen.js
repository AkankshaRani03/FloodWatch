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

    try {

        const response = await fetchJSON(

            "/predict",

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

    const probability =

        Number(

            data.flood_probability || 0

        );

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

            data.rainfall

        ) + " mm";

    document

        .getElementById("soilMoisture")

        .textContent =

        formatNumber(

            data.soil_moisture

        );

    document

        .getElementById("elevation")

        .textContent =

        formatNumber(

            data.elevation

        ) + " m";

    document

        .getElementById("slope")

        .textContent =

        formatNumber(

            data.slope

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
// Image Preview
// ==========================================================

function previewIncidentImage(event) {

    const file = event.target.files[0];

    const preview = document.getElementById("imagePreview");

    const image = document.getElementById("previewImage");

    if (!file || !preview || !image) return;

    const reader = new FileReader();

    reader.onload = function (e) {

        image.src = e.target.result;

        preview.style.display = "block";

    };

    reader.readAsDataURL(file);

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

    if (imageFile) {

        formData.append(

            "image",

            imageFile

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

            // A newly reported incident should be reflected in the
            // "Citizen Reports" alert card without waiting for the
            // 5 minute auto-refresh.
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

        showError(

            "Network error."

        );

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
