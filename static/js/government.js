// ==========================================================
// FloodWatch Government Dashboard
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {

    initializeGovernmentDashboard();

});


// ==========================================================
// Initialize Dashboard
// ==========================================================

function initializeGovernmentDashboard() {

    initializeGovernmentMap();

    syncGovernmentMapWithInputs();

    initializeGovernmentRiskAssessment();

    initializeGovernmentRoleCards();

    initializeGovernmentDepartmentSelect();

    initializeDepartmentNavigation();

    initializeDepartmentTaskCards();

    loadGovernmentIncidents();

    loadGovernmentAlerts();

}


// ==========================================================
// Government Map
// ==========================================================

function initializeGovernmentMap() {

    if (typeof L === "undefined") return;

    initializeMap("governmentMap");

}


// ==========================================================
// Government Risk Assessment
// ==========================================================

function syncGovernmentMapWithInputs() {

    const latitudeInput = document.getElementById("latitude");

    const longitudeInput = document.getElementById("longitude");

    if (!latitudeInput || !longitudeInput) return;

    const latitude = parseFloat(latitudeInput.value);

    const longitude = parseFloat(longitudeInput.value);

    if (isNaN(latitude) || isNaN(longitude)) return;

    updateLocation(latitude, longitude);

    if (map) {

        map.setView([latitude, longitude], 11);

    }

}


function initializeGovernmentRiskAssessment() {

    const predictBtn = document.getElementById("predictBtn");

    if (predictBtn) {

        predictBtn.addEventListener("click", runGovernmentRiskAssessment);

    }

}


async function runGovernmentRiskAssessment() {

    const latitude = parseFloat(document.getElementById("latitude")?.value);

    const longitude = parseFloat(document.getElementById("longitude")?.value);

    if (isNaN(latitude) || isNaN(longitude)) {

        showError("Please enter valid coordinates.");

        return;

    }

    const loadingCard = document.getElementById("loadingCard");

    const resultsCard = document.getElementById("resultsCard");

    if (loadingCard) loadingCard.classList.remove("hidden");

    if (resultsCard) resultsCard.classList.add("hidden");

    try {

        const response = await fetchJSON("/predict", {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({ latitude, longitude })

        });

        updateGovernmentPrediction(response);

        updateLocation(latitude, longitude);

        if (map) {

            map.setView([latitude, longitude], 11);

        }

        broadcastPredictionAlert(response, latitude, longitude);

    }

    catch (error) {

        console.error(error);

        showError("Prediction failed.");

    }

    finally {

        if (loadingCard) loadingCard.classList.add("hidden");

    }

}


function updateGovernmentPrediction(data) {

    const resultsCard = document.getElementById("resultsCard");

    if (resultsCard) resultsCard.classList.remove("hidden");

    const probability = getPredictionPercent(data);

    const features = getPredictionFeatures(data);

    setGovernmentText("riskPercentage", probability.toFixed(1) + "%");

    const gaugeFill = document.getElementById("gaugeFill");

    if (gaugeFill) {

        gaugeFill.style.width = probability + "%";

    }

    const riskLevel = getGovernmentRiskLevel(probability);

    const badge = document.getElementById("riskBadge");

    if (badge) {

        badge.className = "risk-badge " + riskLevel.className;

    }

    setGovernmentText("riskLevel", riskLevel.label);

    setGovernmentText(

        "rainfall",

        formatNumber(features.rainfall) + " mm"

    );

    setGovernmentText(

        "soilMoisture",

        formatNumber(features.soilMoisture)

    );

    setGovernmentText(

        "elevation",

        formatNumber(features.elevation) + " m"

    );

    setGovernmentText(

        "slope",

        formatNumber(features.slope) + " deg"

    );

}


function setGovernmentText(id, value) {

    const element = document.getElementById(id);

    if (element) {

        element.textContent = value;

    }

}


function getGovernmentRiskLevel(probability) {

    if (probability >= 70) {

        return { label: "HIGH", className: "risk-high" };

    }

    if (probability >= 40) {

        return { label: "MEDIUM", className: "risk-medium" };

    }

    return { label: "LOW", className: "risk-low" };

}


// ==========================================================
// Department Task Details
// ==========================================================

