(function () {
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", function () {
        navigator.serviceWorker.register("/service-worker.js")
            .catch(function (error) {
                console.log("FloodWatch PWA registration failed:", error);
            });
    });
})();
