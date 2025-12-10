const { query } = require("./db");
const { verifyToken } = require("./auth");

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );

    if (req.method === "OPTIONS") return res.status(200).end();

    // FIX: Đảm bảo req.query tồn tại (tránh undefined trên Vercel)
    req.query = req.query || {};

    try {
        verifyToken(req.headers.authorization);
    } catch (error) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    // GET /api/product-detail?id=123
    if (req.method === "GET") {
        try {
            const { id } = req.query;

            if (!id) {
                return res.status(400).json({ error: "Thiếu ID sản phẩm" });
            }

            const productResult = await query(
                "SELECT * FROM products WHERE id = $1",
                [id]
            );

            if (productResult.rows.length === 0) {
                return res
                    .status(404)
                    .json({ error: "Không tìm thấy sản phẩm" });
            }

            const product = productResult.rows[0];

            // Tổng bán
            const stats = await query(
                "SELECT COALESCE(SUM(quantity), 0) AS total_sold, COALESCE(SUM(total), 0) AS total_revenue FROM sales WHERE product_id = $1",
                [id]
            );

            // 10 đơn gần nhất
            const recent = await query(
                "SELECT * FROM sales WHERE product_id = $1 ORDER BY created_at DESC LIMIT 10",
                [id]
            );

            let stockStatus = "OK";
            let stockAlert = null;

            if (product.stock == 0) {
                stockStatus = "OUT_OF_STOCK";
                stockAlert = "⚠️ HẾT HÀNG - Cần nhập thêm ngay!";
            } else if (product.stock < 10) {
                stockStatus = "LOW_STOCK";
                stockAlert = "⚠️ SẮP HẾT - Tồn kho thấp!";
            }

            return res.status(200).json({
                success: true,
                data: {
                    product: {
                        id: product.id,
                        name: product.name,
                        price: parseFloat(product.price),
                        stock: product.stock,
                        created_at: product.created_at,
                    },
                    statistics: {
                        total_sold: Number(stats.rows[0].total_sold),
                        total_revenue: Number(stats.rows[0].total_revenue),
                        stock_status: stockStatus,
                        stock_alert: stockAlert,
                    },
                    recent_sales: recent.rows.map((sale) => ({
                        id: sale.id,
                        quantity: sale.quantity,
                        total: Number(sale.total),
                        created_at: sale.created_at,
                    })),
                },
            });
        } catch (error) {
            console.error("Get product detail error:", error);
            return res.status(500).json({ error: "Lỗi server" });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
};
