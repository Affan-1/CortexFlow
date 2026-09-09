const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    // =========================================================
    // USER PROFILE
    // =========================================================

    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },

    // Profile photo stored as a data URL.
    // This is suitable for the current portfolio project.
    avatar: {
      type: String,
      default: null,
    },

    // =========================================================
    // WORKSPACE
    // =========================================================

    workspaceName: {
      type: String,
      default: "My Workspace",
      trim: true,
      maxlength: 100,
    },

    workspaceUrl: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },

    timezone: {
      type: String,
      default: "(UTC+05:00) Karachi",
      trim: true,
    },

    // =========================================================
    // API KEY
    // =========================================================

    apiKey: {
      type: String,
      default: () =>
        `cf_live_${crypto.randomBytes(20).toString("hex")}`,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// =============================================================
// PASSWORD HASHING
// =============================================================

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(this.password, salt);
});

// =============================================================
// PASSWORD COMPARISON
// =============================================================

userSchema.methods.comparePassword = function comparePassword(
  candidatePassword
) {
  return bcrypt.compare(candidatePassword, this.password);
};

// =============================================================
// API KEY GENERATOR
// =============================================================

userSchema.methods.generateApiKey = function generateApiKey() {
  this.apiKey = `cf_live_${crypto.randomBytes(20).toString("hex")}`;

  return this.apiKey;
};

// =============================================================
// MODEL
// =============================================================

const User = mongoose.model("User", userSchema);

module.exports = User;