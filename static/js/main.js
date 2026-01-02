// Main JavaScript for SalesPro Manager

document.addEventListener("DOMContentLoaded", function () {
    // Mobile menu toggle
    const mobileMenuButton = document.getElementById("mobile-menu-button");
    const mobileMenu = document.getElementById("mobile-menu");
    const closeMobileMenu = document.getElementById("close-mobile-menu");

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener("click", function () {
            mobileMenu.classList.remove("hidden");
        });
    }

    if (closeMobileMenu && mobileMenu) {
        closeMobileMenu.addEventListener("click", function () {
            mobileMenu.classList.add("hidden");
        });
    }

    // Close mobile menu when clicking outside
    if (mobileMenu) {
        mobileMenu.addEventListener("click", function (e) {
            if (e.target === mobileMenu) {
                mobileMenu.classList.add("hidden");
            }
        });
    }

    // Auto-hide flash messages after 5 seconds
    setTimeout(function () {
        const flashMessages = document.querySelectorAll(
            '[class*="bg-"][class*="text-"][class*="border"]'
        );
        flashMessages.forEach(function (message) {
            message.style.transition = "opacity 0.5s ease";
            message.style.opacity = "0";
            setTimeout(function () {
                message.remove();
            }, 500);
        });
    }, 5000);

    // Initialize Select2 for dropdowns
    $(".select2").select2({
        width: "100%",
        placeholder: "Chọn...",
        allowClear: true,
    });

    // Format currency inputs
    const currencyInputs = document.querySelectorAll("input[data-currency]");
    currencyInputs.forEach(function (input) {
        input.addEventListener("blur", function () {
            const value = parseFloat(this.value.replace(/[^0-9.-]+/g, ""));
            if (!isNaN(value)) {
                this.value = new Intl.NumberFormat("vi-VN").format(value);
            }
        });

        input.addEventListener("focus", function () {
            this.value = this.value.replace(/[^0-9.-]+/g, "");
        });
    });

    // Auto-generate sale items table in new sale form
    const saleItemsContainer = document.getElementById("sale-items");
    if (saleItemsContainer) {
        window.saleItems = [];

        window.addSaleItem = function (productId, productName, price, stock) {
            // Check if product already exists in sale items
            const existingItem = window.saleItems.find(
                (item) => item.product_id === productId
            );

            if (existingItem) {
                // Update quantity
                existingItem.quantity += 1;
                existingItem.total_price =
                    existingItem.quantity * existingItem.unit_price;
                updateSaleItemRow(existingItem);
            } else {
                // Add new item
                const newItem = {
                    product_id: productId,
                    name: productName,
                    quantity: 1,
                    unit_price: price,
                    total_price: price,
                };
                window.saleItems.push(newItem);
                addSaleItemRow(newItem);
            }

            updateSaleTotal();
        };

        function addSaleItemRow(item) {
            const row = document.createElement("tr");
            row.id = `item-${item.product_id}`;
            row.innerHTML = `
                <td class="px-4 py-2">${item.name}</td>
                <td class="px-4 py-2">
                    <input type="number" min="1" value="${item.quantity}" 
                           onchange="updateItemQuantity(${
                               item.product_id
                           }, this.value)"
                           class="w-20 px-2 py-1 border rounded">
                </td>
                <td class="px-4 py-2">
                    <input type="text" value="${new Intl.NumberFormat(
                        "vi-VN"
                    ).format(item.unit_price)}" 
                           onchange="updateItemPrice(${
                               item.product_id
                           }, this.value)"
                           class="w-32 px-2 py-1 border rounded" data-currency>
                </td>
                <td class="px-4 py-2 item-total">${new Intl.NumberFormat(
                    "vi-VN"
                ).format(item.total_price)}</td>
                <td class="px-4 py-2">
                    <button onclick="removeSaleItem(${item.product_id})" 
                            class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            saleItemsContainer.appendChild(row);
        }

        function updateSaleItemRow(item) {
            const row = document.getElementById(`item-${item.product_id}`);
            if (row) {
                row.querySelector('input[type="number"]').value = item.quantity;
                row.querySelector(".item-total").textContent =
                    new Intl.NumberFormat("vi-VN").format(item.total_price);
            }
        }

        window.updateItemQuantity = function (productId, quantity) {
            const item = window.saleItems.find(
                (item) => item.product_id === productId
            );
            if (item) {
                item.quantity = parseInt(quantity) || 1;
                item.total_price = item.quantity * item.unit_price;
                updateSaleItemRow(item);
                updateSaleTotal();
            }
        };

        window.updateItemPrice = function (productId, price) {
            const item = window.saleItems.find(
                (item) => item.product_id === productId
            );
            if (item) {
                item.unit_price =
                    parseFloat(price.replace(/[^0-9.-]+/g, "")) || 0;
                item.total_price = item.quantity * item.unit_price;
                updateSaleItemRow(item);
                updateSaleTotal();
            }
        };

        window.removeSaleItem = function (productId) {
            window.saleItems = window.saleItems.filter(
                (item) => item.product_id !== productId
            );
            const row = document.getElementById(`item-${productId}`);
            if (row) {
                row.remove();
            }
            updateSaleTotal();
        };

        function updateSaleTotal() {
            const total = window.saleItems.reduce(
                (sum, item) => sum + item.total_price,
                0
            );
            const discount = parseFloat(
                document.getElementById("discount")?.value || 0
            );
            const tax = parseFloat(document.getElementById("tax")?.value || 0);

            const finalTotal = total - discount + tax;

            document.getElementById("total-amount").value =
                finalTotal.toFixed(2);
            document.getElementById("display-total").textContent =
                new Intl.NumberFormat("vi-VN").format(finalTotal);

            // Update hidden items input
            document.getElementById("items-input").value = JSON.stringify(
                window.saleItems
            );
        }

        // Initialize event listeners for discount and tax
        const discountInput = document.getElementById("discount");
        const taxInput = document.getElementById("tax");

        if (discountInput) {
            discountInput.addEventListener("input", updateSaleTotal);
        }

        if (taxInput) {
            taxInput.addEventListener("input", updateSaleTotal);
        }
    }

    // Auto-refresh dashboard every 30 seconds
    if (window.location.pathname === "/") {
        setInterval(function () {
            fetch("/api/sales/today")
                .then((response) => response.json())
                .then((data) => {
                    // Update dashboard stats
                    const salesElements = document.querySelectorAll(
                        ".text-2xl.font-semibold.text-gray-900"
                    );
                    if (salesElements.length > 0) {
                        // This is a simplified update - in real implementation,
                        // you'd update the correct element
                    }
                });
        }, 30000);
    }

    // Print functionality for receipts and reports
    window.printReceipt = function () {
        window.print();
    };

    // Export functionality
    window.exportToExcel = function (tableId, filename) {
        const table = document.getElementById(tableId);
        if (!table) return;

        let csv = [];
        const rows = table.querySelectorAll("tr");

        for (let i = 0; i < rows.length; i++) {
            const row = [],
                cols = rows[i].querySelectorAll("td, th");

            for (let j = 0; j < cols.length; j++) {
                // Clean the data
                let data = cols[j].innerText
                    .replace(/(\r\n|\n|\r)/gm, "")
                    .replace(/(\s\s)/gm, " ")
                    .replace(/"/g, '""');

                // Escape quotes
                data = `"${data}"`;
                row.push(data);
            }

            csv.push(row.join(","));
        }

        // Download CSV file
        const csvStr = csv.join("\n");
        const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");

        if (navigator.msSaveBlob) {
            navigator.msSaveBlob(blob, filename);
        } else {
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // Date range picker initialization
    const dateFromInput = document.getElementById("date-from");
    const dateToInput = document.getElementById("date-to");

    if (dateFromInput && dateToInput) {
        dateFromInput.max = new Date().toISOString().split("T")[0];
        dateToInput.max = new Date().toISOString().split("T")[0];

        dateFromInput.addEventListener("change", function () {
            dateToInput.min = this.value;
        });

        dateToInput.addEventListener("change", function () {
            dateFromInput.max = this.value;
        });
    }

    // Initialize tooltips
    const tooltipElements = document.querySelectorAll("[data-tooltip]");
    tooltipElements.forEach(function (element) {
        element.addEventListener("mouseenter", function () {
            const tooltip = document.createElement("div");
            tooltip.className =
                "absolute z-50 px-2 py-1 text-sm text-white bg-gray-900 rounded shadow-lg";
            tooltip.textContent = this.getAttribute("data-tooltip");
            tooltip.style.top = `${this.offsetTop - 30}px`;
            tooltip.style.left = `${this.offsetLeft + this.offsetWidth / 2}px`;
            tooltip.style.transform = "translateX(-50%)";

            document.body.appendChild(tooltip);
            this._tooltip = tooltip;
        });

        element.addEventListener("mouseleave", function () {
            if (this._tooltip) {
                this._tooltip.remove();
                this._tooltip = null;
            }
        });
    });
});
