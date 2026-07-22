// Initialize Map
let map;
let marker;
let currentCircle;

// Initialize map on page load
document.addEventListener('DOMContentLoaded', function () {
    initMap();

    // Add event listener to predict button
    document.getElementById('predictBtn').addEventListener('click', predictFlood);

    // Allow Enter key in input fields
    document.getElementById('latitude').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') predictFlood();
    });

    document.getElementById('longitude').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') predictFlood();
    });
});

function initMap() {
    // Create map centered on India
    map = L.map('map', {
        zoomControl: false
    }).setView([20.5937, 78.9629], 5);

    L.control.zoom({
        position: 'topright'
    }).addTo(map);

    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    });

    const satelliteLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
            attribution: 'Tiles &copy; Esri',
            maxZoom: 19
        }
    );

    const hybridLayer = L.layerGroup([
        L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            {
                attribution: 'Tiles &copy; Esri',
                maxZoom: 19
            }
        ),
        L.tileLayer(
            'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
            {
                attribution: 'Labels &copy; Esri',
                maxZoom: 19
            }
        )
    ]);

    streetLayer.addTo(map);

    L.control.layers({
        Streets: streetLayer,
        Satellite: satelliteLayer,
        Hybrid: hybridLayer
    }, null, {
        position: 'topleft',
        collapsed: true
    }).addTo(map);

    // Add click event to map
    map.on('click', function (e) {
        document.getElementById('latitude').value = e.latlng.lat.toFixed(4);
        document.getElementById('longitude').value = e.latlng.lng.toFixed(4);
        updateMarker(e.latlng.lat, e.latlng.lng);
    });

    // Set initial marker
    const initialLat = parseFloat(document.getElementById('latitude').value);
    const initialLon = parseFloat(document.getElementById('longitude').value);
    updateMarker(initialLat, initialLon);

    setTimeout(() => {

    map.invalidateSize();

},200);
}

function updateMarker(lat, lon, riskLevel = null) {
    // Remove existing marker and circle
    if (marker) {
        map.removeLayer(marker);
    }
    if (currentCircle) {
        map.removeLayer(currentCircle);
    }

    // Determine marker color based on risk level
    let markerColor = '#1d4ed8';
    let iconHtml = '<span class="marker-dot marker-default"></span>';

    if (riskLevel === 'HIGH') {
        markerColor = '#dc2626';
        iconHtml = '<span class="marker-dot marker-high"></span>';
    } else if (riskLevel === 'MEDIUM') {
        markerColor = '#d97706';
        iconHtml = '<span class="marker-dot marker-medium"></span>';
    } else if (riskLevel === 'LOW') {
        markerColor = '#16a34a';
        iconHtml = '<span class="marker-dot marker-low"></span>';
    }

    // Create custom icon
    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: iconHtml,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    });

    // Add new marker
    marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);

    // Add circle to show analysis area (10km radius)
    currentCircle = L.circle([lat, lon], {
        radius: 10000, // 10 km
        color: markerColor,
        fillColor: markerColor,
        fillOpacity: 0.1,
        weight: 2
    }).addTo(map);

    // Center map on marker
    map.setView([lat, lon], 10);
}

function selectLocation(lat, lon, name) {
    document.getElementById('latitude').value = lat;
    document.getElementById('longitude').value = lon;
    updateMarker(lat, lon);

    // Add popup with location name
    if (marker) {
        marker.bindPopup(`<b>${name}</b><br>Ready for risk assessment`).openPopup();
    }
}

