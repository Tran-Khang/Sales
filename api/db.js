const { Pool } = require("pg");

// Tạo connection pool với Neon PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

// Hàm query helper
async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log("Executed query", { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error("Database query error:", error);
        throw error;
    }
}

// Export pool và query function
module.exports = {
    query,
    pool,
};
