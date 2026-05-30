const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  // 1. Check if the request header contains a Bearer token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extract token from the "Bearer <TOKEN>" string
      token = req.headers.authorization.split(" ")[1];

      // 2. Decode and verify the token signature
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "YOUR_FALLBACK_SUPER_SECRET_KEY",
      );

      // 3. Find the user in the database and attach them to the request object
      // This gives your controllers access to req.user._id (a real MongoDB ObjectId!)
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res
          .status(401)
          .json({ message: "Not authorized, user not found" });
      }

      return next(); // Move on to the controller safely
    } catch (error) {
      console.error("JWT Verification Error:", error.message);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  // If no token is provided at all
  if (!token) {
    return res
      .status(401)
      .json({ message: "Not authorized, no token provided" });
  }
};

module.exports = { protect };
