const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

// Hàm query dùng serverless driver
async function query(text, params = []) {
    try {
        // Thay $1, $2... bằng chuẩn serverless
        const normalized = text.replace(/\$(\d+)/g, (_, i) => `$${i}`);

        const rows = await sql(normalized)(params);

        return { rows, rowCount: rows.length };
    } catch (error) {
        console.error("Neon serverless query error:", error);
        throw error;
    }
}

module.exports = { query };