const GOVERNMENT_TASK_DETAILS = {

    road_closures: [
        "Identify unsafe roads and bridge approaches.",
        "Publish alternate routes for public movement.",
        "Coordinate reopening after water recedes."
    ],
    drainage_pumps: [
        "Track pump availability and deployment zones.",
        "Prioritize low-lying streets and underpasses.",
        "Escalate failed pumps to maintenance teams."
    ],
    garbage_clearance: [
        "Clear blocked drains and culverts.",
        "Move debris from flooded roads.",
        "Assign sanitation teams by ward."
    ],
    waterlogged_roads: [
        "Monitor road depth and vehicle access.",
        "Mark severe waterlogging for closure.",
        "Send updates to traffic and public alerts."
    ],
    maintenance_teams: [
        "Dispatch civic repair teams.",
        "Track equipment and crew availability.",
        "Resolve drainage, lighting, and road issues."
    ],
    utility_services: [
        "Coordinate power, water, and streetlight status.",
        "Escalate outages in relief zones.",
        "Confirm restoration before marking normal."
    ],
    rescue_teams: [
        "Deploy rescue teams to high-risk areas.",
        "Track field team status and location.",
        "Coordinate evacuation support."
    ],
    rescue_boats: [
        "Assign boats to submerged colonies.",
        "Track fuel, crew, and route safety.",
        "Prioritize elderly, children, and medical cases."
    ],
    relief_camps: [
        "Open and monitor shelter capacity.",
        "Coordinate food, water, bedding, and sanitation.",
        "Track arrivals and vulnerable citizens."
    ],
    medical_teams: [
        "Deploy doctors, nurses, and first-aid teams.",
        "Monitor medicine and ambulance requirements.",
        "Support camps and rescue points."
    ],
    relief_distribution: [
        "Manage food, water, blankets, and kits.",
        "Avoid duplicate distribution by location.",
        "Prioritize camps and stranded families."
    ],
    evacuated_citizens: [
        "Track evacuated citizens and family groups.",
        "Map source areas and shelter destinations.",
        "Support missing-person and reunification updates."
    ],
    traffic_diversions: [
        "Set traffic diversions around flooded roads.",
        "Share route updates with public channels.",
        "Coordinate with municipal road closure teams."
    ],
    restricted_areas: [
        "Mark unsafe areas for public restriction.",
        "Post police personnel and barricades.",
        "Review restrictions after field clearance."
    ],
    patrol_vehicles: [
        "Deploy patrols to vulnerable locations.",
        "Monitor crowd safety and theft prevention.",
        "Support rescue routes and emergency corridors."
    ],
    police_personnel: [
        "Assign personnel to relief camps and junctions.",
        "Support evacuation and crowd management.",
        "Maintain law and order during response."
    ],
    crowd_control: [
        "Manage queues at relief points.",
        "Prevent crowding near dangerous water flow.",
        "Coordinate announcements and movement."
    ],
    emergency_routes: [
        "Keep ambulance and rescue corridors open.",
        "Remove obstructions with municipal teams.",
        "Update command center when routes change."
    ],
    house_damage_survey: [
        "Record damaged houses with field evidence.",
        "Validate severity and family details.",
        "Prepare verified compensation lists."
    ],
    crop_damage: [
        "Survey flooded agricultural land.",
        "Capture crop type and estimated loss.",
        "Prepare reports for compensation processing."
    ],
    compensation_requests: [
        "Review claims and supporting documents.",
        "Match claims with verified survey reports.",
        "Forward eligible requests for approval."
    ],
    affected_families: [
        "Register affected families by village or ward.",
        "Identify urgent needs and vulnerable members.",
        "Coordinate relief eligibility."
    ],
    village_reports: [
        "Collect reports from village officers.",
        "Track missing, delayed, and verified reports.",
        "Summarize impact for district officials."
    ],
    survey_progress: [
        "Monitor field survey completion.",
        "Identify pending villages and teams.",
        "Update the district damage assessment status."
    ]

};


function initializeDepartmentTaskCards() {

    document.querySelectorAll(".department-panel .threshold-card").forEach(card => {

        card.setAttribute("role", "button");

        card.setAttribute("tabindex", "0");

        const open = () => openGovernmentTaskDetails(card);

        card.addEventListener("click", open);

        card.addEventListener("keydown", event => {

            if (event.key === "Enter" || event.key === " ") {

                event.preventDefault();

                open();

            }

        });

    });

}


