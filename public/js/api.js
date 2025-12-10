// Base API URL (thay đổi khi deploy lên Vercel)
const API_BASE = "/api";

// Helper function để lấy token
function getToken() {
    return localStorage.getItem("token");
}

// Helper function để tạo headers
function getHeaders() {
    const headers = {
        "Content-Type": "application/json",
    };

    const token = getToken();
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
}

// ========== AUTH API ==========
export async function login(username, password) {
    const res = await fetch(`${API_BASE}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Đăng nhập thất bại");
    }

    return await res.json();
}

export async function verifyToken() {
    const res = await fetch(`${API_BASE}/auth`, {
        method: "GET",
        headers: getHeaders(),
    });

    if (!res.ok) {
        throw new Error("Token không hợp lệ");
    }

    return await res.json();
}

// ========== PRODUCTS API ==========
export async function getProducts(search = "") {
    let url = `${API_BASE}/products`;
    if (search) {
        url += `?search=${encodeURIComponent(search)}`;
    }

    const res = await fetch(url, {
        method: "GET",
        headers: getHeaders(),
    });

    if (!res.ok) {
        throw new Error("Không thể tải danh sách sản phẩm");
    }

    return await res.json();
}

export async function searchProducts(keyword) {
    return getProducts(keyword);
}

export async function createProduct(name, price, stock) {
    const res = await fetch(`${API_BASE}/products`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ name, price, stock }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Không thể tạo sản phẩm");
    }

    return await res.json();
}

export async function updateProduct(id, name, price, stock) {
    const res = await fetch(`${API_BASE}/products`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ id, name, price, stock }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Không thể cập nhật sản phẩm");
    }

    return await res.json();
}

export async function deleteProduct(id) {
    const res = await fetch(`${API_BASE}/products?id=${id}`, {
        method: "DELETE",
        headers: getHeaders(),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Không thể xóa sản phẩm");
    }

    return await res.json();
}

// ========== PRODUCT DETAIL API ==========
export async function getProductDetail(id) {
    const res = await fetch(`${API_BASE}/product-detail?id=${id}`, {
        method: "GET",
        headers: getHeaders(),
    });

    if (!res.ok) {
        throw new Error("Không thể tải chi tiết sản phẩm");
    }

    return await res.json();
}

// ========== SALES API ==========
export async function getSales(filters = {}) {
    let url = `${API_BASE}/sales`;
    const params = new URLSearchParams();

    if (filters.product_id) params.append("product_id", filters.product_id);
    if (filters.date_from) params.append("date_from", filters.date_from);
    if (filters.date_to) params.append("date_to", filters.date_to);
    if (filters.search) params.append("search", filters.search);

    if (params.toString()) {
        url += `?${params.toString()}`;
    }

    const res = await fetch(url, {
        method: "GET",
        headers: getHeaders(),
    });

    if (!res.ok) {
        throw new Error("Không thể tải danh sách đơn hàng");
    }

    return await res.json();
}

export async function createSale(product_id, quantity) {
    const res = await fetch(`${API_BASE}/sales`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ product_id, quantity }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Không thể tạo đơn hàng");
    }

    return await res.json();
}
