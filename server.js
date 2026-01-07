const express = require("express");
const db = require("./db");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const PORT = process.env.PORT || 3005;


app.use(express.json());

//get data

app.get("/api/user",async(request, response)=>{
    const  result =await db.query("SELECT * FROM users")
    response.status(200).json(result);

});


// register api


app.post("/api/user/register", async (request, response) => {
    const name = request.body.name;
    const email = request.body.email;
    const password = request.body.password;  // <-- no hashing
    
    try {
        const [result] = await db.query(
            "INSERT INTO users(name, email, password) VALUES (?, ?, ?)",
            [name, email, password]   // <-- plain password
        );

        response.status(201).json({ 
            id: result.insertId, 
            name: name, 
            email: email 
        });

    } catch (error) {
        console.error("Database INSERT error:", error);
        if (error.errno === 1062) {
             return response.status(409).json({ message: "This email address is already registered." });
        }
        return response.status(500).json({ 
            message: "Server internal error. Could not register user." 
        });
    }
});



// login api 
app.post("/api/user/login", async (request, response) => {
    const email = request.body.email;
    const password = request.body.password;     // plain password
    const secretKey = "ghdfjjgi9ew8865w"; 

    try {
        // get user by email
        const [result] = await db.query(
            "SELECT id, name, email, password FROM users WHERE email = ?",
            [email]
        );

        // if email not found
        if (result.length === 0) {
            return response.status(401).json({ message: "Login failed: Invalid email or password." });
        }

        const user = result[0];

        // plain password compare
        if (password !== user.password) {
            return response.status(401).json({ message: "Login failed: Invalid email or password." });
        }

        // create jwt token
        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email },
            secretKey,
            { expiresIn: "1h" }
        );

        response.status(200).json({
            message: "Login successfully",
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login attempt error:", error);
        return response.status(500).json({
            message: "An internal server error occurred during login."
        });
    }
});






// GET PROFILE
app.get("/api/user/profile/:id", async (request, response) => {
    const id = request.params.id;

    try {
        const [rows] = await db.query(
            "SELECT id, name, email FROM users WHERE id = ?",
            [id]
        );

        if (rows.length === 0) {
            return response.status(404).json({ message: "User not found" });
        }

        response.status(200).json({
            status: "success",
            user: rows[0]
        });

    } catch (error) {
        return response.status(500).json({
            message: "Server error: " + error
        });
    }
});

// UPDATE PROFILE
app.put("/api/user/profile/:id", async (request, response) => {
    const id = request.params.id;
    const { name, email } = request.body;

    try {
        const [result] = await db.query(
            "UPDATE users SET name = ?, email = ? WHERE id = ?",
            [name, email, id]
        );

        if (result.affectedRows === 0) {
            return response.status(404).json({ message: "User not found" });
        }

        response.status(200).json({
            status: "success",
            message: "Profile updated successfully"
        });

    } catch (error) {
        return response.status(500).json({
            message: "Server error: " + error
        });
    }
});



// HOTEL API............

// get all hotel

app.get("/api/hotels", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM hotels");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// get details by id
app.get("/api/hotels/:id", async (req, res) => {
  const hotelId = req.params.id;

  try {
    const [rows] = await db.query(
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

// search hotel


app.get("/api/hotels/search", async (req, res) => {
  const { city, minPrice, maxPrice, rating } = req.query;

  try {
    let query = "SELECT * FROM hotels WHERE 1=1";
    let values = [];

    if (city) {
      query += " AND city = ?";
      values.push(city);
    }

    if (minPrice) {
      query += " AND price >= ?";
      values.push(minPrice);
    }

    if (maxPrice) {
      query += " AND price <= ?";
      values.push(maxPrice);
    }

    if (rating) {
      query += " AND rating >= ?";
      values.push(rating);
    }

    const [rows] = await db.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({
        message: "No hotels found"
      });
    }

    res.status(200).json({
      success: true,
      total: rows.length,
      hotels: rows
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error"
    });
  }
});



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


// ROOMS API............


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


// BOOKING API.............


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


// Creat order payment api.................


app.post("/api/payment/create", async (req, res) => {
  const { user_id, booking_id, amount, payment_method } = req.body;

  try {
    const [result] = await db.query(
      `INSERT INTO payments (user_id, booking_id, amount, payment_method, status)
       VALUES (?, ?, ?, ?, 'PENDING')`,
      [user_id, booking_id, amount, payment_method]
    );

    res.status(201).json({
      message: "Payment order created",
      payment_id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Payment sucessfully








app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
