// ======================================================
// FloodWatch Login Page
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    initializeLogin();

});

// ======================================================
// Initialize
// ======================================================

function initializeLogin() {

    const loginForm = document.getElementById("loginForm");

    if (!loginForm) return;

    loginForm.addEventListener("submit", loginUser);

}

// ======================================================
// UI Helpers
// ======================================================

function showLoading(show) {

    const loading = document.getElementById("loading");

    const button = document.getElementById("loginButton");

    if (show) {

        loading.classList.add("show");

        button.disabled = true;

        button.textContent = "Logging in...";

    }

    else {

        loading.classList.remove("show");

        button.disabled = false;

        button.textContent = "Login";

    }

}

function hideMessages() {

    document
        .getElementById("error")
        .classList.remove("show");

    document
        .getElementById("success")
        .classList.remove("show");

}

function showError(message) {

    const error = document.getElementById("error");

    error.textContent = message;

    error.classList.add("show");

}

function showSuccess(message) {

    const success = document.getElementById("success");

    success.textContent = message;

    success.classList.add("show");

}

// ======================================================
// Login
// ======================================================

async function loginUser(e) {

    e.preventDefault();

    hideMessages();

    const identifier = document
        .getElementById("identifier")
        .value
        .trim();

    const password = document
        .getElementById("password")
        .value;

    if (!identifier || !password) {

        showError("Please fill in all fields.");

        return;

    }

    showLoading(true);

    try {

        const response = await fetch("/login", {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            credentials: "include",

            body: JSON.stringify({

                identifier,

                password

            })

        });

        const data = await response.json();

        showLoading(false);

        if (data.success) {

            showSuccess(

                data.message ||

                "Login successful. Redirecting..."

            );

            setTimeout(() => {

                window.location.href =

                    data.redirect || "/";

            }, 1000);

        }

        else {

            showError(

                data.errors?.general ||

                "Login failed. Please try again."

            );

        }

    }

    catch (error) {

        console.error(error);

        showLoading(false);

        showError(

            "Network error. Please check your connection."

        );

    }

}

// ======================================================
// Enter Key Support
// ======================================================

document.addEventListener("keypress", function (e) {

    if (e.key === "Enter") {

        const form = document.getElementById("loginForm");

        if (form) {

            form.requestSubmit();

        }

    }

});