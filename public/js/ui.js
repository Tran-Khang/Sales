import { login, verifyToken } from "/js/api.js";

const loginForm = document.getElementById("loginForm");
const errorMsg = document.getElementById("errorMsg");

// LOGIN
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        try {
            errorMsg.classList.add("hidden");
            const result = await login(username, password);

            localStorage.setItem("token", result.token);
            localStorage.setItem("user", JSON.stringify(result.user));

            // ✔ CHUẨN VERCEL
            window.location.href = "/pages/dashboard.html";
        } catch (error) {
            errorMsg.textContent = error.message;
            errorMsg.classList.remove("hidden");
        }
    });
}

// CHECK AUTH
export async function checkAuth() {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/pages/login.html";
        return false;
    }

    try {
        await verifyToken();
        return true;
    } catch (error) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/pages/login.html";
        return false;
    }
}

// LOGOUT
export function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "/pages/login.html";
}

// GET CURRENT USER
export function getCurrentUser() {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
}
