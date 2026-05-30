const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const User = require("../models/User");

// 1. LOCAL STRATEGY: Handles initial Username/Email + Password Login authentication
passport.use(
  new LocalStrategy(
    { usernameField: "email" }, // Use email instead of standard username
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          return done(null, false, { message: "Invalid email or password." });
        }

        // Use the matchPassword instance method we created earlier in the User model
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
          return done(null, false, { message: "Invalid email or password." });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

// 2. JWT STRATEGY: Handles locking down your private database routes
const jwtOptions = {
  // Pull the token out of the HTTP Authorization Header: "Bearer <TOKEN>"
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || "YOUR_FALLBACK_SUPER_SECRET_KEY",
};

passport.use(
  new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
    try {
      // Find the user specified in the token's payload ID
      const user = await User.findById(jwtPayload.id);
      if (user) {
        return done(null, user); // User found, inject them into req.user
      }
      return done(null, false);
    } catch (err) {
      return done(err, false);
    }
  }),
);

module.exports = passport;
