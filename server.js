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

// Search hotels...............

app.get("/api/hotels/search", async (req, res) => {
  try {
    const { location } = req.query;

    let query = "SELECT * FROM hotels WHERE 1=1";
    let values = [];

    if (location) {
      query += " AND LOWER(TRIM(location)) LIKE LOWER(?)";
      values.push(`%${location.trim()}%`);
    }

    const [rows] = await db.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found"
      });
    }

    res.json({
      success: true,
      total: rows.length,
      hotels: rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
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




// Room api ...........................................................................................Roomm api


//room list in hotel
app.get("/api/rooms/:hotelId", async (req, res) => {
  const hotelId = req.params.hotelId;

  try {
    const [rows] = await db.query(
      "SELECT * FROM rooms WHERE hotel_id = ?",
      [hotelId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "No rooms found for this hotel"
      });
    }

    res.status(200).json({
      message: "Room list fetched successfully",
      data: rows
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
});



// ROOMS API............


// room details
app.get("/api/room/:id", async (req, res) => {
  const roomId = req.params.id;

  try {
    const [rows] = await db.query(
      "SELECT id, hotel_id, room_type, price, total_rooms, available_rooms, description, image FROM rooms WHERE id = ?",
      [roomId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Room details fetched successfully",
      data: rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
});



// BOOKING API........................................................................................Booking api


// create booking 
app.post("/api/booking/create", async (req, res) => {
  try {
    const { user_id, hotel_id, room_id, check_in, check_out, total_price, guests } = req.body;

    // 1️⃣ Validate required fields
    if (!user_id || !hotel_id || !room_id || !check_in || !check_out || !total_price || !guests) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    // 2️⃣ Validate check-in and check-out dates
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    if (isNaN(checkInDate) || isNaN(checkOutDate) || checkInDate >= checkOutDate) {
      return res.status(400).json({ message: "Invalid check-in or check-out date" });
    }

    // 3️⃣ Check room availability
    const [room] = await db.query("SELECT available_rooms FROM rooms WHERE id = ?", [room_id]);
    if (!room[0]) {
      return res.status(404).json({ message: "Room not found" });
    }
    if (room[0].available_rooms < guests) {
      return res.status(400).json({ message: "Not enough rooms available" });
    }

    // 4️⃣ Insert booking
    const [result] = await db.query(
      "INSERT INTO bookings (user_id, hotel_id, room_id, check_in, check_out, total_price, guests, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [user_id, hotel_id, room_id, check_in, check_out, total_price, guests, "pending"]
    );

    // 5️⃣ Optionally update available_rooms
    await db.query(
      "UPDATE rooms SET available_rooms = available_rooms - ? WHERE id = ?",
      [guests, room_id]
    );

    // 6️⃣ Return response
    return res.status(200).json({
      message: "Booking created successfully",
      booking_id: result.insertId
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error", error });
  }
});


//booking details 
app.get("/api/booking/:id", async (req, res) => {
  try {
    const bookingId = req.params.id;

    const [rows] = await db.query(
      `SELECT 
          bookings.*, 
          users.name AS user_name, 
          hotels.name AS hotel_name, 
          rooms.room_type
       FROM bookings
       JOIN users ON bookings.user_id = users.id
       JOIN hotels ON bookings.hotel_id = hotels.id
       JOIN rooms ON bookings.room_id = rooms.id
       WHERE bookings.id = ?`,
      [bookingId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    return res.status(200).json({ booking: rows[0] });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error", error });
  }
});




//user booking history
app.get("/api/booking/user/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const [rows] = await db.query(
      `SELECT 
          bookings.*, 
          hotels.name AS hotel_name, 
          hotels.location AS city, 
          rooms.room_type
       FROM bookings
       JOIN hotels ON bookings.hotel_id = hotels.id
       JOIN rooms ON bookings.room_id = rooms.id
       WHERE bookings.user_id = ?
       ORDER BY bookings.id DESC`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "No booking history found" });
    }

    return res.status(200).json({
      message: "User booking history fetched successfully",
      data: rows
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error
    });
  }
});



//cancle booking
app.put("/api/booking/cancel/:id", async (req, res) => {
  try {
    const bookingId = req.params.id;

    // Check if the booking exists and its current status
    const [bookingRows] = await db.query(
      "SELECT status FROM bookings WHERE id = ?",
      [bookingId]
    );

    if (bookingRows.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (bookingRows[0].status === "cancelled") {
      return res.status(400).json({ message: "Booking is already cancelled" });
    }

    // Update booking status to cancelled
    const [result] = await db.query(
      "UPDATE bookings SET status = ? WHERE id = ?",
      ["cancelled", bookingId]
    );

    return res.status(200).json({
      message: "Booking cancelled successfully"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});



// Creat order payment api............................................................................Payment api


app.post("/api/payment/create", async (req, res) => {
  const { user_id, booking_id, amount, payment_method } = req.body;

  if (!user_id || !booking_id || !amount || !payment_method) {
    return res.status(400).json({ message: "All fields are required!" });
  }

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
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
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


// Payment fail.....................

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
