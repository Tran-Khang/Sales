// server.js: Backend Node.js with Express, PostgreSQL, Socket.io
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // For Neon.tech
});

const SECRET = process.env.JWT_SECRET || "secret";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // Serve static files (HTML, CSS, JS)

// Auth middleware
const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
        req.user = jwt.verify(token, SECRET);
        next();
    } catch {
        res.status(401).json({ error: "Invalid token" });
    }
};

// Auth routes
app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    try {
        await pool.query(
            "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
            [name, email, hashed]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Registration error" });
    }
});

app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
        email,
    ]);
    if (rows.length && (await bcrypt.compare(password, rows[0].password))) {
        const token = jwt.sign({ id: rows[0].id }, SECRET, { expiresIn: "1h" });
        res.json({ token });
    } else {
        res.status(401).json({ error: "Invalid credentials" });
    }
});

// Products CRUD
app.get("/api/products", auth, async (req, res) => {
    const { rows } = await pool.query("SELECT * FROM products");
    res.json(rows);
});

app.post("/api/products", auth, async (req, res) => {
    const { name, price, stock } = req.body;
    await pool.query(
        "INSERT INTO products (name, price, stock) VALUES ($1, $2, $3)",
        [name, price, stock]
    );
    res.json({ success: true });
});

app.put("/api/products/:id", auth, async (req, res) => {
    const { name, price, stock } = req.body;
    await pool.query(
        "UPDATE products SET name=$1, price=$2, stock=$3 WHERE id=$4",
        [name, price, stock, req.params.id]
    );
    res.json({ success: true });
});

app.delete("/api/products/:id", auth, async (req, res) => {
    await pool.query("DELETE FROM products WHERE id=$1", [req.params.id]);
    res.json({ success: true });
});

// Orders CRUD
app.get("/api/orders", auth, async (req, res) => {
    const { rows } = await pool.query("SELECT * FROM orders");
    res.json(rows);
});

app.post("/api/orders", auth, async (req, res) => {
    const { product_id, quantity, total } = req.body;
    await pool.query(
        "INSERT INTO orders (product_id, quantity, total, date) VALUES ($1, $2, $3, NOW())",
        [product_id, quantity, total]
    );
    io.emit("newOrder", { id: "new" }); // Realtime notify
    res.json({ success: true });
});

app.put("/api/orders/:id", auth, async (req, res) => {
    const { product_id, quantity, total } = req.body;
    await pool.query(
        "UPDATE orders SET product_id=$1, quantity=$2, total=$3 WHERE id=$4",
        [product_id, quantity, total, req.params.id]
    );
    io.emit("newOrder", { id: req.params.id }); // Update notify
    res.json({ success: true });
});

app.delete("/api/orders/:id", auth, async (req, res) => {
    await pool.query("DELETE FROM orders WHERE id=$1", [req.params.id]);
    res.json({ success: true });
});

// Reports
app.get("/api/reports", auth, async (req, res) => {
    const { start, end } = req.query;
    const query = `SELECT p.name as product_name, o.quantity, o.total, o.date 
                   FROM orders o JOIN products p ON o.product_id = p.id 
                   WHERE o.date BETWEEN $1 AND $2`;
    const { rows } = await pool.query(query, [start, end]);
    res.json(rows);
});

// Dashboard stats
app.get("/api/dashboard", auth, async (req, res) => {
    const sales = await pool.query("SELECT SUM(total) as total FROM orders");
    const products = await pool.query("SELECT COUNT(*) as count FROM products");
    const orders = await pool.query("SELECT COUNT(*) as count FROM orders");
    res.json({
        totalSales: sales.rows[0].total || 0,
        totalProducts: products.rows[0].count,
        totalOrders: orders.rows[0].count,
    });
});

// Serve HTML pages (for Vercel, but since static, place in public folder)
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Init DB tables (run once or use migrations)
async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            email VARCHAR(255) UNIQUE,
            password VARCHAR(255)
        );
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            price DECIMAL,
            stock INT
        );
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            product_id INT REFERENCES products(id),
            quantity INT,
            total DECIMAL,
            date TIMESTAMP
        );
    `);
}
initDB();
