// backend/routes/userRoutes.js

const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserById,
  updateUser,
  forgotPassword,
  resetPassword,
  changePassword,
  addAddress,
  removeAddress,
  updateProfilePicture,
} = require("../controllers/userController");

// Register new user
router.post("/register", registerUser);

// Login user
router.post("/login", loginUser);

// Password recovery
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Get user by ID
router.get("/:id", getUserById);

// Update user profile
router.put("/:id", updateUser);

// Change password
router.put("/:id/password", changePassword);

// Addresses
router.post("/:id/address", addAddress);
router.post("/:id/address/remove", removeAddress);

// Profile picture
router.put("/:id/avatar", updateProfilePicture);

module.exports = router;
