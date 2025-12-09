const { query } = require("./db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const JWT_SECRET =
    process.env.JWT_SECRET || "your-secret-key-change-in-production";

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

    // POST /api/auth - Login
    if (req.method === "POST") {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res
                    .status(400)
                    .json({ error: "Thiếu username hoặc password" });
            }

            // Tìm user trong database
            const result = await query(
                "SELECT * FROM users WHERE username = $1",
                [username]
            );

            if (result.rows.length === 0) {
                return res
                    .status(401)
                    .json({ error: "Sai tên đăng nhập hoặc mật khẩu" });
            }

            const user = result.rows[0];

            // Verify password
            const isValid = await bcrypt.compare(password, user.password);

            if (!isValid) {
                return res
                    .status(401)
                    .json({ error: "Sai tên đăng nhập hoặc mật khẩu" });
            }

            // Tạo JWT token
            const token = jwt.sign(
                { userId: user.id, username: user.username },
                JWT_SECRET,
                { expiresIn: "7d" }
            );

            return res.status(200).json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                },
            });
        } catch (error) {
            console.error("Login error:", error);
            return res.status(500).json({ error: "Lỗi server" });
        }
    }

    // GET /api/auth - Verify token
    if (req.method === "GET") {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return res.status(401).json({ error: "Token không hợp lệ" });
            }

            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, JWT_SECRET);

            return res.status(200).json({ valid: true, user: decoded });
        } catch (error) {
            return res
                .status(401)
                .json({ error: "Token không hợp lệ hoặc đã hết hạn" });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
};

// Helper function để verify token trong các API khác
function verifyToken(authHeader) {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("Token không hợp lệ");
    }

    const token = authHeader.substring(7);
    return jwt.verify(token, JWT_SECRET);
}

module.exports.verifyToken = verifyToken;
