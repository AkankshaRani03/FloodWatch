// ============================================================
// FloodWatch Common JavaScript
// Used By:
// Index
// Citizen
// Community
// Government
// Admin
// ============================================================
 
 
// ============================================================
// Initialize
// ============================================================
 
document.addEventListener("DOMContentLoaded", () => {
 
    initializeNotifications();
 
    initializeLogout();
 
    initializeModal();

    initializeMobileNavigation();
 
});
 
 
// ============================================================
// Notification Badge
// ============================================================
 
async function initializeNotifications(){
 
    const badge=document.getElementById("notificationBadge");
 
    if(!badge) return;
 
    try{
 
        const response=await fetch("/notifications/count");
 
        if(!response.ok) return;
 
        const data=await response.json();
 
        badge.textContent=data.count || 0;
 
    }
 
    catch(error){
 
        console.log("Notification service unavailable.");
 
    }
 
}
 
 
// ============================================================
// Logout Confirmation
// ============================================================
 
function initializeLogout(){
 
    const logout=document.querySelector(".logout-button");
 
    if(!logout) return;
 
    logout.addEventListener("click",function(e){
 
        const confirmLogout=confirm(
 
            "Are you sure you want to logout?"
 
        );
 
        if(!confirmLogout){
 
            e.preventDefault();
 
        }
 
    });
 
}
 
 
// ============================================================
// Shared Card Modal
// Any page can call openModal(title, bodyHtml) to elaborate a
// card into a detail view or a quick-add form. Requires the
// markup block with id="cardModalOverlay" to be present on
// the page (see community_dashboard.html for reference).
// ============================================================
 
function initializeModal(){
 
    const overlay=document.getElementById("cardModalOverlay");
 
    if(!overlay) return;
 
    const closeBtn=document.getElementById("modalCloseBtn");
 
    if(closeBtn){
 
        closeBtn.addEventListener("click",closeModal);
 
    }
 
    overlay.addEventListener("click",function(e){
 
        if(e.target===overlay){
 
            closeModal();
 
        }
 
    });
 
    document.addEventListener("keydown",function(e){
 
        if(e.key==="Escape" && overlay.classList.contains("active")){
 
            closeModal();
 
        }
 
    });
 
}
 
function openModal(title,bodyHtml){
 
    const overlay=document.getElementById("cardModalOverlay");
 
    if(!overlay) return;
 
    const titleEl=document.getElementById("modalTitle");
 
    const bodyEl=document.getElementById("modalBody");
 
    if(titleEl) titleEl.textContent=title;
 
    if(bodyEl) bodyEl.innerHTML=bodyHtml;
 
    overlay.classList.add("active");
 
    document.body.style.overflow="hidden";
 
}
 
function setModalBody(bodyHtml){
 
    const bodyEl=document.getElementById("modalBody");
 
    if(bodyEl) bodyEl.innerHTML=bodyHtml;
 
}
 
function closeModal(){
 
    const overlay=document.getElementById("cardModalOverlay");
 
    if(!overlay) return;
 
    overlay.classList.remove("active");
 
    document.body.style.overflow="";
 
}
 
 
// ============================================================
// Loading Helpers
// ============================================================
 
function showLoading(id){
 
    const element=document.getElementById(id);
 
    if(element){
 
        element.style.display="block";
 
    }
 
}
 
function hideLoading(id){
 
    const element=document.getElementById(id);
 
    if(element){
 
        element.style.display="none";
 
    }
 
}
 
 
// ============================================================
// Alert Helpers
// ============================================================
 
function showSuccess(message){
 
    alert(message);
 
}
 
function showError(message){
 
    alert(message);
 
}
// ============================================================
// Reverse Geocoding — Nominatim
// Converts lat/lon to a human-readable place name.
// Results are cached in memory so the same coordinates are
// never fetched more than once per page load.
// ============================================================

const _geocodeCache = {};

