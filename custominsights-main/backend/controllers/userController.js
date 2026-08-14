// backend/controllers/userController.js

const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Register user
exports.registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
    });

    await user.save();

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Login user
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (user.isBlocked) {
      return res.json({ success: false, message: "Your account has been blocked by the administrator." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    user.lastLogin = new Date();
    await user.save();

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update user profile
exports.updateUser = async (req, res) => {
  try {
    const { username, email, phone, address } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { username, email, phone, address },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Forgot Password (generates token/code)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "User with this email does not exist." });
    }
    
    // Generate a 6 digit code
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiry
    await user.save();
    
    // Return token so the client UI can demonstrate password reset easily without actual email server
    res.json({ 
      success: true, 
      message: "Reset code generated and sent.", 
      token 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.json({ success: false, message: "Password reset token is invalid or has expired." });
    }
    
    // Hash password
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    res.json({ success: true, message: "Password has been reset successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;
    
    const user = await User.findById(id);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }
    
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Incorrect current password" });
    }
    
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    
    res.json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Add Saved Address
exports.addAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { address } = req.body;
    
    const user = await User.findById(id);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }
    
    user.addresses.push(address);
    if (!user.address) {
      user.address = address;
    }
    await user.save();
    
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Remove Saved Address
exports.removeAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { address } = req.body;
    
    const user = await User.findById(id);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }
    
    user.addresses = user.addresses.filter(addr => addr !== address);
    if (user.address === address) {
      user.address = user.addresses[0] || "";
    }
    await user.save();
    
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update Profile Picture
exports.updateProfilePicture = async (req, res) => {
  try {
    const { id } = req.params;
    const { profilePicture } = req.body;
    
    const user = await User.findByIdAndUpdate(id, { profilePicture }, { new: true }).select("-password");
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }
    
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
