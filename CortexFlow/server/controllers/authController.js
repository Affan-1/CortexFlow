const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Workflow = require("../models/Workflow");
const Execution = require("../models/Execution");
const Integration = require("../models/Integration");

// =============================================================
// GENERATE JWT
// =============================================================

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

// =============================================================
// FORMAT USER RESPONSE
// =============================================================

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar || null,
  workspaceName: user.workspaceName || "My Workspace",
  workspaceUrl: user.workspaceUrl || "",
  timezone: user.timezone || "(UTC+05:00) Karachi",
});

// =============================================================
// REGISTER
// POST /api/auth/register
// =============================================================

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are all required.",
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        message: "Name must contain at least 2 characters.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      message: "Account created successfully.",
      token,
      user: formatUser(user),
    });
  } catch (error) {
    console.error("Register error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    return res.status(500).json({
      message: "Something went wrong. Please try again.",
    });
  }
};

// =============================================================
// LOGIN
// POST /api/auth/login
// =============================================================

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const isPasswordCorrect =
      await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: formatUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Something went wrong. Please try again.",
    });
  }
};

// =============================================================
// GET CURRENT USER
// GET /api/auth/me
// =============================================================

const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      user: formatUser(req.user),
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      message: "Unable to retrieve user information.",
    });
  }
};

// =============================================================
// UPDATE PROFILE
// PUT /api/auth/profile
// =============================================================

const updateProfile = async (req, res) => {
  try {
    const { name, email, avatar } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        message: "Name and email are required.",
      });
    }

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2) {
      return res.status(400).json({
        message: "Name must contain at least 2 characters.",
      });
    }

    if (trimmedName.length > 100) {
      return res.status(400).json({
        message: "Name cannot exceed 100 characters.",
      });
    }

    const emailOwner = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: req.user._id },
    });

    if (emailOwner) {
      return res.status(409).json({
        message: "This email is already in use.",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    user.name = trimmedName;
    user.email = normalizedEmail;

    if (typeof avatar === "string") {
      user.avatar = avatar || null;
    }

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: formatUser(user),
    });
  } catch (error) {
    console.error("Update profile error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "This email is already in use.",
      });
    }

    return res.status(500).json({
      message: "Unable to update profile.",
    });
  }
};

// =============================================================
// UPDATE WORKSPACE
// PUT /api/auth/workspace
// =============================================================

const updateWorkspace = async (req, res) => {
  try {
    const {
      workspaceName,
      workspaceUrl,
      timezone,
    } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    if (workspaceName !== undefined) {
      const trimmedWorkspaceName =
        workspaceName.trim();

      if (!trimmedWorkspaceName) {
        return res.status(400).json({
          message: "Workspace name cannot be empty.",
        });
      }

      if (trimmedWorkspaceName.length > 100) {
        return res.status(400).json({
          message:
            "Workspace name cannot exceed 100 characters.",
        });
      }

      user.workspaceName = trimmedWorkspaceName;
    }

    if (workspaceUrl !== undefined) {
      user.workspaceUrl = workspaceUrl.trim();
    }

    if (timezone !== undefined) {
      user.timezone = timezone.trim();
    }

    await user.save();

    return res.status(200).json({
      message: "Workspace updated successfully.",
      user: formatUser(user),
    });
  } catch (error) {
    console.error("Update workspace error:", error);

    return res.status(500).json({
      message: "Unable to update workspace.",
    });
  }
};

// =============================================================
// DELETE WORKSPACE
// DELETE /api/auth/workspace
// =============================================================

const deleteWorkspace = async (req, res) => {
  try {
    const userId = req.user._id;

    // Delete all workspace data belonging to this user.
    await Promise.all([
      Workflow.deleteMany({ owner: userId }),
      Execution.deleteMany({ owner: userId }),
      Integration.deleteMany({ owner: userId }),
    ]);

    // Finally delete the user account itself.
    await User.findByIdAndDelete(userId);

    return res.status(200).json({
      message:
        "Workspace and all associated data deleted successfully.",
    });
  } catch (error) {
    console.error("Delete workspace error:", error);

    return res.status(500).json({
      message: "Unable to delete workspace.",
    });
  }
};

// =============================================================
// GET API KEY
// GET /api/auth/api-key
// =============================================================

const getApiKey = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "+apiKey"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      apiKey: user.apiKey,
    });
  } catch (error) {
    console.error("Get API key error:", error);

    return res.status(500).json({
      message: "Unable to retrieve API key.",
    });
  }
};

// =============================================================
// REGENERATE API KEY
// POST /api/auth/api-key/regenerate
// =============================================================

const regenerateApiKey = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "+apiKey"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const apiKey = user.generateApiKey();

    await user.save();

    return res.status(200).json({
      message:
        "API key regenerated. Update any integrations using the old key.",
      apiKey,
    });
  } catch (error) {
    console.error("Regenerate API key error:", error);

    return res.status(500).json({
      message: "Unable to regenerate API key.",
    });
  }
};

// =============================================================
// EXPORTS
// =============================================================

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  updateWorkspace,
  deleteWorkspace,
  getApiKey,
  regenerateApiKey,
};