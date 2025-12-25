const mysql = require("mysql2/promise");
require("dotenv").config();

const poolConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 20000
};

const db = mysql.createPool(poolConfig);

// Test connection
(async () => {
    try {
        const connection = await db.getConnection();
        console.log("✅ Database connected and pool ready");
        connection.release();
    } catch (error) {
        console.error("❌ Database connection error:", error.message);
    }
})();

module.exports = db;
