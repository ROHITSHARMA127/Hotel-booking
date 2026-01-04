const express = require("express");
const db = require("./db");
const app = express();


// create booking 
app.post("/api/booking/create", (request, response) => {
  const { user_id, hotel_id, room_id, check_in, check_out, total_price, guests } = request.body;

  if (!user_id || !hotel_id || !room_id || !check_in || !check_out || !total_price) {
    return response.status(400).json({ message: "All fields are required!" });
  }

  db.query(
    "INSERT INTO bookings (user_id, hotel_id, room_id, check_in, check_out, total_price, guests, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [user_id, hotel_id, room_id, check_in, check_out, total_price, guests, "pending"],
    (error, result) => {
      if (error) {
        return response.status(500).json({ message: "Internal server error: " + error });
      }

      return response.status(200).json({
        message: "Booking created successfully",
        booking_id: result.insertId
      });
    }
  );
});

//booking details 
app.get("/api/booking/:id", (request, response) => {
  const bookingId = request.params.id;

  db.query(
    `SELECT bookings.*, users.name AS user_name, hotels.hotel_name, rooms.room_type 
     FROM bookings
     JOIN users ON bookings.user_id = users.id
     JOIN hotels ON bookings.hotel_id = hotels.id
     JOIN rooms ON bookings.room_id = rooms.id
     WHERE bookings.id = ?`,
    [bookingId],
    (error, result) => {
      if (error) {
        return response.status(500).json({
          message: "Internal server error: " + error
        });
      }

      if (result.length === 0) {
        return response.status(404).json({ message: "Booking not found" });
      }

      return response.status(200).json({
        message: "Booking details fetched successfully",
        data: result[0]
      });
    }
  );
});


//user booking history
app.get("/api/booking/user/:id", (request, response) => {
  const userId = request.params.id;

  db.query(
    `SELECT bookings.*, hotels.hotel_name, hotels.city, rooms.room_type 
     FROM bookings
     JOIN hotels ON bookings.hotel_id = hotels.id
     JOIN rooms ON bookings.room_id = rooms.id
     WHERE bookings.user_id = ?
     ORDER BY bookings.id DESC`,
    [userId],
    (error, result) => {
      if (error) {
        return response.status(500).json({
          message: "Internal Server Error: " + error
        });
      }

      if (result.length === 0) {
        return response.status(404).json({ message: "No booking history found" });
      }

      return response.status(200).json({
        message: "User booking history fetched successfully",
        data: result
      });
    }
  );
});


//cancle booking
app.put("/api/booking/cancel/:id", (request, response) => {
  const bookingId = request.params.id;

  db.query(
    "UPDATE bookings SET status = ? WHERE id = ?",
    ["cancelled", bookingId],
    (error, result) => {
      if (error) {
        return response.status(500).json({
          message: "Internal server error: " + error
        });
      }

      if (result.affectedRows === 0) {
        return response.status(404).json({ message: "Booking not found" });
      }

      return response.status(200).json({
        message: "Booking cancelled successfully"
      });
    }
  );
});

pp.listen(PORT,"0.0.0.0",()=>{
    console.log(`Server is running on port ${PORT}`);
})