async function reverseGeocode(lat, lon) {
    const key = `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;
    if (_geocodeCache[key]) return _geocodeCache[key];
    try {
        const url =
            `https://nominatim.openstreetmap.org/reverse` +
            `?lat=${lat}&lon=${lon}&format=json&zoom=10`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        if (!res.ok) throw new Error('geocode_fail');
        const data = await res.json();
        const a = data.address || {};
        const city  = a.city || a.town || a.village || a.suburb ||
                      a.county || a.state_district || a.state || '';
        const state = a.state || '';
        const name  = (city && state && state !== city)
            ? `${city}, ${state}`
            : city || state || `${Number(lat).toFixed(4)}°, ${Number(lon).toFixed(4)}°`;
        _geocodeCache[key] = name;
        return name;
    } catch {
        return `${Number(lat).toFixed(4)}°, ${Number(lon).toFixed(4)}°`;
    }
}


// ============================================================
// Map Utilities
// ============================================================
 
let map = null;
let marker = null;
 
function initializeMap(containerId = "map") {
 
    const mapContainer = document.getElementById(containerId);
 
    if (!mapContainer) return null;
 
    if (map !== null) {
 
        map.remove();
 
        map = null;
 
    }
 
    map = L.map(containerId, {
        zoomControl: false
    }).setView([20.5937, 78.9629], 5);

    L.control.zoom({
        position: "bottomright"
    }).addTo(map);

    const streetLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors"
        }
    );

    const satelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
            maxZoom: 19,
            attribution: "Tiles &copy; Esri"
        }
    );

    const hybridLabels = L.tileLayer(
        "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        {
            maxZoom: 19,
            attribution: "Labels &copy; Esri"
        }
    );

    const hybridLayer = L.layerGroup([
        L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            {
                maxZoom: 19,
                attribution: "Tiles &copy; Esri"
            }
        ),
        hybridLabels
    ]);

    const baseLayers = {
        "Streets": streetLayer,
        "Satellite": satelliteLayer,
        "Hybrid": hybridLayer
    };

    streetLayer.addTo(map);

    L.control.layers(baseLayers, null, {
        position: "topleft",
        collapsed: false
    }).addTo(map);
 
    map.on("click", function (e) {
 
        updateLocation(
 
            e.latlng.lat,
 
            e.latlng.lng
 
        );
 
    });
 
    return map;
 
}
 
 
// ============================================================
// Marker
// ============================================================

function updateLocation(lat, lng) {

    const latitude = document.getElementById("latitude");

    const longitude = document.getElementById("longitude");

    if (latitude) {

        latitude.value = Number(lat).toFixed(6);

    }

    if (longitude) {

        longitude.value = Number(lng).toFixed(6);

    }

    if (!map) return;

    if (marker) {

        marker.remove();

    }

    // Place marker immediately with coordinates, then update
    // the popup with the resolved place name once geocoding completes.
    marker = L.marker([lat, lng])

        .addTo(map)

        .bindPopup(
            `<strong>Locating…</strong><br>
             <small>${Number(lat).toFixed(4)}°N, ${Number(lng).toFixed(4)}°E</small>`
        )

        .openPopup();

    // Async: replace popup content with actual place name
    reverseGeocode(lat, lng).then(placeName => {

        if (marker) {

            marker.setPopupContent(
                `<strong>${placeName}</strong><br>
                 <small>${Number(lat).toFixed(4)}°N, ${Number(lng).toFixed(4)}°E</small>`
            );

        }

    });

}
 
 
// ============================================================
// Priority Location Helper
// ============================================================
 
function selectLocation(lat, lng, place = "") {
 
    updateLocation(lat, lng);
 
    if (map) {
 
        map.setView([lat, lng], 11);
 
    }
 
    if (place !== "") {
 
        console.log("Selected:", place);
 
    }
 
}
 
 
// ============================================================
// Generic Fetch Helper
// ============================================================
 
