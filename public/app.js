// app.js: Frontend JavaScript for API calls, auth, CRUD, realtime
const API_URL = "/api"; // Assuming backend serves at same domain
const socket = io(); // Socket.io for realtime

// Auth functions
function login(email, password) {
    fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    })
        .then((res) => res.json())
        .then((data) => {
            if (data.token) {
                localStorage.setItem("token", data.token);
                window.location.href = "dashboard.html";
            } else {
                alert("Login failed");
            }
        });
}

function register(name, email, password) {
    fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
    })
        .then((res) => res.json())
        .then((data) => {
            if (data.success) {
                window.location.href = "index.html";
            } else {
                alert("Registration failed");
            }
        });
}

function logout() {
    localStorage.removeItem("token");
    window.location.href = "index.html";
}

// Check auth on protected pages
function checkAuth() {
    if (!localStorage.getItem("token")) {
        window.location.href = "index.html";
    }
}

// CRUD for Products
function loadProducts() {
    fetch(`${API_URL}/products`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
        .then((res) => res.json())
        .then((products) => {
            const tbody = document.querySelector("#productsTable tbody");
            tbody.innerHTML = "";
            products.forEach((p) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                <td>${p.id}</td>
                <td>${p.name}</td>
                <td>${p.price}</td>
                <td>${p.stock}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editProduct(${p.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})">Delete</button>
                </td>
            `;
                tbody.appendChild(tr);
            });
        });
}

function addOrUpdateProduct() {
    const id = document.getElementById("productId").value;
    const name = document.getElementById("productName").value;
    const price = document.getElementById("productPrice").value;
    const stock = document.getElementById("productStock").value;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_URL}/products/${id}` : `${API_URL}/products`;
    fetch(url, {
        method,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ name, price, stock }),
    }).then(() => {
        loadProducts();
        bootstrap.Modal.getInstance(
            document.getElementById("addProductModal")
        ).hide();
    });
}

function editProduct(id) {
    fetch(`${API_URL}/products/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
        .then((res) => res.json())
        .then((p) => {
            document.getElementById("productId").value = p.id;
            document.getElementById("productName").value = p.name;
            document.getElementById("productPrice").value = p.price;
            document.getElementById("productStock").value = p.stock;
            document.querySelector(
                "#addProductModal .modal-title"
            ).textContent = "Edit Product";
            new bootstrap.Modal(
                document.getElementById("addProductModal")
            ).show();
        });
}

function deleteProduct(id) {
    if (confirm("Are you sure?")) {
        fetch(`${API_URL}/products/${id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        }).then(() => loadProducts());
    }
}

// Similar functions for Orders (loadOrders, addOrUpdateOrder, editOrder, deleteOrder)

// Reports
function generateReport() {
    const start = document.getElementById("startDate").value;
    const end = document.getElementById("endDate").value;
    fetch(`${API_URL}/reports?start=${start}&end=${end}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
        .then((res) => res.json())
        .then((reports) => {
            const tbody = document.querySelector("#reportsTable tbody");
            tbody.innerHTML = "";
            reports.forEach((r) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                <td>${r.product_name}</td>
                <td>${r.quantity}</td>
                <td>${r.total}</td>
                <td>${r.date}</td>
            `;
                tbody.appendChild(tr);
            });
        });
}

// Dashboard stats
function loadDashboard() {
    fetch(`${API_URL}/dashboard`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
        .then((res) => res.json())
        .then((data) => {
            document.getElementById("totalSales").textContent = data.totalSales;
            document.getElementById("totalProducts").textContent =
                data.totalProducts;
            document.getElementById("totalOrders").textContent =
                data.totalOrders;
        });
}

// Realtime updates
socket.on("newOrder", (order) => {
    document.getElementById(
        "realtimeUpdates"
    ).textContent = `New order: ${order.id}`;
    document.getElementById("realtimeUpdates").style.display = "block";
    // Refresh relevant data
    if (window.location.pathname.includes("dashboard")) loadDashboard();
    if (window.location.pathname.includes("orders")) loadOrders();
    if (window.location.pathname.includes("reports")) generateReport();
});

// Event listeners
if (document.getElementById("loginForm")) {
    document.getElementById("loginForm").addEventListener("submit", (e) => {
        e.preventDefault();
        login(
            document.getElementById("email").value,
            document.getElementById("password").value
        );
    });
}

if (document.getElementById("registerForm")) {
    document.getElementById("registerForm").addEventListener("submit", (e) => {
        e.preventDefault();
        register(
            document.getElementById("name").value,
            document.getElementById("email").value,
            document.getElementById("password").value
        );
    });
}

document
    .querySelectorAll("#logout")
    .forEach((el) => el.addEventListener("click", logout));

if (window.location.pathname.includes("dashboard")) {
    checkAuth();
    loadDashboard();
}

if (window.location.pathname.includes("products")) {
    checkAuth();
    loadProducts();
    document.getElementById("productForm").addEventListener("submit", (e) => {
        e.preventDefault();
        addOrUpdateProduct();
    });
}

// Similar for orders and reports

// For add modal reset
document
    .getElementById("addProductModal")
    .addEventListener("hidden.bs.modal", () => {
        document.getElementById("productForm").reset();
        document.getElementById("productId").value = "";
        document.querySelector("#addProductModal .modal-title").textContent =
            "Add Product";
    });

// Repeat for order modal
