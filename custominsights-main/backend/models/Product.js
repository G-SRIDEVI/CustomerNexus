const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
{
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true
    },

    productName: {
        type: String,
        required: true
    },

    name: {
        type: String
    },

    category: {
        type: String,
        required: true
    },

    price: {
        type: Number,
        required: true
    },

    quantity: {
        type: Number,
        required: true
    },

    stock: {
        type: Number
    },

    description: {
        type: String
    },

    image: {
        type: String,
        default: ""
    },

    brand: {
        type: String
    },

    sku: {
        type: String
    },

    weight: {
        type: String
    },

    dimensions: {
        type: String
    },

    discount: {
        type: Number,
        default: 0
    },

    specifications: {
        type: Map,
        of: String,
        default: {}
    },

    rating: {
        type: Number,
        default: 0
    },

    numReviews: {
        type: Number,
        default: 0
    },

    soldQuantity: {
        type: Number,
        default: 0
    },

    minStockLevel: {
        type: Number,
        default: 10
    },

    reorderPoint: {
        type: Number,
        default: 15
    }
},
{
    timestamps: true
});

module.exports = mongoose.model("Product", productSchema);