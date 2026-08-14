const express = require("express");
const router = express.Router();

// Import Controller
const {
    addProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    getProductsByVendor,
    getSimilarProducts,
    addProductReview,
    getProductReviews
} = require("../controllers/productController");

// ==============================
// Product Routes
// ==============================

// Add Product
router.post("/", addProduct);
router.post("/add", addProduct);

// Get All Products
router.get("/", getProducts);

// Get Products by Vendor
router.get("/vendor/:vendorId", getProductsByVendor);

// Get Similar Products
router.get("/:id/similar", getSimilarProducts);

// Product Reviews
router.post("/:id/reviews", addProductReview);
router.get("/:id/reviews", getProductReviews);

// Get Single Product
router.get("/:id", getProductById);

// Update Product
router.put("/:id", updateProduct);

// Delete Product
router.delete("/:id", deleteProduct);

// Export Router
module.exports = router;