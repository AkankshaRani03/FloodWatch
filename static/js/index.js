
// ============================================================
// FloodWatch — Index Page JavaScript
// Depends on common.js being loaded first (fetchJSON, formatDate)
// ============================================================
 
document.addEventListener("DOMContentLoaded", () => {
 
    document.getElementById("year").textContent = new Date().getFullYear();
 
    loadSystemStatus();
    loadHeroStats();
    loadRecentActivity();
    initializeIndexMap();
 
});
 
 
// ============================================================
// System Status Badge
// ============================================================
 
async function loadSystemStatus() {
 
    const statusEl = document.getElementById("heroStatus");
    if (!statusEl) return;
 
    try {
 
        const data = await fetchJSON("/system/status");
        statusEl.textContent = data.status || "operational";
 
    } catch (error) {
 
        // Backend not reachable yet — fail quietly, don't block the page.
        statusEl.textContent = "operational";
 
    }
 
}
 
 
// ============================================================
// Hero Stats Strip
// ============================================================
 
async function loadHeroStats() {
 
    const fallback = {
        activeAlerts: 0,
        regionsMonitored: 0,
        reportsThisWeek: 0,
        teamsOnline: 0
    };
 
    let data = fallback;
 
    try {
 
        data = await fetchJSON("/stats/summary");
 
    } catch (error) {
 
        console.log("Stats service unavailable, showing defaults.");
 
    }
 
    setStat("statAlerts", data.activeAlerts);
    setStat("statRegions", data.regionsMonitored);
    setStat("statReports", data.reportsThisWeek);
    setStat("statTeams", data.teamsOnline);
 
}
 
function setStat(id, value) {
 
    const el = document.getElementById(id);
    if (!el) return;
 
    el.textContent = (value === undefined || value === null) ? "--" : value;
 
}
 
 
// ============================================================
// Recent Activity Table
// ============================================================
 
async function loadRecentActivity() {
 
    const body = document.getElementById("activityBody");
    if (!body) return;
 
    let items = [];
 
    try {
 
        items = await fetchJSON("/activity/recent");
 
    } catch (error) {
 
        console.log("Activity feed unavailable.");
        return; // keep the existing empty-state row
 
    }
 
    if (!items || items.length === 0) return;
 
    body.innerHTML = items.map(renderActivityRow).join("");
 
}
 
function renderActivityRow(item) {
 
    const statusClass =
        item.status === "resolved" ? "badge-success" :
        item.status === "in_progress" ? "badge-warning" :
        item.status === "critical" ? "badge-danger" :
        "badge-info";
 
    return `
        <tr>
            <td>${formatDate(item.timestamp)}</td>
            <td>${item.location || "--"}</td>
            <td>${item.type || "--"}</td>
            <td><span class="badge ${statusClass}">${item.status || "--"}</span></td>
        </tr>
    `;
 
}
 
 
// ============================================================
// Map Preview
// ============================================================
 
function initializeIndexMap() {
 
    if (typeof L === "undefined") return;
    if (!document.getElementById("map")) return;
 
    initializeMap("map");
 
}