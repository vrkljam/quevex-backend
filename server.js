const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const passport = require("passport");

// Future route imports will go here
// const boardRoutes = require("./routes/boardRoutes");
const boardRoutes = require("./routes/boardRoutes");
const listRoutes = require("./routes/listRoutes");
const cardRoutes = require("./routes/cardRoutes");

const app = express();
const PORT = process.env.PORT || 5500;

// ==========================================
// 1. MIDDLEWARE
// ==========================================
// CORS configuration to allow cross-device network requests
app.use(
  cors({
    origin: "*", // We will restrict this to your frontend URL later during deployment
    credentials: true,
  }),
);

// Built-in body parser to read incoming JSON data payload requests
app.use(express.json());
app.use(passport.initialize());
require("./config/passport");

// ==========================================
// 2. MONGOOSE DATABASE CONNECTION
// ==========================================
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("🚀 MongoDB Connected Flawlessly"))
  .catch((err) => console.error("❌ Database Connection Error:", err));

// ==========================================
// 3. BASE SANITY TEST ROUTE
// ==========================================
app.get("/", (req, res) => {
  res.json({ message: "Quevex API is alive and kicking!" });
});

// ==========================================
// 4. API ROUTE ROUTERS (To be linked soon)
// ==========================================
// app.use("/api/boards", boardRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/lists", listRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/auth", require("./routes/authRoutes"));

const protectRoute = passport.authenticate("jwt", { session: false });

// 4. Mount and protect your existing canvas API endpoints!
// Any request targeting these endpoints must now carry a valid token
app.use("/api/boards", protectRoute, require("./routes/boardRoutes"));
app.use("/api/lists", protectRoute, require("./routes/listRoutes"));
app.use("/api/cards", protectRoute, require("./routes/cardRoutes"));

// ==========================================
// 5. SERVER INITIALIZATION
// ==========================================
// Listening on 0.0.0.0 enables access from devices on your local network (like your phone!)
app.listen(PORT, () => {
  console.log(`Server sprinting forward on port ${PORT}`);
});
