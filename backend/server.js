const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// MySQL connection configuration
const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "appuser",
    password: process.env.DB_PASSWORD || "appuser",
    database: process.env.DB_NAME || "welcome_app",
    port: Number(process.env.DB_PORT || 3306)
};

let pool;

async function startServer() {
    pool = mysql.createPool({
        ...dbConfig,
        waitForConnections: true,
        connectionLimit: 10
    });

    // Verify database connectivity before starting
    await pool.query("SELECT 1");
    console.log("Connected to MySQL successfully");

    app.get("/api/health", async (req, res) => {
        try {
            await pool.query("SELECT 1");
            res.json({ status: "OK", database: "connected" });
        } catch (error) {
            res.status(503).json({ error: "Database unavailable" });
        }
    });

    // Save the user and fetch the saved record
    app.post("/api/users", async (req, res) => {
        try {
            const { username, place } = req.body;

            if (
                typeof username !== "string" ||
                typeof place !== "string" ||
                !username.trim() ||
                !place.trim() ||
                username.trim().length > 100 ||
                place.trim().length > 100
            ) {
                return res.status(400).json({
                    error: "Enter a valid username and place (maximum 100 characters)."
                });
            }

            // Insert data into MySQL
            const [result] = await pool.execute(
                "INSERT INTO users (username, place) VALUES (?, ?)",
                [username.trim(), place.trim()]
            );

            // Fetch the actual saved record from MySQL
            const [rows] = await pool.execute(
                "SELECT id, username, place FROM users WHERE id = ?",
                [result.insertId]
            );

            const user = rows[0];

            res.status(201).json({
                message: `Welcome ${user.username}! You are from ${user.place}.`,
                user
            });

        } catch (error) {
            console.error("Request failed:", error.message);
            res.status(500).json({
                error: "Unable to save your details. Please try again."
            });
        }
    });

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Backend running on port ${PORT}`);
    });
}

startServer().catch((error) => {
    console.error("Failed to start backend:", error.message);
    process.exit(1);
});