async function predictFlood() {
    const lat = parseFloat(document.getElementById('latitude').value);
    const lon = parseFloat(document.getElementById('longitude').value);

    // Validate inputs
    if (isNaN(lat) || isNaN(lon)) {
        alert('Please enter valid coordinates');
        return;
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        alert('Invalid coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180');
        return;
    }

    // Show loading, hide results
    document.getElementById('loadingCard').style.display = 'block';
    document.getElementById('resultsCard').style.display = 'none';

    try {
        // Make API request
        const response = await fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // Include session cookies
            body: JSON.stringify({
                latitude: lat,
                longitude: lon
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        // Hide loading
        document.getElementById('loadingCard').style.display = 'none';

        // Display results
        displayResults(data, lat, lon);

    } catch (error) {
        console.error(error);

document.getElementById('loadingCard').style.display = 'none';

alert("An unexpected error occurred while updating the dashboard.");
    }
}

function displayResults(data, lat, lon) {
    // Show results card
    document.getElementById('resultsCard').style.display = 'block';

    // Update risk percentage and gauge
    const percentageValue = getPredictionPercent(data);
    const percentage = percentageValue.toFixed(1);
    document.getElementById('riskPercentage').textContent = percentage + '%';
    document.getElementById('gaugeFill').style.width = percentage + '%';

    // Update risk level badge
    const riskBadge = document.getElementById('riskLevel');
    riskBadge.textContent = data.risk_level;
    riskBadge.parentElement.className = 'risk-badge';

    if (data.risk_level === 'HIGH') {
        riskBadge.className = 'risk-high';
    } else if (data.risk_level === 'MEDIUM') {
        riskBadge.className = 'risk-medium';
    } else {
        riskBadge.className = 'risk-low';
    }

    // Update features
    if (data.features) {
        const features = getPredictionFeatures(data);
        document.getElementById('rainfall').textContent = formatNumber(features.rainfall) + ' mm';
        document.getElementById('soilMoisture').textContent = formatNumber(features.soilMoisture, 4) + ' m3/m3';
        document.getElementById('elevation').textContent = formatNumber(features.elevation) + ' m';
        document.getElementById('slope').textContent = formatNumber(features.slope) + ' deg';
    }

    // Update marker on map
    updateMarker(lat, lon, data.risk_level);

    // Add popup to marker
    if (marker) {
        const popupContent = `
            <div class="popup-content">
                <h3>Flood Risk Analysis</h3>
                <div class="popup-risk ${data.risk_level === 'HIGH' ? 'risk-high' : data.risk_level === 'MEDIUM' ? 'risk-medium' : 'risk-low'}">
                    ${data.risk_level} RISK
                </div>
                <p style="margin-top: 10px;">Probability: ${percentage}%</p>
            </div>
        `;
        marker.bindPopup(popupContent).openPopup();
    }

    // Scroll to results
    document.getElementById('resultsCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Keep fallback browser notifications aligned with backend MEDIUM/HIGH alerts.
    if (data.risk_level === 'MEDIUM' || data.risk_level === 'HIGH') {
        saveNotification(data, lat, lon);
        showAlertMessage(data.flood_probability, data.risk_level);
    }
}

function saveNotification(data, lat, lon) {
    // Save notification to localStorage
    const notification = {
        timestamp: new Date().toISOString(),
        location: { lat, lon },
        flood_probability: data.flood_probability,
        risk_level: data.risk_level,
        features: data.features,
        data_source: data.data_source || 'GEE (Historical)',
        email_sent: data.email_sent || false
    };

    // Get existing notifications
    const notifications = JSON.parse(localStorage.getItem('floodNotifications') || '[]');

    // Add new notification at the beginning
    notifications.unshift(notification);

    // Keep only last 50 notifications
    if (notifications.length > 50) {
        notifications.splice(50);
    }

    // Save back to localStorage
    localStorage.setItem('floodNotifications', JSON.stringify(notifications));

    // Update notification badge
    updateNotificationBadge();

    console.log('Notification saved:', notification);
}

function showAlertMessage(probability, riskLevel) {
    const percentage = (probability * 100).toFixed(1);
    let severityLabel = 'High';
    let color = '#dc2626';

    if (riskLevel === 'MEDIUM') {
        severityLabel = 'Medium';
        color = '#d97706';
    }

    // Create alert message element
    const alertDiv = document.createElement('div');
    alertDiv.className = 'flood-alert-popup';
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-left: 5px solid ${color};
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
    `;

    alertDiv.innerHTML = `
        <div style="display: flex; align-items: start;">
            <div style="width: 14px; height: 14px; border-radius: 4px; background: ${color}; margin: 6px 15px 0 0;"></div>
            <div style="flex: 1;">
                <h3 style="margin: 0 0 10px 0; color: #1e293b;">
                    FLOOD ALERT
                </h3>
                <p style="margin: 0 0 10px 0; color: #475569;">
                    <strong>${severityLabel} risk detected.</strong><br>
                    Flood probability: <strong style="color: ${color};">${percentage}%</strong>
                </p>
                <p style="margin: 0 0 15px 0; color: #64748b; font-size: 14px;">
                    This alert has been saved to your notifications.
                </p>
                <div style="display: flex; gap: 10px;">
                    <a href="/notifications" style="
                        display: inline-block;
                        padding: 8px 16px;
                        background: ${color};
                        color: white;
                        text-decoration: none;
                        border-radius: 6px;
                        font-size: 14px;
                        font-weight: 600;
                    ">View Notifications</a>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
                        padding: 8px 16px;
                        background: #e2e8f0;
                        color: #475569;
                        border: none;
                        border-radius: 6px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                    ">Dismiss</button>
                </div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #94a3b8;
                padding: 0;
                margin-left: 10px;
            ">&times;</button>
        </div>
    `;

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(alertDiv);

    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => alertDiv.remove(), 300);
        }
    }, 10000);
}

function updateNotificationBadge() {
    const notifications = JSON.parse(localStorage.getItem('floodNotifications') || '[]');
    const badge = document.getElementById('notificationBadge');

    if (notifications.length > 0) {
        badge.textContent = notifications.length;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

// Update badge on page load
document.addEventListener('DOMContentLoaded', function () {
    updateNotificationBadge();
});

// ======================================================
// FloodWatch Community Dashboard
// ======================================================

document.addEventListener("DOMContentLoaded", function () {

    initCommunityMap();

});


// ======================================================

function initCommunityMap() {

    map = L.map("communityMap").setView([17.3850,78.4867],11);

    L.tileLayer(

        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

        {

            maxZoom:19,

            attribution:"© OpenStreetMap"

        }

    ).addTo(map);



    //----------------------------------------------------
    // Citizen Reports
    //----------------------------------------------------

    addIncident(

        17.401,

        78.495,

        "Waterlogging",

        "HIGH"

    );



    addIncident(

        17.376,

        78.480,

        "Tree Fall",

        "MEDIUM"

    );



    addIncident(

        17.364,

        78.512,

        "Road Block",

        "LOW"

    );



    //----------------------------------------------------
    // Volunteers
    //----------------------------------------------------

    addVolunteer(

        17.392,

        78.475,

        "Volunteer Rahul"

    );



    addVolunteer(

        17.379,

        78.492,

        "Volunteer Priya"

    );



    //----------------------------------------------------
    // Shelters
    //----------------------------------------------------

    addShelter(

        17.388,

        78.502,

        "Community Hall"

    );



    addShelter(

        17.405,

        78.470,

        "Government School"

    );

}


// ======================================================

function addIncident(

    lat,

    lng,

    title,

    level

){

    let color="green";



    if(level==="HIGH")

        color="red";



    if(level==="MEDIUM")

        color="orange";



    const marker=L.circleMarker(

        [lat,lng],

        {

            radius:9,

            color:color,

            fillColor:color,

            fillOpacity:0.9

        }

    ).addTo(map);



    marker.bindPopup(

        "<b>"+title+"</b><br>"+

        "Priority : "+level+

        "<br><br>"+

        "<button>Assign Volunteer</button>"

    );

}


// ======================================================

function addVolunteer(

    lat,

    lng,

    name

){

    const icon=L.divIcon({

        className:"volunteer-marker",

        html:"🟢",

        iconSize:[20,20]

    });



    L.marker(

        [lat,lng],

        {icon:icon}

    )

    .addTo(map)

    .bindPopup(

        "<b>"+name+"</b><br>Available"

    );

}


// ======================================================

function addShelter(

    lat,

    lng,

    name

){

    const icon=L.divIcon({

        className:"shelter-marker",

        html:"🏠",

        iconSize:[22,22]

    });



    L.marker(

        [lat,lng],

        {icon:icon}

    )

    .addTo(map)

    .bindPopup(

        "<b>"+name+"</b><br>Relief Shelter"

    );

}
document.addEventListener("DOMContentLoaded", () => {

    if (document.getElementById("citizenMap")) {
        initCitizenMap();
    }

    if (document.getElementById("communityMap")) {
        initCommunityMap();
    }

    if (document.getElementById("governmentMap")) {
        initGovernmentMap();
    }

});
