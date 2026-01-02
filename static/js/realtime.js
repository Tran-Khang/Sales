// Real-time updates using Socket.IO

document.addEventListener("DOMContentLoaded", function () {
    // Connect to Socket.IO server
    const socket = io();

    // Connection status
    socket.on("connect", function () {
        console.log("Connected to real-time server");
    });

    socket.on("disconnect", function () {
        console.log("Disconnected from real-time server");
    });

    socket.on("connected", function (data) {
        console.log("User connected:", data.username);
    });

    // Handle new sales
    socket.on("sale_update", function (data) {
        console.log("New sale:", data);

        // Show notification
        showNotification(
            "Đơn hàng mới",
            `Đơn hàng ${data.sale_code} đã được tạo`,
            "success"
        );

        // Update dashboard if on dashboard page
        if (window.location.pathname === "/") {
            updateDashboardStats();
        }

        // Update sales list if on sales page
        if (window.location.pathname === "/sales") {
            updateSalesList();
        }
    });

    // Handle inventory updates
    socket.on("stock_update", function (data) {
        console.log("Stock update:", data);

        // Show notification for low stock
        if (data.type === "low_stock") {
            showNotification(
                "Cảnh báo tồn kho",
                `${data.product_name} sắp hết hàng (còn ${data.quantity})`,
                "warning"
            );
        }

        // Update inventory if on inventory page
        if (window.location.pathname === "/inventory") {
            updateInventoryList();
        }

        // Update products if on products page
        if (window.location.pathname === "/products") {
            updateProductsList();
        }
    });

    // Notification function
    function showNotification(title, message, type = "info") {
        // Check if browser supports notifications
        if (!("Notification" in window)) {
            console.log("This browser does not support desktop notification");
            return;
        }

        // Check if permission is granted
        if (Notification.permission === "granted") {
            createNotification(title, message);
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(function (permission) {
                if (permission === "granted") {
                    createNotification(title, message);
                }
            });
        }

        // Also show in-app notification
        showInAppNotification(title, message, type);
    }

    function createNotification(title, message) {
        const notification = new Notification(title, {
            body: message,
            icon: "/static/favicon.ico",
        });

        notification.onclick = function () {
            window.focus();
            notification.close();
        };
    }

    function showInAppNotification(title, message, type) {
        const notificationContainer = document.getElementById(
            "notification-container"
        );

        if (!notificationContainer) {
            // Create notification container
            const container = document.createElement("div");
            container.id = "notification-container";
            container.className = "fixed top-4 right-4 z-50 space-y-2";
            document.body.appendChild(container);
        }

        const notification = document.createElement("div");
        notification.className = `max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden ${
            type === "success"
                ? "border-l-4 border-green-500"
                : type === "warning"
                ? "border-l-4 border-yellow-500"
                : "border-l-4 border-blue-500"
        }`;

        notification.innerHTML = `
            <div class="p-4">
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        ${
                            type === "success"
                                ? '<i class="fas fa-check-circle text-green-400"></i>'
                                : type === "warning"
                                ? '<i class="fas fa-exclamation-triangle text-yellow-400"></i>'
                                : '<i class="fas fa-info-circle text-blue-400"></i>'
                        }
                    </div>
                    <div class="ml-3 w-0 flex-1 pt-0.5">
                        <p class="text-sm font-medium text-gray-900">${title}</p>
                        <p class="mt-1 text-sm text-gray-500">${message}</p>
                    </div>
                    <div class="ml-4 flex-shrink-0 flex">
                        <button class="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none" onclick="this.parentElement.parentElement.parentElement.remove()">
                            <span class="sr-only">Close</span>
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document
            .getElementById("notification-container")
            .appendChild(notification);

        // Auto-remove notification after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // Update functions
    function updateDashboardStats() {
        fetch("/api/sales/today")
            .then((response) => response.json())
            .then((data) => {
                // Update sales stats
                const salesElements = document.querySelectorAll(
                    ".text-2xl.font-semibold.text-gray-900"
                );
                if (salesElements.length > 0) {
                    // This would need to be more specific in a real implementation
                    console.log("Dashboard updated:", data);
                }
            });

        fetch("/api/inventory/low-stock")
            .then((response) => response.json())
            .then((data) => {
                // Update low stock count
                console.log("Low stock items:", data);
            });
    }

    function updateSalesList() {
        // Refresh sales table
        location.reload();
    }

    function updateInventoryList() {
        // Refresh inventory table
        location.reload();
    }

    function updateProductsList() {
        // Refresh products table
        location.reload();
    }

    // Request notification permission on page load
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }

    // Ping server every minute to keep connection alive
    setInterval(() => {
        socket.emit("ping");
    }, 60000);
});
