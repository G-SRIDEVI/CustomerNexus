const express = require("express");
const router = express.Router();

const User = require("../models/User");

// User Login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.json({
                success: false,
                message: "User not found"
            });
        }

        if (user.password !== password) {
            return res.json({
                success: false,
                message: "Invalid password"
            });
        }

        res.json({
            success: true,
            message: "Login successful",
            role: user.role,
            user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Admin Login
router.post("/admin/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await User.findOne({
            email,
            role: "admin"
        });

        if (!admin) {
            return res.json({
                success: false,
                message: "Admin not found"
            });
        }

        if (admin.password !== password) {
            return res.json({
                success: false,
                message: "Invalid password"
            });
        }

        res.json({
            success: true,
            message: "Admin Login Successful",
            role: admin.role,
            admin
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;