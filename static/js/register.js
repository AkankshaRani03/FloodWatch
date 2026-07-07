// ======================================================
// FloodWatch Register Page
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    const registerForm = document.getElementById("registerForm");

    if (!registerForm) return;

    initializeRegister();

});


// ======================================================
// Initialize
// ======================================================

function initializeRegister(){

    passwordStrength();

    initializeRoles();

    document
        .getElementById("registerForm")
        .addEventListener("submit", registerUser);

}


// ======================================================
// Password Strength
// ======================================================

function passwordStrength(){

    const passwordInput=document.getElementById("password");

    const strengthBar=document.getElementById("strengthBar");

    if(!passwordInput) return;

    passwordInput.addEventListener("input",()=>{

        const password=passwordInput.value;

        strengthBar.className="strength-bar-fill";

        if(password.length===0){

            return;

        }

        let score=0;

        if(password.length>=8) score++;

        if(/[A-Z]/.test(password)) score++;

        if(/[0-9]/.test(password)) score++;

        if(/[^A-Za-z0-9]/.test(password)) score++;

        if(score<=1){

            strengthBar.classList.add("strength-weak");

        }

        else if(score<=2){

            strengthBar.classList.add("strength-medium");

        }

        else{

            strengthBar.classList.add("strength-strong");

        }

    });

}


// ======================================================
// Dynamic Role Selection
// ======================================================

function initializeRoles(){

    const role=document.getElementById("role");

    if(!role) return;

    role.addEventListener("change",updateSubRoles);

    updateSubRoles();

}

function updateSubRoles(){

    const role=document.getElementById("role").value;

    const subRole=document.getElementById("sub_role");

    subRole.innerHTML="";

    switch(role){

        case "citizen":

            addOption(

                subRole,

                "citizen",

                "Citizen"

            );

            break;

        case "community_partner":

            addOption(

                subRole,

                "ngo",

                "NGO"

            );

            addOption(

                subRole,

                "youth_organization",

                "Youth Organization"

            );

            addOption(

                subRole,

                "community_volunteer",

                "Community Volunteer"

            );

            break;

        case "government":

            addOption(

                subRole,

                "municipal",

                "Municipal Authority"

            );

            addOption(

                subRole,

                "disaster_management",

                "Disaster Management"

            );

            addOption(

                subRole,

                "police",

                "Police Department"

            );

            addOption(

                subRole,

                "revenue",

                "Revenue Department"

            );

            break;

        case "admin":

            addOption(

                subRole,

                "admin",

                "System Administrator"

            );

            break;

    }

}

function addOption(select,value,text){

    const option=document.createElement("option");

    option.value=value;

    option.textContent=text;

    select.appendChild(option);

}


// ======================================================
// UI Helpers
// ======================================================

function showLoading(show){

    const loading=document.getElementById("loading");

    const button=document.getElementById("registerButton");

    if(show){

        loading.classList.add("show");

        button.disabled=true;

        button.textContent="Creating Account...";

    }

    else{

        loading.classList.remove("show");

        button.disabled=false;

        button.textContent="Create Account";

    }

}

function clearMessages(){

    document
        .getElementById("error")
        .classList.remove("show");

    document
        .getElementById("success")
        .classList.remove("show");

    document
        .querySelectorAll(".field-error")
        .forEach(e=>{

            e.classList.remove("show");

        });

    document
        .querySelectorAll("input")
        .forEach(i=>{

            i.classList.remove("error-input");

        });

}

function showMessage(type,message){

    const box=document.getElementById(type);

    box.textContent=message;

    box.classList.add("show");

}

function showFieldError(field,message){

    const input=document.getElementById(field);

    const error=document.getElementById(field+"Error");

    if(input){

        input.classList.add("error-input");

    }

    if(error){

        error.textContent=message;

        error.classList.add("show");

    }

}
// ======================================================
// Registration
// ======================================================

async function registerUser(e){

    e.preventDefault();

    clearMessages();

    const username=document.getElementById("username").value.trim();

    const email=document.getElementById("email").value.trim();

    const phone=document.getElementById("phone").value.trim();

    const role=document.getElementById("role").value;

    const subRole=document.getElementById("sub_role").value;

    const district=document.getElementById("district").value.trim();

    const city=document.getElementById("city").value.trim();

    const area=document.getElementById("area").value.trim();

    const password=document.getElementById("password").value;

    const confirm=document.getElementById("retype_password").value;

    // ==========================================
    // Basic Validation
    // ==========================================

    let valid=true;

    if(username.length<3){

        showFieldError(

            "username",

            "Username must contain at least 3 characters."

        );

        valid=false;

    }

    const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if(!emailPattern.test(email)){

        showFieldError(

            "email",

            "Enter a valid email address."

        );

        valid=false;

    }

    if(password.length<6){

        showFieldError(

            "password",

            "Password must be at least 6 characters."

        );

        valid=false;

    }

    if(password!==confirm){

        showFieldError(

            "retype_password",

            "Passwords do not match."

        );

        valid=false;

    }

    if(!valid){

        return;

    }

    // ==========================================

    showLoading(true);

    try{

        const response=await fetch("/register",{

            method:"POST",

            headers:{

                "Content-Type":"application/json"

            },

            body:JSON.stringify({

                username:username,

                email:email,

                phone:phone,

                role:role,

                sub_role:subRole,

                district:district,

                city:city,

                area:area,

                password:password,

                retype_password:confirm

            })

        });

        const data=await response.json();

        showLoading(false);

        if(data.success){

            showMessage(

                "success",

                data.message ||

                "Registration successful! Redirecting..."

            );

            setTimeout(()=>{

                window.location.href=

                data.redirect || "/";

            },1500);

        }

        else{

            if(data.errors){

                if(data.errors.username){

                    showFieldError(

                        "username",

                        data.errors.username

                    );

                }

                if(data.errors.email){

                    showFieldError(

                        "email",

                        data.errors.email

                    );

                }

                if(data.errors.password){

                    showFieldError(

                        "password",

                        data.errors.password

                    );

                }

                if(data.errors.general){

                    showMessage(

                        "error",

                        data.errors.general

                    );

                }

            }

            else{

                showMessage(

                    "error",

                    "Registration failed."

                );

            }

        }

    }

    catch(error){

        console.error(error);

        showLoading(false);

        showMessage(

            "error",

            "Network error. Please try again."

        );

    }

}