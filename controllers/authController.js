const passport = require("passport");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Helper function to sign JWT tokens
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || "YOUR_FALLBACK_SUPER_SECRET_KEY",
    {
      expiresIn: "30d",
    },
  );
};

// @desc    Register a brand new user
// @route   POST /api/auth/register
exports.registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({ username, email, password });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Log in an existing user using Passport Local strategy
// @route   POST /api/auth/login
exports.loginUser = (req, res, next) => {
  // Invoke the configured local passport strategy dynamically
  passport.authenticate("local", { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user)
      return res.status(400).json({ message: info.message || "Login failed" });

    // Login successful, respond with user profile details and their signed access token
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id),
    });
  })(req, res, next);
};
