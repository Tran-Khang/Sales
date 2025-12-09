const { query } = require("./db");
const { verifyToken } = require("./auth");

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    try {
        // Verify authentication
        verifyToken(req.headers.authorization);
    } catch (error) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    // GET /api/products - Lấy danh sách sản phẩm (có hỗ trợ search)
    if (req.method === "GET") {
        try {
            const { search } = req.query;

            let sql = "SELECT * FROM products";
            let params = [];

            // Nếu có search keyword, thêm điều kiện tìm kiếm
            if (search) {
                sql += " WHERE name ILIKE $1";
                params.push(`%${search}%`);
            }

            sql += " ORDER BY created_at DESC";

            const result = await query(sql, params);

            return res.status(200).json({
                success: true,
                products: result.rows,
            });
        } catch (error) {
            console.error("Get products error:", error);
            return res.status(500).json({ error: "Lỗi server" });
        }
    }

    // POST /api/products - Tạo sản phẩm mới
    if (req.method === "POST") {
        try {
            const { name, price, stock } = req.body;

            if (!name || !price || stock === undefined) {
                return res
                    .status(400)
                    .json({ error: "Thiếu thông tin sản phẩm" });
            }

            const result = await query(
                "INSERT INTO products (name, price, stock) VALUES ($1, $2, $3) RETURNING *",
                [name, price, stock]
            );

            return res.status(201).json({
                success: true,
                product: result.rows[0],
            });
        } catch (error) {
            console.error("Create product error:", error);
            return res.status(500).json({ error: "Lỗi server" });
        }
    }

    // PUT /api/products - Cập nhật sản phẩm
    if (req.method === "PUT") {
        try {
            const { id, name, price, stock } = req.body;

            if (!id || !name || !price || stock === undefined) {
                return res
                    .status(400)
                    .json({ error: "Thiếu thông tin cập nhật" });
            }

            const result = await query(
                "UPDATE products SET name = $1, price = $2, stock = $3 WHERE id = $4 RETURNING *",
                [name, price, stock, id]
            );

            if (result.rows.length === 0) {
                return res
                    .status(404)
                    .json({ error: "Không tìm thấy sản phẩm" });
            }

            return res.status(200).json({
                success: true,
                product: result.rows[0],
            });
        } catch (error) {
            console.error("Update product error:", error);
            return res.status(500).json({ error: "Lỗi server" });
        }
    }

    // DELETE /api/products - Xóa sản phẩm
    if (req.method === "DELETE") {
        try {
            const { id } = req.query;

            if (!id) {
                return res.status(400).json({ error: "Thiếu ID sản phẩm" });
            }

            const result = await query(
                "DELETE FROM products WHERE id = $1 RETURNING *",
                [id]
            );

            if (result.rows.length === 0) {
                return res
                    .status(404)
                    .json({ error: "Không tìm thấy sản phẩm" });
            }

            return res.status(200).json({
                success: true,
                message: "Xóa sản phẩm thành công",
            });
        } catch (error) {
            console.error("Delete product error:", error);
            return res.status(500).json({ error: "Lỗi server" });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
};
