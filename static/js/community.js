// ============================================================
// FloodWatch Community Dashboard
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    
    initializeCommunityDashboard();
    
});


// ============================================================
// Initialize Community Dashboard
// ============================================================

function initializeCommunityDashboard() {
    
    // Initialize map
    if (typeof L !== "undefined") {
        initializeMap("communityMap");

        // Sync the map with the lat/lng already sitting in the
        // Check Flood Risk inputs, so it opens centered on that
        // point with a marker (matches the citizen dashboard)
        // instead of a zoomed-out view of all of India.
        syncMapWithInputs();
    }

    // Wire up the Check Flood Risk panel
    const predictBtn = document.getElementById("predictBtn");

    if (predictBtn) {
        predictBtn.addEventListener("click", runRiskAssessment);
    }
    
    // Load community-specific data
    loadCommunityStats();
    loadIncidentReports();
    
    
    // Wire up the role-select cards (NGO / Youth Org / Colony
    // Volunteer) and every sub-role panel's threshold-cards.
    initializeRoleSelectCards();
    initializeSubRoleCards();
    loadNotifications();
}


// ============================================================
// Sync map marker with current input values
// ============================================================

function syncMapWithInputs() {

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

let latestNotificationId = 0;
let notificationsInitialized = false;

async function loadNotifications() {
    try {
        const notifications = await fetchJSON("/api/community/notifications");
        renderActivityFeed(notifications);
        checkForNewIncidentAlerts(notifications);
        updateNotificationBadge();
    } catch (error) {
        console.log("Notifications unavailable");
    }
}

function renderActivityFeed(notifications) {
    const feed = document.getElementById("activityFeed");
    if (!feed) return;
    if (!notifications || notifications.length === 0) {
        feed.innerHTML = "<p style='color:#999;text-align:center;padding:20px;'>No recent activity</p>";
        return;
    }
    feed.innerHTML = notifications.map(n => `
        <div class="activity-item">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <div>
                <strong>${n.message}</strong>
                <small>${formatDate(n.created_at)}</small>
            </div>
        </div>
    `).join("");
}

function checkForNewIncidentAlerts(notifications) {
    if (!notifications || notifications.length === 0) return;
    const newestId = Math.max(...notifications.map(n => n.id));
    if (notificationsInitialized && newestId > latestNotificationId) {
        const newest = notifications.find(n => n.id === newestId);
        showToast(newest ? newest.message : "New incident reported");
        loadIncidentReports();
        loadCommunityStats();
    }
    latestNotificationId = newestId;
    notificationsInitialized = true;
}

async function updateNotificationBadge() {
    try {
        const data = await fetchJSON("/notifications/count");
        const badge = document.getElementById("notificationBadge");
        if (badge) badge.textContent = data.count || 0;
    } catch (error) {
        // ignore
    }
}

function showToast(message) {
    let toast = document.getElementById("communityToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "communityToast";
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 9999;
            background: #d9534f; color: #fff; padding: 14px 20px;
            border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            max-width: 320px; font-size: 14px; transition: opacity 0.3s;
        `;
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<strong>🚨 New Incident</strong><br>${message}`;
    toast.style.opacity = "1";
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => { toast.style.opacity = "0"; }, 6000);
}

// Poll every 15 seconds for new incidents/notifications
setInterval(() => {
    loadIncidentReports();
    loadNotifications();
}, 15000);

// ============================================================
// Check Flood Risk — Risk Assessment
// (same behavior as the citizen dashboard's panel)
// ============================================================

async function runRiskAssessment() {

    const latitude = parseFloat(document.getElementById("latitude").value);
    const longitude = parseFloat(document.getElementById("longitude").value);

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

        updatePrediction(response);

    } catch (error) {

        console.error(error);
        showError("Prediction failed.");

    } finally {

        if (loadingCard) loadingCard.classList.add("hidden");

    }

}

