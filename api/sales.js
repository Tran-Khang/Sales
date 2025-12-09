const { query } = require("./db");
const { verifyToken } = require("./auth");

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    try {
        verifyToken(req.headers.authorization);
    } catch (error) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    // GET /api/sales - Lấy danh sách đơn hàng (có filter)
    if (req.method === "GET") {
        try {
            const { product_id, date_from, date_to, search } = req.query;

            let sql = `
        SELECT 
          s.id, 
          s.product_id, 
          s.quantity, 
          s.total, 
          s.created_at,
          p.name as product_name,
          p.price as product_price
        FROM sales s
        LEFT JOIN products p ON s.product_id = p.id
        WHERE 1=1
      `;
            let params = [];
            let paramCount = 1;

            // Filter theo product_id
            if (product_id) {
                sql += ` AND s.product_id = $${paramCount}`;
                params.push(product_id);
                paramCount++;
            }

            // Filter theo date range
            if (date_from) {
                sql += ` AND s.created_at >= $${paramCount}`;
                params.push(date_from);
                paramCount++;
            }

            if (date_to) {
                sql += ` AND s.created_at <= $${paramCount}`;
                params.push(date_to + " 23:59:59");
                paramCount++;
            }

            // Search theo tên sản phẩm
            if (search) {
                sql += ` AND p.name ILIKE $${paramCount}`;
                params.push(`%${search}%`);
                paramCount++;
            }

            sql += " ORDER BY s.created_at DESC";

            const result = await query(sql, params);

            return res.status(200).json({
                success: true,
                sales: result.rows.map((sale) => ({
                    id: sale.id,
                    product_id: sale.product_id,
                    product_name: sale.product_name,
                    product_price: parseFloat(sale.product_price),
                    quantity: sale.quantity,
                    total: parseFloat(sale.total),
                    created_at: sale.created_at,
                })),
            });
        } catch (error) {
            console.error("Get sales error:", error);
            return res.status(500).json({ error: "Lỗi server" });
        }
    }

    // POST /api/sales - Tạo đơn hàng mới
    if (req.method === "POST") {
        try {
            const { product_id, quantity } = req.body;

            if (!product_id || !quantity || quantity <= 0) {
                return res
                    .status(400)
                    .json({ error: "Thiếu thông tin đơn hàng" });
            }

            // Lấy thông tin sản phẩm
            const productResult = await query(
                "SELECT * FROM products WHERE id = $1",
                [product_id]
            );

            if (productResult.rows.length === 0) {
                return res
                    .status(404)
                    .json({ error: "Không tìm thấy sản phẩm" });
            }

            const product = productResult.rows[0];

            // Kiểm tra tồn kho
            if (product.stock < quantity) {
                return res.status(400).json({
                    error: `Không đủ hàng! Chỉ còn ${product.stock} sản phẩm trong kho`,
                });
            }

            // Tính tổng tiền
            const total = product.price * quantity;

            // Bắt đầu transaction
            await query("BEGIN");

            try {
                // Tạo đơn hàng
                const saleResult = await query(
                    "INSERT INTO sales (product_id, quantity, total) VALUES ($1, $2, $3) RETURNING *",
                    [product_id, quantity, total]
                );

                // Trừ tồn kho
                await query(
                    "UPDATE products SET stock = stock - $1 WHERE id = $2",
                    [quantity, product_id]
                );

                // Commit transaction
                await query("COMMIT");

                return res.status(201).json({
                    success: true,
                    sale: {
                        id: saleResult.rows[0].id,
                        product_id: saleResult.rows[0].product_id,
                        quantity: saleResult.rows[0].quantity,
                        total: parseFloat(saleResult.rows[0].total),
                        created_at: saleResult.rows[0].created_at,
                        product_name: product.name,
                        remaining_stock: product.stock - quantity,
                    },
                });
            } catch (error) {
                // Rollback nếu có lỗi
                await query("ROLLBACK");
                throw error;
            }
        } catch (error) {
            console.error("Create sale error:", error);
            return res.status(500).json({ error: "Lỗi server" });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
};