function openGovernmentTaskDetails(card) {

    const title = card.querySelector("span")?.textContent.trim() || "Department Task";

    const value = card.querySelector("strong")?.textContent.trim() || "--";

    const key = title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

    const details = GOVERNMENT_TASK_DETAILS[key] || [

        "Review the latest field status.",

        "Assign the responsible department officer.",

        "Update progress for the emergency operations center."

    ];

    const body = `

        <div class="modal-list-item">

            <div>

                <strong>Current Status</strong>

                <small>${title}</small>

            </div>

            <span>${value}</span>

        </div>

        ${details.map(detail => `

            <div class="modal-list-item">

                <div>

                    <strong>${detail}</strong>

                </div>

            </div>

        `).join("")}

    `;

    if (typeof openModal === "function") {

        openModal(title, body);

    }

}


// ==========================================================
// Government Sub Role Cards
// ==========================================================

function initializeGovernmentRoleCards() {

    const cards = document.querySelectorAll(".government-role-card");

    cards.forEach(card => {

        const select = () => showDepartment(

            card.dataset.department,

            { scroll: true }

        );

        card.addEventListener("click", select);

        card.addEventListener("keydown", event => {

            if (event.key === "Enter" || event.key === " ") {

                event.preventDefault();

                select();

            }

        });

    });

}


function initializeGovernmentDepartmentSelect() {

    const select = document.getElementById("departmentSelect");

    if (!select) return;

    select.addEventListener("change", () => {

        if (!select.value) return;

        showDepartment(

            select.value,

            { scroll: true }

        );

    });

}


// ==========================================================
// Department Navigation
// ==========================================================

function initializeDepartmentNavigation() {

    const buttons = document.querySelectorAll(".department-btn");

    buttons.forEach(button => {

        button.addEventListener("click", () => {

            buttons.forEach(btn =>
                btn.classList.remove("active")
            );

            button.classList.add("active");

            showDepartment(

                button.dataset.department,

                { scroll: true }

            );

        });

    });

}


// ==========================================================
// Switch Department Panel
// ==========================================================

function showDepartment(department, options = {}) {

    const workspace = document.getElementById(

        "departmentWorkspace"

    );

    if (workspace) {

        workspace.classList.remove("hidden");

    }

    const panels = document.querySelectorAll(

        ".department-panel"

    );

    panels.forEach(panel =>

        panel.classList.remove("active")

    );

    const activePanel = document.getElementById(

        department + "Panel"

    );

    if (activePanel) {

        activePanel.classList.add("active");

    }

    document.querySelectorAll(".government-role-card").forEach(card => {

        card.classList.toggle(

            "active",

            card.dataset.department === department

        );

    });

    document.querySelectorAll(".department-btn").forEach(button => {

        button.classList.toggle(

            "active",

            button.dataset.department === department

        );

    });

    const departmentSelect = document.getElementById("departmentSelect");

    if (departmentSelect) {

        departmentSelect.value = department;

    }

    const activeLabel = document.querySelector(

        `.government-role-card[data-department="${department}"] .status-label`

    ) || document.querySelector(

        `[data-department="${department}"] span`

    );

    const activeDepartmentName = document.getElementById(

        "activeDepartmentName"

    );

    if (activeDepartmentName && activeLabel) {

        activeDepartmentName.textContent =

            activeLabel.textContent.trim();

    }

    if (options.scroll && workspace) {

        workspace.scrollIntoView({

            behavior: "smooth",

            block: "start"

        });

    }

}


// ==========================================================
// Government Incident Queue
// ==========================================================

async function loadGovernmentIncidents() {

    const container =

        document.getElementById(

            "governmentIncidentContainer"

        );

    if (!container) return;

    try {

        const response =

            await fetch(

                "/api/government/incidents"

            );

        if (!response.ok)

            throw new Error();

        const incidents =

            await response.json();

        renderGovernmentIncidents(

            incidents

        );

    }

    catch {

        renderGovernmentIncidents([

            {

                id:1,

                location:"Hyderabad",

                priority:"High",

                department:"Disaster Management",

                time:"10 min ago",

                description:"Rapid rise in water level reported near Musi River."

            },

            {

                id:2,

                location:"Warangal",

                priority:"Medium",

                department:"Municipal Authority",

                time:"18 min ago",

                description:"Major waterlogging affecting traffic movement."

            }

        ]);

    }

}


