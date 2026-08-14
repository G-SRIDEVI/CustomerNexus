const Vendor = require("../models/Vendor");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ==============================
// Register Vendor
// ==============================
const registerVendor = async (req, res) => {
    try {

        const {
            shopName,
            ownerName,
            email,
            phone,
            businessType,
            password
        } = req.body;

        const existingVendor = await Vendor.findOne({ email });

        if (existingVendor) {
            return res.status(400).json({
                success: false,
                message: "Vendor already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const vendor = await Vendor.create({
            shopName,
            ownerName,
            email,
            phone,
            businessType,
            password: hashedPassword
        });

        res.status(201).json({
            success: true,
            message: "Vendor Registered Successfully",
            vendor
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }
};

// ==============================
// Login Vendor
// ==============================
const loginVendor = async (req, res) => {

    try {

        const { email, password } = req.body;

        const vendor = await Vendor.findOne({ email });

        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: "Vendor not found"
            });
        }

        const isMatch = await bcrypt.compare(password, vendor.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid Password"
            });
        }

        const token = jwt.sign(
            {
                id: vendor._id,
                email: vendor.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        res.json({
            success: true,
            token,
            vendor
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ==============================
// Get Vendors
// ==============================
const getVendors = async (req, res) => {

    try {

        const vendors = await Vendor.find().select("-password");

        res.json({ success: true, vendors });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }

};

// ==============================
// Add Vendor (Admin)
// ==============================
const addVendor = async (req, res) => {

    try {

        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const vendor = new Vendor({

            shopName: req.body.shopName,
            ownerName: req.body.ownerName,
            email: req.body.email,
            phone: req.body.phone,
            businessType: req.body.businessType,
            password: hashedPassword

        });

        await vendor.save();

        res.status(201).json({
            success: true,
            message: "Vendor Added Successfully",
            vendor
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

const updateVendor = async (req, res) => {
    try {
        const { shopName, ownerName, businessType, email, phone } = req.body;
        const vendor = await Vendor.findByIdAndUpdate(
            req.params.id,
            { shopName, ownerName, businessType, email, phone },
            { new: true }
        ).select("-password");
        if (!vendor) {
            return res.status(404).json({ success: false, message: "Vendor not found" });
        }
        res.json({ success: true, message: "Vendor updated successfully", vendor });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==============================
// Export
// ==============================
module.exports = {
    registerVendor,
    loginVendor,
    getVendors,
    addVendor,
    updateVendor
};