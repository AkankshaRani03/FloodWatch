// ============================================================
// FloodWatch Mobile Features
// GPS · Share · Haptic · Pull-to-refresh · Install Banner
// Splash Screen · Image Compression · EXIF GPS extraction
// ============================================================

(function () {
    "use strict";

    // --------------------------------------------------------
    // Run on DOM ready
    // --------------------------------------------------------
    document.addEventListener("DOMContentLoaded", () => {
        initSplashScreen();
        initGPSButton();
        initInstallBanner();
        initPullToRefresh();
        initShareButtons();
        injectAppleMetaTags();
    });


    // ========================================================
    // 1. SPLASH SCREEN
    // Shows the logo for 1.8s on PWA launch (standalone mode)
    // ========================================================

    function initSplashScreen() {
        const isStandalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            window.navigator.standalone === true;

        if (!isStandalone) return;
        if (sessionStorage.getItem("fw_splash_shown")) return;

        const splash = document.createElement("div");
        splash.id = "fwSplash";
        splash.innerHTML = `
            <div class="fw-splash-inner">
                <img src="/static/icons/floodwatch-logo.svg"
                     alt="FloodWatch"
                     class="fw-splash-logo">
                <h1 class="fw-splash-title">FloodWatch</h1>
                <p class="fw-splash-sub">Flood Prediction System</p>
                <div class="fw-splash-spinner"></div>
            </div>
        `;
        document.body.appendChild(splash);

        sessionStorage.setItem("fw_splash_shown", "1");

        setTimeout(() => {
            splash.classList.add("fw-splash-hide");
            setTimeout(() => splash.remove(), 500);
        }, 1800);
    }


    // ========================================================
    // 2. GPS AUTO-DETECT
    // Injects a "Use My Location" button next to the predict
    // button on any page that has #latitude / #longitude inputs
    // ========================================================

    function initGPSButton() {
        const latInput  = document.getElementById("latitude");
        const lonInput  = document.getElementById("longitude");
        const predictBtn = document.getElementById("predictBtn");

        if (!latInput || !lonInput || !predictBtn) return;
        if (document.getElementById("gpsLocateBtn")) return;

        const btn = document.createElement("button");
        btn.id        = "gpsLocateBtn";
        btn.type      = "button";
        btn.className = "btn-gps";
        btn.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> Use My Location`;
        btn.setAttribute("aria-label", "Detect my GPS location");

        predictBtn.parentNode.insertBefore(btn, predictBtn);

        btn.addEventListener("click", () => requestGPS(btn, latInput, lonInput));
    }

    function requestGPS(btn, latInput, lonInput) {
        if (!navigator.geolocation) {
            showMobileToast("GPS not supported on this device.", "error");
            return;
        }

        btn.disabled  = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Locating…`;
        haptic("light");

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;

                latInput.value = lat.toFixed(6);
                lonInput.value = lon.toFixed(6);

                // Update map marker if common.js updateLocation exists
                if (typeof updateLocation === "function") {
                    updateLocation(lat, lon);
                    if (typeof map !== "undefined" && map) {
                        map.setView([lat, lon], 13);
                    }
                }

                haptic("medium");
                showMobileToast("Location detected!", "success");

                btn.disabled  = false;
                btn.innerHTML = `<i class="fa-solid fa-location-dot"></i> Location Set`;

                setTimeout(() => {
                    btn.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> Use My Location`;
                }, 3000);
            },
            (err) => {
                btn.disabled  = false;
                btn.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> Use My Location`;

                const msgs = {
                    1: "Location permission denied. Please allow access in your browser settings.",
                    2: "Could not determine your location. Try again.",
                    3: "Location request timed out. Try again.",
                };
                showMobileToast(msgs[err.code] || "Location unavailable.", "error");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
    }


    // ========================================================
    // 3. PWA INSTALL BANNER
    // Custom "Add to Home Screen" bar shown at the bottom when
    // the browser fires beforeinstallprompt (Android Chrome)
    // ========================================================

    let _deferredInstallPrompt = null;

    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        _deferredInstallPrompt = e;

        // Don't show if dismissed before
        if (localStorage.getItem("fw_install_dismissed")) return;

        showInstallBanner();
    });

    window.addEventListener("appinstalled", () => {
        hideInstallBanner();
        showMobileToast("FloodWatch installed successfully!", "success");
        haptic("medium");
    });

    function initInstallBanner() {
        // Already shown via event listener; this handles
        // edge-cases where the event fired before DOMContentLoaded
        if (_deferredInstallPrompt && !localStorage.getItem("fw_install_dismissed")) {
            showInstallBanner();
        }
    }

    function showInstallBanner() {
        if (document.getElementById("fwInstallBanner")) return;

        const banner = document.createElement("div");
        banner.id        = "fwInstallBanner";
        banner.className = "fw-install-banner";
        banner.innerHTML = `
            <img src="/static/icons/floodwatch-logo.svg"
                 alt="FloodWatch" class="fw-install-icon">
            <div class="fw-install-text">
                <strong>Install FloodWatch</strong>
                <span>Add to home screen for instant flood alerts</span>
            </div>
            <button class="fw-install-btn" id="fwInstallAccept">Install</button>
            <button class="fw-install-dismiss" id="fwInstallDismiss"
                    aria-label="Dismiss">✕</button>
        `;
        document.body.appendChild(banner);

        requestAnimationFrame(() => banner.classList.add("fw-install-visible"));

        document.getElementById("fwInstallAccept").addEventListener("click", async () => {
            if (!_deferredInstallPrompt) return;
            _deferredInstallPrompt.prompt();
            const { outcome } = await _deferredInstallPrompt.userChoice;
            if (outcome === "accepted") haptic("medium");
            _deferredInstallPrompt = null;
            hideInstallBanner();
        });

        document.getElementById("fwInstallDismiss").addEventListener("click", () => {
            localStorage.setItem("fw_install_dismissed", "1");
            hideInstallBanner();
        });
    }

    function hideInstallBanner() {
        const banner = document.getElementById("fwInstallBanner");
        if (!banner) return;
        banner.classList.remove("fw-install-visible");
        setTimeout(() => banner.remove(), 350);
    }


    // ========================================================
    // 4. PULL-TO-REFRESH
    // Native-feel pull gesture that reloads the page content
    // ========================================================

    let _ptrStartY   = 0;
    let _ptrActive   = false;
    let _ptrIndicator = null;
    const PTR_THRESHOLD = 72;

    function initPullToRefresh() {
        // Only enable on touch devices
        if (!("ontouchstart" in window)) return;

        document.addEventListener("touchstart", onPTRStart, { passive: true });
        document.addEventListener("touchmove",  onPTRMove,  { passive: false });
        document.addEventListener("touchend",   onPTREnd,   { passive: true });

        _ptrIndicator = document.createElement("div");
        _ptrIndicator.id        = "fwPTRIndicator";
        _ptrIndicator.className = "fw-ptr-indicator";
        _ptrIndicator.innerHTML = `<i class="fa-solid fa-rotate"></i>`;
        document.body.appendChild(_ptrIndicator);
    }

    function onPTRStart(e) {
        if (window.scrollY === 0) {
            _ptrStartY  = e.touches[0].clientY;
            _ptrActive  = true;
        }
    }

    function onPTRMove(e) {
        if (!_ptrActive) return;
        const dy = e.touches[0].clientY - _ptrStartY;
        if (dy > 10 && window.scrollY === 0) {
            e.preventDefault();
            const progress = Math.min(dy / PTR_THRESHOLD, 1);
            _ptrIndicator.style.opacity    = String(progress);
            _ptrIndicator.style.transform  = `translateY(${Math.min(dy * 0.4, 30)}px)`;
            _ptrIndicator.querySelector("i").style.transform =
                `rotate(${progress * 360}deg)`;
        }
    }

    function onPTREnd(e) {
        if (!_ptrActive) return;
        _ptrActive = false;
        const dy = e.changedTouches[0].clientY - _ptrStartY;

        _ptrIndicator.style.opacity   = "0";
        _ptrIndicator.style.transform = "translateY(0)";

        if (dy > PTR_THRESHOLD) {
            haptic("light");
            _ptrIndicator.classList.add("fw-ptr-spin");
            showMobileToast("Refreshing…", "info");

            // Call page-specific refresh if available, otherwise reload
            setTimeout(() => {
                if (typeof refreshGovernmentDashboard === "function") {
                    refreshGovernmentDashboard();
                } else if (typeof loadIncidentReports === "function") {
                    loadIncidentReports();
                    if (typeof loadNotifications === "function") loadNotifications();
                } else if (typeof refreshAlerts === "function") {
                    refreshAlerts();
                } else {
                    window.location.reload();
                }
                _ptrIndicator.classList.remove("fw-ptr-spin");
            }, 800);
        }
    }


    // ========================================================
    // 5. NATIVE SHARE
    // Adds a share button to the prediction results card and
    // uses the Web Share API for native mobile sharing
    // ========================================================

    function initShareButtons() {
        // Wire up any static share buttons on the page
        document.querySelectorAll("[data-share]").forEach(btn => {
            btn.addEventListener("click", () => shareCurrentPage());
        });

        // Dynamically inject share button into results card
        injectResultsShareButton();
    }

    function injectResultsShareButton() {
        const resultsCard = document.getElementById("resultsCard");
        if (!resultsCard) return;
        if (resultsCard.querySelector(".fw-share-btn")) return;

        const btn = document.createElement("button");
        btn.className   = "fw-share-btn";
        btn.type        = "button";
        btn.innerHTML   = `<i class="fa-solid fa-share-nodes"></i> Share Result`;
        btn.addEventListener("click", shareResult);
        resultsCard.appendChild(btn);
    }

    async function shareResult() {
        haptic("light");

        const riskLevel  = document.getElementById("riskLevel")?.textContent   || "UNKNOWN";
        const probability = document.getElementById("riskPercentage")?.textContent || "--";
        const lat        = document.getElementById("latitude")?.value;
        const lon        = document.getElementById("longitude")?.value;

        let locationName = "Unknown location";
        if (lat && lon && typeof reverseGeocode === "function") {
            locationName = await reverseGeocode(parseFloat(lat), parseFloat(lon));
        }

        const text =
            `🌊 FloodWatch Alert\n` +
            `Risk Level: ${riskLevel}\n` +
            `Probability: ${probability}\n` +
            `Location: ${locationName}\n` +
            `\nGenerated by FloodWatch — Flood Prediction using GEE`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${riskLevel} Flood Risk — FloodWatch`,
                    text,
                    url: window.location.href,
                });
            } catch (err) {
                if (err.name !== "AbortError") copyToClipboardFallback(text);
            }
        } else {
            copyToClipboardFallback(text);
        }
    }

    async function shareCurrentPage() {
        haptic("light");
        if (navigator.share) {
            try {
                await navigator.share({
                    title: document.title,
                    url: window.location.href,
                });
            } catch {}
        } else {
            navigator.clipboard.writeText(window.location.href)
                .then(() => showMobileToast("Link copied!", "success"))
                .catch(() => {});
        }
    }

    function copyToClipboardFallback(text) {
        navigator.clipboard.writeText(text)
            .then(() => showMobileToast("Result copied to clipboard!", "success"))
            .catch(() => showMobileToast("Tap and hold to copy.", "info"));
    }


    // ========================================================
    // 6. HAPTIC FEEDBACK
    // Uses the Vibration API — silently ignored if unsupported
    // ========================================================

    function haptic(type) {
        if (!navigator.vibrate) return;
        const patterns = {
            light:  [30],
            medium: [60],
            heavy:  [100],
            double: [40, 60, 40],
            error:  [80, 50, 80],
        };
        navigator.vibrate(patterns[type] || patterns.light);
    }

    // Expose globally so other scripts can call haptic()
    window.haptic = haptic;


    // ========================================================
    // 7. MOBILE TOAST NOTIFICATION
    // Lightweight in-app toast for mobile feedback
    // ========================================================

    function showMobileToast(message, type = "info") {
        const existing = document.getElementById("fwMobileToast");
        if (existing) existing.remove();

        const icons = {
            success: "fa-circle-check",
            error:   "fa-circle-xmark",
            info:    "fa-circle-info",
            warning: "fa-triangle-exclamation",
        };

        const toast = document.createElement("div");
        toast.id        = "fwMobileToast";
        toast.className = `fw-mobile-toast fw-toast-${type}`;
        toast.innerHTML = `
            <i class="fa-solid ${icons[type] || icons.info}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add("fw-toast-show"));

        const duration = type === "error" ? 5000 : 3000;
        setTimeout(() => {
            toast.classList.remove("fw-toast-show");
            setTimeout(() => toast.remove(), 350);
        }, duration);
    }

    // Expose globally
    window.showMobileToast = showMobileToast;


    // ========================================================
    // 8. APPLE PWA META TAGS (runtime injection)
    // ========================================================

    function injectAppleMetaTags() {
        const head = document.head;

        const addMeta = (name, content) => {
            if (document.querySelector(`meta[name="${name}"]`)) return;
            const m = document.createElement("meta");
            m.name    = name;
            m.content = content;
            head.appendChild(m);
        };

        const addLink = (rel, href, extra = {}) => {
            const l = document.createElement("link");
            l.rel  = rel;
            l.href = href;
            Object.assign(l, extra);
            head.appendChild(l);
        };

        addMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
        addLink("apple-touch-icon", "/static/icons/floodwatch-logo.svg");
        addLink("apple-touch-startup-image", "/static/icons/floodwatch-logo.svg");
    }

})();
