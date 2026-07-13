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
 
    map = L.map(containerId).setView([20.5937, 78.9629], 5);
 
    L.tileLayer(
 
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
 
        {
 
            attribution: "&copy; OpenStreetMap Contributors"
 
        }
 
    ).addTo(map);
 
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
 
    marker = L.marker([lat, lng])
 
        .addTo(map)
 
        .bindPopup(
 
            `Latitude : ${lat.toFixed(4)}<br>
             Longitude : ${lng.toFixed(4)}`
 
        )
 
        .openPopup();
 
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
