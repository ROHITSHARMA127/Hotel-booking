const express = require("express");
const pool = require("./db");
const app = express();

//get hotel details

app.get("/api/hotels", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM hotels");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// get details by id
app.get("/api/hotels/:id", async (req, res) => {
  const hotelId = req.params.id;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM hotels WHERE id = ?",
      [hotelId]
    );

    // If no hotel found
    if (rows.length === 0) {
      return res.status(404).json({ message: "Hotel not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});