function updatePrediction(data) {

    const resultsCard = document.getElementById("resultsCard");
    if (resultsCard) resultsCard.classList.remove("hidden");

    const probability = Number(data.flood_probability || 0);

    setText("riskPercentage", probability.toFixed(1) + "%");

    const gaugeFill = document.getElementById("gaugeFill");
    if (gaugeFill) gaugeFill.style.width = probability + "%";

    const riskLevel = getRiskLevel(probability);

    const badge = document.getElementById("riskBadge");
    if (badge) badge.className = "risk-badge " + riskLevel.className;

    setText("riskLevel", riskLevel.label);

    // Not every dashboard has a top-level risk summary tile —
    // only update it if one is present on the page.
    setText("riskSummary", riskLevel.label);

    setText("rainfall", formatNumber(data.rainfall) + " mm");
    setText("soilMoisture", formatNumber(data.soil_moisture));
    setText("elevation", formatNumber(data.elevation) + " m");
    setText("slope", formatNumber(data.slope) + "°");

}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function getRiskLevel(probability) {

    if (probability >= 70) {
        return { label: "HIGH", className: "risk-high" };
    }

    if (probability >= 40) {
        return { label: "MEDIUM", className: "risk-medium" };
    }

    return { label: "LOW", className: "risk-low" };

}


// ============================================================
// Community Statistics
// ============================================================

async function loadCommunityStats() {
    
    try {
        
        const response = await fetch("/api/community/stats");
        
        if (!response.ok) return;
        
        const stats = await response.json();
        
        // Update stats on page
        updateStatTile("activeIncidents", stats.active_incidents || 0);
        updateStatTile("activeVolunteers", stats.active_volunteers || 0);
        updateStatTile("sheltersActive", stats.shelters_active || 0);
        
    } catch (error) {
        
        console.log("Community stats unavailable");
        
    }
}

function updateStatTile(id, value) {
    
    const element = document.querySelector(`[data-stat="${id}"]`);
    
    if (element) {
        
        element.innerHTML = value || "0";
        
    }
}


// ============================================================
// Incident Reports
// ============================================================

async function loadIncidentReports() {
    
    const container = document.getElementById("reportsContainer");
    
    if (!container) return;
    
    try {
        
        const response = await fetch("/api/community/incidents");
        
        if (!response.ok) {
            
            container.innerHTML = "<p>No reports available</p>";
            
            return;
        }
        
        const incidents = await response.json();
        
        if (!incidents || incidents.length === 0) {
            
            container.innerHTML = "<p>No active incidents reported</p>";
            
            return;
        }
        
        container.innerHTML = incidents.map(incident => `
            <div class="incident-card">
                <div class="incident-header">
                    <h4>${incident.location || "Unknown Location"}</h4>
                    <span class="incident-status ${incident.status}">${incident.status}</span>
                </div>
                <p>${incident.description || "Waterlogging reported"}</p>
                <small>${formatDate(incident.timestamp)}</small>
                <button class="btn-secondary" onclick="assignVolunteer('${incident.id}')">Assign Volunteer</button>
            </div>
        `).join("");
        
    } catch (error) {
        
        console.log("Failed to load incident reports");
        
    }
}


// ============================================================
// Volunteer Status
// ============================================================


// ============================================================
// Incident Assignment
// ============================================================

function assignVolunteer(incidentId) {
    
    // Placeholder for volunteer assignment logic
    alert(`Assigning volunteer to incident ${incidentId}`);
    
}


// ============================================================
// Role Select Cards (NGO / Youth Organization / Colony Volunteer)
// Clicking one of these header cards reveals the matching
// sub-role panel further down the page (below the map) and
// scrolls to it. Only one panel is visible at a time.
// ============================================================

function initializeRoleSelectCards() {

    const roleCards = document.querySelectorAll(".role-select-card");

    if (!roleCards.length) return;

    roleCards.forEach(card => {

        const select = () => showRolePanel(card.dataset.role, card);

        card.addEventListener("click", select);

        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                select();
            }
        });

    });

}

function showRolePanel(role, clickedCard) {

    document.querySelectorAll(".role-select-card").forEach(card => {
        card.classList.remove("active");
    });

    if (clickedCard) {
        clickedCard.classList.add("active");
    }

    document.querySelectorAll(".sub-role-panel").forEach(panel => {

        if (panel.dataset.subRole === role) {

            panel.classList.remove("hidden");
            panel.scrollIntoView({ behavior: "smooth", block: "start" });

        } else {

            panel.classList.add("hidden");

        }

    });

}


// ============================================================
// Sub-Role Card Definitions
// Each card in a sub-role's threshold-grid is either a "view"
// card (opens a detail list, backed by an API endpoint) or an
// "add" card (opens a quick-add form that posts to an endpoint).
// ============================================================

