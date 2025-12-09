import { login, verifyToken } from "./api.js";

// Xử lý đăng nhập
const loginForm = document.getElementById("loginForm");
const errorMsg = document.getElementById("errorMsg");

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        try {
            errorMsg.classList.add("hidden");

            const result = await login(username, password);

            // Lưu token vào localStorage
            localStorage.setItem("token", result.token);
            localStorage.setItem("user", JSON.stringify(result.user));

            // Chuyển đến dashboard
            window.location.href = "/src/pages/dashboard.html";
        } catch (error) {
            errorMsg.textContent = error.message;
            errorMsg.classList.remove("hidden");
        }
    });
}

// Kiểm tra authentication cho các trang khác
export async function checkAuth() {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/src/pages/login.html";
        return false;
    }

    try {
        await verifyToken();
        return true;
    } catch (error) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/src/pages/login.html";
        return false;
    }
}

// Logout
export function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/src/pages/login.html";
}

// Lấy thông tin user hiện tại
export function getCurrentUser() {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
}
