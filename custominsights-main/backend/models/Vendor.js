const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
{
    shopName: {
        type: String,
        required: true,
        trim: true,
    },

    ownerName: {
        type: String,
        required: true,
        trim: true,
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },

    phone: {
        type: String,
        required: true,
    },

    businessType: {
        type: String,
        required: true,
    },

    password: {
        type: String,
        required: true,
    },
},
{
    timestamps: true,
});

module.exports = mongoose.model("Vendor", vendorSchema);