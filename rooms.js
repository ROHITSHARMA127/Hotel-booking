const express = require("express");
const db = require("./db");
const app = express();

//room list in hotel
app.get("/api/rooms/:hotelId", (request, response) => {
  const hotelId = request.params.hotelId;

  db.query(
    "SELECT * FROM rooms WHERE hotel_id = ?",
    [hotelId],
    (error, result) => {
      if (error) {
        return response.status(500).json({ message: "Internal Server Error", error });
      }

      if (result.length === 0) {
        return response.status(404).json({ message: "No rooms found for this hotel" });
      }

      response.status(200).json({
        message: "Room list fetched successfully",
        data: result
      });
    }
  );
});


// room details
app.get("/api/room/:id", (request, response) => {
  const roomId = request.params.id;

  db.query(
    "SELECT * FROM rooms WHERE id = ?",
    [roomId],
    (error, result) => {
      if (error) {
        return response.status(500).json({
          message: "Internal Server Error",
          error
        });
      }

      if (result.length === 0) {
        return response.status(404).json({ message: "Room not found" });
      }

      response.status(200).json({
        message: "Room details fetched successfully",
        data: result[0]  // single object
      });
    }
  );
});

