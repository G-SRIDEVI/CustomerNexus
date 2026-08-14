const Coupon = require("../models/Coupon");

// Seed coupons if none exist
const seedCoupons = async () => {
    try {
        const count = await Coupon.countDocuments();
        if (count === 0) {
            await Coupon.create([
                {
                    code: "SAVE10",
                    discountType: "percentage",
                    discountValue: 10,
                    expirationDate: new Date("2030-12-31"),
                    isActive: true
                },
                {
                    code: "SHOPSENSE50",
                    discountType: "percentage",
                    discountValue: 50,
                    expirationDate: new Date("2030-12-31"),
                    isActive: true
                },
                {
                    code: "WELCOME20",
                    discountType: "fixed",
                    discountValue: 20,
                    expirationDate: new Date("2030-12-31"),
                    isActive: true
                }
            ]);
            console.log("🎟 Seeded initial coupons successfully!");
        }
    } catch (err) {
        console.error("Failed to seed coupons:", err);
    }
};
seedCoupons();

// Validate and get coupon discount
const validateCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ success: false, message: "Coupon code is required" });
        }

        const coupon = await Coupon.findOne({ 
            code: code.toUpperCase(),
            isActive: true,
            expirationDate: { $gt: new Date() }
        });

        if (!coupon) {
            return res.json({ success: false, message: "Invalid or expired coupon code" });
        }

        res.status(200).json({ 
            success: true, 
            message: "Coupon applied successfully", 
            coupon 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    validateCoupon
};
