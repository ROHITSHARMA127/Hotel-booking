const express = require("express");
const db = require("./db");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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









// app.listen(3000, (error)=>{
//     if(error) console.log("Error "+ error);
//     console.log("Server is running on port 3000");
// })

pp.listen(PORT,"0.0.0.0",()=>{
    console.log(`Server is running on port ${PORT}`);
})