function renderGovernmentIncidents(incidents){

    const container =

        document.getElementById(

            "governmentIncidentContainer"

        );

    if (!container) return;

    container.innerHTML =

        incidents.map(

            buildIncidentCard

        ).join("");

}


function buildIncidentCard(incident){

    return `

<div class="incident-card">

<div class="incident-header">

<h4>

${incident.location}

</h4>

<span class="incident-status ${incident.priority.toLowerCase()}">

${incident.priority}

</span>

</div>

<p>

${incident.description}

</p>

<div class="incident-footer">

<span>

<i class="fa-solid fa-building"></i>

${incident.department}

</span>

<span>

<i class="fa-solid fa-clock"></i>

${incident.time}

</span>

</div>

<div class="incident-actions">

<button
class="btn-primary"
onclick="assignGovernmentTeam('${incident.id}')">

Assign Team

</button>

<button
class="btn-secondary"
onclick="viewIncident('${incident.id}')">

Details

</button>

<button
class="btn-secondary"
onclick="resolveIncident('${incident.id}')">

Resolve

</button>

</div>

</div>

`;

}


// ==========================================================
// Government Alerts
// ==========================================================

async function loadGovernmentAlerts(){

    try{

        const response =

            await fetch(

                "/api/government/alerts"

            );

        if(!response.ok)

            throw new Error();

        const alerts =

            await response.json();

        updateGovernmentAlerts(alerts);

    }

    catch{

        updateGovernmentAlerts([]);

    }

}


function updateGovernmentAlerts(alerts){

    const container =

        document.getElementById(

            "governmentAlerts"

        );

    if(!container) return;

    if(!alerts || alerts.length===0){

        container.innerHTML = `

<div class="empty-state">
    <i class="fa-solid fa-circle-check"></i>
    <strong>No active prediction alerts</strong>
    <small>Medium and high flood predictions will appear here until resolved.</small>
</div>

`;

        return;

    }

    container.innerHTML =

        alerts.map(alert=>`

<div class="alert-item ${alert.level}">

<strong>

${alert.title}

</strong>

<small>

${alert.time}

</small>

</div>

`).join("");

}


// ==========================================================
// Incident Actions
// ==========================================================

function assignGovernmentTeam(id){

    console.log(

        "Assign Team:",

        id

    );

    showSuccess(

        "Response team assigned successfully."

    );

}


function viewIncident(id){

    console.log(

        "View Incident:",

        id

    );

    showSuccess(

        "Opening incident details."

    );

}


function resolveIncident(id){

    console.log(

        "Resolve Incident:",

        id

    );

    showSuccess(

        "Incident marked as resolved."

    );

}
// ==========================================================
// Dashboard Refresh
// ==========================================================

async function refreshGovernmentDashboard(){

    await Promise.all([

        loadGovernmentIncidents(),

        loadGovernmentAlerts()

    ]);

}


// ==========================================================
// Auto Refresh
// ==========================================================

setInterval(

    refreshGovernmentDashboard,

    300000

);


// ==========================================================
// Utility
// ==========================================================

function formatGovernmentTime(date){

    return new Date(date)

    .toLocaleString(

        "en-IN",

        {

            dateStyle:"medium",

            timeStyle:"short"

        }

    );

}


// ==========================================================
// Notifications
// ==========================================================

function showSuccess(message){

    if(typeof showToast === "function"){

        showToast(message,"success");

    }

    else{

        alert(message);

    }

}


// ==========================================================
// Initial Dashboard Refresh
// ==========================================================

document.addEventListener(

    "DOMContentLoaded",

    refreshGovernmentDashboard

);


// ==========================================================
// Prediction Alert Banner (MEDIUM/HIGH)
// ==========================================================

function broadcastPredictionAlert(data, lat, lon) {

    const probability = getPredictionPercent(data);

    const riskLevel = getGovernmentRiskLevel(probability);

    if (riskLevel.label === 'MEDIUM' || riskLevel.label === 'HIGH') {

        reverseGeocode(lat, lon).then(placeName => {

            showPredictionAlertBanner(riskLevel.label, probability, placeName);

        });

        refreshBadge();

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

async function refreshBadge() {

    try {

        const data = await fetch('/notifications/count');

        const json = await data.json();

        const badge = document.getElementById('notificationBadge');

        if (badge) badge.textContent = json.count || 0;

    } catch (e) {

        // ignore

    }

}
