import { logout, getCurrentUser } from "./auth.js";

// Tạo navbar cho tất cả các trang
export function createNavbar(activePage = "") {
    const user = getCurrentUser();

    return `
    <nav class="bg-indigo-900 text-white shadow-lg">
      <div class="container mx-auto px-4 py-3">
        <div class="flex justify-between items-center">
          <div class="flex items-center space-x-6">
            <h1 class="text-xl font-bold">🏪 Sales Management</h1>
            <div class="hidden md:flex space-x-4">
              <a href="/public/pages/dashboard.html" class="hover:text-indigo-300 ${
                  activePage === "dashboard"
                      ? "text-yellow-300 font-semibold"
                      : ""
              }">Dashboard</a>
              <a href="/public/pages/products.html" class="hover:text-indigo-300 ${
                  activePage === "products"
                      ? "text-yellow-300 font-semibold"
                      : ""
              }">Sản phẩm</a>
              <a href="/public/pages/sales.html" class="hover:text-indigo-300 ${
                  activePage === "sales" ? "text-yellow-300 font-semibold" : ""
              }">Bán hàng</a>
              <a href="/public/pages/reports.html" class="hover:text-indigo-300 ${
                  activePage === "reports"
                      ? "text-yellow-300 font-semibold"
                      : ""
              }">Báo cáo</a>
            </div>
          </div>
          
          <div class="flex items-center space-x-4">
            <span class="text-sm">👤 ${user?.username || "User"}</span>
            <button id="logoutBtn" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-semibold transition">
              Đăng xuất
            </button>
          </div>
        </div>
        
        <!-- Mobile menu -->
        <div class="md:hidden mt-3 flex space-x-3 overflow-x-auto">
          <a href="/public/pages/dashboard.html" class="whitespace-nowrap hover:text-indigo-300 ${
              activePage === "dashboard" ? "text-yellow-300 font-semibold" : ""
          }">Dashboard</a>
          <a href="/public/pages/products.html" class="whitespace-nowrap hover:text-indigo-300 ${
              activePage === "products" ? "text-yellow-300 font-semibold" : ""
          }">Sản phẩm</a>
          <a href="/public/pages/sales.html" class="whitespace-nowrap hover:text-indigo-300 ${
              activePage === "sales" ? "text-yellow-300 font-semibold" : ""
          }">Bán hàng</a>
          <a href="/public/pages/reports.html" class="whitespace-nowrap hover:text-indigo-300 ${
              activePage === "reports" ? "text-yellow-300 font-semibold" : ""
          }">Báo cáo</a>
        </div>
      </div>
    </nav>
  `;
}

// Setup navbar và logout button
export function setupNavbar(activePage = "") {
    const navbarContainer = document.getElementById("navbar");
    if (navbarContainer) {
        navbarContainer.innerHTML = createNavbar(activePage);

        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", logout);
        }
    }
}

// Format số tiền VNĐ
export function formatCurrency(amount) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(amount);
}

// Format ngày giờ
export function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

// Hiển thị loading
export function showLoading(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerHTML =
            '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div><p class="mt-2 text-gray-600">Đang tải...</p></div>';
    }
}

// Hiển thị thông báo
export function showNotification(message, type = "success") {
    const notification = document.createElement("div");
    notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white ${
        type === "success"
            ? "bg-green-500"
            : type === "error"
            ? "bg-red-500"
            : "bg-blue-500"
    }`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Hiển thị confirm dialog
export function showConfirm(message) {
    return confirm(message);
}
