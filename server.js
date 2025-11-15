const express = require("express");
const db = require("./db");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
//
app.use(express.json());

app.get("/api/user",async(request, response)=>{
    const  result =await db.query("SELECT * FROM users")
    response.status(200).json(result);

});

app.post("/api/user/register", async (request, response) => {
    const name = request.body.name;
    const email = request.body.email;
    const password = request.body.password;
    
    const passwordHash = await bcrypt.hash(password, 10); 
    
    try {
        const [result] = await db.query( "INSERT INTO users(name, email, password) VALUES (? , ?, ?)",[name, email, passwordHash]);

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
// password
app.post("/api/user/login", async (request, response) => {
    const email = request.body.email;
    const password = request.body.password;
    const secretKey = "ghdfjjgi9ew8865w"; 

    try {
        const [result] = await db.query("SELECT name, email, password FROM users WHERE email=?", [email],);
        if (result.length === 0) {
            return response.status(401).json({ message: "Login failed: Invalid email or password." });
        }

        const user = result[0];
        const dbPassword = user.password;
        const isPasswordSame = await bcrypt.compare(password, dbPassword);
        
        if (isPasswordSame) {
            const token = jwt.sign({ name: user.name, email: user.email }, secretKey, { expiresIn: "1h" }); 
            
            response.status(200).json({ 
                message: "Login successfully", 
                token: token
            });
        } else {
            response.status(401).json({ message: "Login failed: Invalid email or password." });
        }

    } catch (error) {
        console.error("Login attempt error:", error);
        return response.status(500).json({ 
            message: "An internal server error occurred during login."
        });
    }
});

app.listen(4003, (error)=>{
    if(error) console.log("Error "+ error);
    console.log("Server is running on port 4003");
})