const express = require("express");
const db = require("./db");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const PORT = process.env.PORT || 3005;


app.use(express.json());


/// User api ...............................................................................................User api
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



// HOTEL API...............................................................................................Hotel api

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
  try {
    const { location, minPrice, maxPrice, rating } = req.query;

    let query = "SELECT * FROM hotels WHERE 1=1";
    let values = [];

    if (location) {
      query += " AND LOWER(location) LIKE LOWER(?)";
      values.push(`%${location.trim()}%`);
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

// Room api ...........................................................................................Roomm api


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
app.get("/api/room/:id", (req, res) => {
  const roomId = req.params.id;

  db.query(
    "SELECT id, hotel_id, room_type, price, available_rooms, description, image FROM rooms WHERE id = ?",
    [roomId],
    (error, rows) => {
      if (error) {
        return res.status(500).json({
          message: "Internal Server Error",
          error: error.message
        });
      }

      if (rows.length === 0) {
        return res.status(404).json({
          message: "Room not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Room details fetched successfully",
        data: rows[0]
      });
    }
  );
});



// BOOKING API........................................................................................Booking api


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


// Creat order payment api............................................................................Payment api


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

app.put("/api/payment/success/:payment_id", async (req, res) => {
  const paymentId = req.params.payment_id;

  try {
    // Update payment status
    await db.query(
      "UPDATE payments SET status = 'SUCCESS' WHERE id = ?",
      [paymentId]
    );

    // Get booking id from payment
    const [[payment]] = await db.query(
      "SELECT booking_id FROM payments WHERE id = ?",
      [paymentId]
    );

    // Confirm booking
    await db.query(
      "UPDATE bookings SET status = 'confirmed' WHERE id = ?",
      [payment.booking_id]
    );

    res.json({
      message: "Payment successful & booking confirmed"
    });
  } catch (error) {
    res.status(500).json({
      message: "Payment success handling failed",
      error: error.message
    });
  }
});


// Payment fail............

app.put("/api/payment/fail/:payment_id", async (req, res) => {
  const paymentId = req.params.payment_id;

  try {
    await db.query(
      "UPDATE payments SET status = 'FAILED' WHERE id = ?",
      [paymentId]
    );

    res.json({
      message: "Payment failed"
    });
  } catch (error) {
    res.status(500).json({
      message: "Payment failed update error",
      error: error.message
    });
  }
});

// Rating api...........................................................................................Rating api



// add rating...........

app.post("/api/rating/create", async (req, res) => {
  const { user_id, hotel_id, rating, review } = req.body;

  if (!user_id || !hotel_id || !rating) {
    return res.status(400).json({ message: "user_id, hotel_id and rating are required" });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5" });
  }

  try {
    // Ek user ek hotel ko ek hi baar rate kare (optional but best)
    const [exist] = await db.query(
      "SELECT * FROM ratings WHERE user_id = ? AND hotel_id = ?",
      [user_id, hotel_id]
    );

    if (exist.length > 0) {
      return res.status(400).json({ message: "You already rated this hotel" });
    }

    const [result] = await db.query(
      `INSERT INTO ratings (user_id, hotel_id, rating, review)
       VALUES (?, ?, ?, ?)`,
      [user_id, hotel_id, rating, review]
    );

    res.status(201).json({
      message: "Rating added successfully",
      rating_id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// get rating by hotel


app.get("/api/rating/hotel/:hotel_id", async (req, res) => {
  const hotelId = req.params.hotel_id;

  try {
    // All ratings
    const [ratings] = await db.query(
      "SELECT * FROM ratings WHERE hotel_id = ?",
      [hotelId]
    );

    // Average rating
    const [[avg]] = await db.query(
      "SELECT AVG(rating) as average_rating, COUNT(*) as total_reviews FROM ratings WHERE hotel_id = ?",
      [hotelId]
    );

    res.json({
      hotel_id: hotelId,
      average_rating: avg.average_rating ? Number(avg.average_rating).toFixed(1) : "0.0",
      total_reviews: avg.total_reviews,
      ratings: ratings
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


//get rating by user

app.get("/api/rating/user/:user_id", async (req, res) => {
  const userId = req.params.user_id;

  try {
    const [rows] = await db.query(
      "SELECT * FROM ratings WHERE user_id = ?",
      [userId]
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// update rating

app.put("/api/rating/update/:id", async (req, res) => {
  const ratingId = req.params.id;
  const { rating, review } = req.body;

  if (rating && (rating < 1 || rating > 5)) {
    return res.status(400).json({ message: "Rating must be between 1 and 5" });
  }

  try {
    await db.query(
      "UPDATE ratings SET rating = ?, review = ? WHERE id = ?",
      [rating, review, ratingId]
    );

    res.json({ message: "Rating updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