const SUB_ROLE_CARD_CONFIG = {
    
    ngo: {
        relief_camps:        { label: "Relief Camps",        endpoint: "/api/community/ngo/relief-camps" },
        add_relief_camp: {
            label: "Relief Camp", endpoint: "/api/community/ngo/relief-camps", type: "add",
            fields: [
                { name: "name",     label: "Camp Name",  type: "text",   placeholder: "e.g. Tarnaka Relief Camp" },
                { name: "address",  label: "Address",    type: "text",   placeholder: "e.g. Near Tarnaka Metro Station" },
                { name: "capacity", label: "Capacity",   type: "number", placeholder: "e.g. 200" }
            ]
        },
        medical_teams:       { label: "Medical Teams",       endpoint: "/api/community/ngo/medical-teams" },
        supplies: {
            label: "Supplies", endpoint: "/api/community/ngo/supplies", type: "add",
            fields: [
                { name: "item",     label: "Supply Item",   type: "text",   placeholder: "e.g. Rice, Blankets, First Aid Kits" },
                { name: "quantity", label: "Quantity",      type: "number", placeholder: "e.g. 100" },
                { name: "unit",     label: "Unit",          type: "text",   placeholder: "e.g. kg, packets, units" },
                { name: "location", label: "Drop Location", type: "text",   placeholder: "e.g. Tarnaka Relief Camp" }
            ]
        },
        shelter_capacity:    { label: "Shelter Capacity",    endpoint: "/api/community/ngo/shelter-capacity" },
        donations_received:  { label: "Donations Received",  endpoint: "/api/community/ngo/donations" },
        volunteers_assigned: { label: "Volunteers",          endpoint: "/api/community/ngo/volunteers-assigned" },
        relief_vehicles:     { label: "Relief Vehicles",     endpoint: "/api/community/ngo/relief-vehicles" },
        emergency_contacts:  { label: "Emergency Contacts",  endpoint: "/api/community/ngo/emergency-contacts" }
    },
    
    youth_organization: {
        awareness_drives:      { label: "Awareness Drives",              endpoint: "/api/community/youth/awareness-drives" },
        field_verification:    { label: "Field Verifications",           endpoint: "/api/community/youth/field-verification" },
        teams_active:          { label: "Teams",                         endpoint: "/api/community/youth/teams-active" },
        events: {
            label: "Events", endpoint: "/api/community/youth/events", type: "add",
            fields: [
                { name: "name",        label: "Event Name",  type: "text",     placeholder: "e.g. Flood Awareness Drive" },
                { name: "date",        label: "Date",        type: "date" },
                { name: "location",    label: "Location",    type: "text",     placeholder: "e.g. Uppal Community Hall" },
                { name: "description", label: "Description", type: "textarea", placeholder: "Brief details about the event" }
            ]
        },
        student_volunteers:    { label: "Student Volunteers",            endpoint: "/api/community/youth/student-volunteers" },
        pending_verifications: { label: "Pending Verifications",         endpoint: "/api/community/youth/pending-verifications" },
        social_media_outreach: { label: "Social Media Outreach",         endpoint: "/api/community/youth/social-media-outreach" },
        blood_donation_camps:  { label: "Blood / Food / Cloth Donations",endpoint: "/api/community/youth/donations" }
    },
    
    colony_volunteer: {
        assigned_tasks:     { label: "Assigned Tasks",     endpoint: "/api/community/colony/assigned-tasks" },
        nearby_incidents:   { label: "Nearby Incidents",   endpoint: "/api/community/colony/nearby-incidents" },
        reports_verified:   { label: "Reports Verified",   endpoint: "/api/community/colony/reports-verified" },
        availability: {
            label: "Availability", endpoint: "/api/community/colony/availability", type: "add",
            fields: [
                { name: "status", label: "Status", type: "select",   options: ["Available", "Busy", "Offline"] },
                { name: "date",   label: "Date",    type: "date" },
                { name: "notes",  label: "Notes",   type: "textarea", placeholder: "Optional notes, e.g. available evenings only" }
            ]
        },
        nearby_families:    { label: "Nearby Families",    endpoint: "/api/community/colony/nearby-families" },
        elderly_assistance: { label: "Elderly Assistance", endpoint: "/api/community/colony/elderly-assistance" },
        food_delivery:      { label: "Food Delivery",      endpoint: "/api/community/colony/food-delivery" },
        first_aid_requests: { label: "First Aid Requests", endpoint: "/api/community/colony/first-aid-requests" },
        water_distribution: { label: "Water Distribution", endpoint: "/api/community/colony/water-distribution" }
    }
};


