const jwt = require("jsonwebtoken");
const User = require("../models/User");

/*
|--------------------------------------------------------------------------
| protect
|--------------------------------------------------------------------------
|
| Standard JWT bearer-token auth, used by the web app.
|
*/

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Not authorized. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Not authorized. Invalid token.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "Not authorized. User not found.",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      message: "Not authorized. Invalid or expired token.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| protectWithApiKey
|--------------------------------------------------------------------------
|
| Accepts either a JWT (Authorization: Bearer ...) OR a CortexFlow
| API key (X-API-Key: cf_live_...). This is what lets external
| systems trigger workflow runs programmatically — the same
| capability the "API" box in the trigger diagram represents —
| without needing a browser session.
|
*/

const protectWithApiKey = async (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return protect(req, res, next);
  }

  try {
    const user = await User.findOne({ apiKey }).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Not authorized. Invalid API key." });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("API key authentication error:", error.message);

    return res.status(401).json({ message: "Not authorized." });
  }
};

module.exports = {
  protect,
  protectWithApiKey,
};