async function fetchJSON(url, options = {}) {
 
    const response = await fetch(url, options);
 
    if (!response.ok) {
 
        throw new Error(
 
            "Request Failed"
 
        );
 
    }
 
    return await response.json();
 
}
 
 
// ============================================================
// Format Helpers
// ============================================================
 
function formatNumber(value, decimals = 2) {
 
    if (
 
        value === null ||
 
        value === undefined ||
 
        value === ""
 
    ) {
 
        return "--";
 
    }
 
    return Number(value).toFixed(decimals);
 
}
 
 
function formatPercentage(value) {
 
    return formatNumber(value, 1) + "%";
 
}


// ============================================================
// Prediction Response Helpers
// Backend keeps flood_probability as 0-1 for storage/email, while
// dashboards display flood_probability_percent as 0-100.
// ============================================================

function getPredictionPercent(data) {

    if (!data) return 0;

    if (data.flood_probability_percent !== undefined) {

        return Number(data.flood_probability_percent) || 0;

    }

    const raw = Number(data.flood_probability || 0);

    return raw <= 1 ? raw * 100 : raw;

}


function getPredictionFeatures(data) {

    const features = (data && data.features) || {};

    return {

        rainfall: features.rainfall_7d_mm ?? data?.rainfall,

        soilMoisture: features.soil_moisture ?? data?.soil_moisture,

        elevation: features.elevation_m ?? data?.elevation,

        slope: features.slope_deg ?? data?.slope

    };

}
 
 
function formatDate(dateString) {
 
    if (!dateString) return "--";
 
    return new Date(dateString)
 
        .toLocaleDateString(
 
            "en-IN",
 
            {
 
                day: "2-digit",
 
                month: "short",
 
                year: "numeric"
 
            }
 
        );
 
}
 
 
// ============================================================
// Copy to Clipboard
// ============================================================
 
function copyText(text) {
 
    navigator.clipboard
 
        .writeText(text)
 
        .then(() => {
 
            console.log("Copied");
 
        })
 
        .catch(() => {
 
            console.log("Unable to copy");
 
        });
 
}
 
 
// ============================================================
// Scroll Helper
// ============================================================
 
function scrollToTop() {
 
    window.scrollTo({
 
        top: 0,
 
        behavior: "smooth"
 
    });
 
}


// ============================================================
// Mobile Bottom Navigation
// Injected only on authenticated dashboard pages.
// ============================================================

function initializeMobileNavigation(){

    const logout=document.querySelector('.logout-button[href="/logout"]');

    if(!logout || document.getElementById("mobileBottomNav")) return;

    const nav=document.createElement("nav");

    nav.id="mobileBottomNav";

    nav.className="mobile-bottom-nav";

    nav.innerHTML=`
        <a href="/" class="mobile-nav-item" data-path="/">
            <i class="fa-solid fa-house"></i>
            <span>Home</span>
        </a>
        <a href="/citizen" class="mobile-nav-item" data-path="/citizen">
            <i class="fa-solid fa-location-dot"></i>
            <span>Risk</span>
        </a>
        <a href="/notifications" class="mobile-nav-item" data-path="/notifications">
            <i class="fa-solid fa-bell"></i>
            <span>Alerts</span>
        </a>
        <a href="/logout" class="mobile-nav-item mobile-nav-danger">
            <i class="fa-solid fa-right-from-bracket"></i>
            <span>Logout</span>
        </a>
    `;

    document.body.appendChild(nav);

    const mobileLogout=nav.querySelector(".mobile-nav-danger");

    if(mobileLogout){

        mobileLogout.addEventListener("click",function(e){

            const confirmLogout=confirm(

                "Are you sure you want to logout?"

            );

            if(!confirmLogout){

                e.preventDefault();

            }

        });

    }

    const current=window.location.pathname;

    nav.querySelectorAll(".mobile-nav-item").forEach(item=>{

        if(item.dataset.path && item.dataset.path===current){

            item.classList.add("active");

        }

    });

}