// ============================================================
// Sub-Role Cards — Click Handling
// Every sub-role panel is present in the DOM at once (they're
// just hidden/shown via the role-select cards above), so this
// wires up threshold-cards across ALL panels, not just one.
// ============================================================

function initializeSubRoleCards() {

    document.querySelectorAll(".sub-role-panel").forEach(panel => {

        const subRole = panel.dataset.subRole;
        const config = SUB_ROLE_CARD_CONFIG[subRole];

        if (!config) return;

        panel.querySelectorAll(".threshold-card").forEach(card => {

            card.setAttribute("role", "button");
            card.setAttribute("tabindex", "0");

            const open = () => openSubRoleCard(card.dataset.cardId, config);

            card.addEventListener("click", open);
            card.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open();
                }
            });

        });

    });

}

function openSubRoleCard(cardId, config) {
    
    const cardConfig = config[cardId];
    
    if (!cardConfig) return;
    
    if (cardConfig.type === "add") {
        openModal(`Add ${cardConfig.label}`, buildAddFormHtml(cardConfig));
        wireAddForm(cardConfig);
    } else {
        openModal(cardConfig.label, `<p class="modal-empty">Loading ${cardConfig.label.toLowerCase()}...</p>`);
        loadSubRoleCardDetails(cardConfig);
    }
}


// ============================================================
// "View" Cards — Detail List
// ============================================================

async function loadSubRoleCardDetails(cardConfig) {
    
    try {
        
        const items = await fetchJSON(cardConfig.endpoint);
        
        if (!items || items.length === 0) {
            setModalBody(`<p class="modal-empty">No ${cardConfig.label.toLowerCase()} recorded yet.</p>`);
            return;
        }
        
        setModalBody(items.map(item => `
            <div class="modal-list-item">
                <div>
                    <strong>${item.title || item.name || cardConfig.label}</strong>
                    ${item.subtitle ? `<small>${item.subtitle}</small>` : ""}
                </div>
                ${item.value !== undefined ? `<span>${item.value}</span>` : ""}
            </div>
        `).join(""));
        
    } catch (error) {
        
        setModalBody(`
            <p class="modal-empty">
                Live data isn't connected yet for ${cardConfig.label.toLowerCase()}.<br>
                Hook up <code>${cardConfig.endpoint}</code> to show real records here.
            </p>
        `);
    }
}


// ============================================================
// "Add" Cards — Quick-Add Form
// ============================================================

function buildAddFormHtml(cardConfig) {
    
    const fieldsHtml = cardConfig.fields.map(field => {
        
        if (field.type === "select") {
            return `
                <label for="field_${field.name}">${field.label}</label>
                <select id="field_${field.name}" name="${field.name}">
                    ${field.options.map(opt => `<option value="${opt}">${opt}</option>`).join("")}
                </select>
            `;
        }
        
        if (field.type === "textarea") {
            return `
                <label for="field_${field.name}">${field.label}</label>
                <textarea id="field_${field.name}" name="${field.name}" placeholder="${field.placeholder || ""}"></textarea>
            `;
        }
        
        return `
            <label for="field_${field.name}">${field.label}</label>
            <input id="field_${field.name}" name="${field.name}" type="${field.type}" placeholder="${field.placeholder || ""}">
        `;
        
    }).join("");
    
    return `
        <form class="modal-form" id="subRoleAddForm">
            ${fieldsHtml}
            <button type="submit" class="modal-submit">Save ${cardConfig.label}</button>
            <p class="modal-form-note">Saved entries will sync to ${cardConfig.endpoint}</p>
        </form>
    `;
}

function wireAddForm(cardConfig) {
    
    const form = document.getElementById("subRoleAddForm");
    
    if (!form) return;
    
    form.addEventListener("submit", async (e) => {
        
        e.preventDefault();
        
        const payload = {};
        new FormData(form).forEach((value, key) => { payload[key] = value; });
        
        try {
            
            await fetchJSON(cardConfig.endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            
            closeModal();
            showSuccess(`${cardConfig.label} saved successfully.`);
            
        } catch (error) {
            
            showError(`Couldn't save ${cardConfig.label.toLowerCase()} right now. Please try again.`);
        }
    });
}