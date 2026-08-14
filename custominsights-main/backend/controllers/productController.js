const Product = require("../models/Product");
const Review = require("../models/Review");

// ======================================
// Add Product
// ======================================

const addProduct = async (req, res) => {

    try {

        const {
            vendorId,
            productName,
            category,
            price,
            quantity,
            description,
            image,
            brand,
            sku,
            weight,
            dimensions,
            discount,
            specifications
        } = req.body;

        const product = await Product.create({
            vendorId,
            productName,
            category,
            price,
            quantity,
            description,
            image,
            brand,
            sku,
            weight,
            dimensions,
            discount: discount || 0,
            specifications: specifications || {}
        });

        res.status(201).json({

            success: true,
            message: "Product Added Successfully",
            product

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,
            message: error.message

        });

    }

};

// ======================================
// Get All Products (With Filter, Search, Sort)
// ======================================

const getProducts = async (req, res) => {
    try {
        const {
            search,
            category,
            brand,
            priceMin,
            priceMax,
            rating,
            discount,
            availability,
            sort
        } = req.query;

        let query = {};

        // Search by name or description
        if (search) {
            query.$or = [
                { productName: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } }
            ];
        }

        // Category filter
        if (category && category !== "All" && category !== "") {
            query.category = category;
        }

        // Brand filter
        if (brand && brand !== "") {
            query.brand = { $regex: brand, $options: "i" };
        }

        // Price range filter
        if (priceMin || priceMax) {
            query.price = {};
            if (priceMin) query.price.$gte = Number(priceMin);
            if (priceMax) query.price.$lte = Number(priceMax);
        }

        // Rating filter
        if (rating) {
            query.rating = { $gte: Number(rating) };
        }

        // Discount filter
        if (discount) {
            query.discount = { $gte: Number(discount) };
        }

        // Availability filter
        if (availability === "in_stock") {
            query.quantity = { $gt: 0 };
        } else if (availability === "out_of_stock") {
            query.quantity = { $eq: 0 };
        }

        let findQuery = Product.find(query).populate("vendorId", "shopName ownerName");

        // Sorting
        if (sort) {
            if (sort === "price_asc") {
                findQuery = findQuery.sort({ price: 1 });
            } else if (sort === "price_desc") {
                findQuery = findQuery.sort({ price: -1 });
            } else if (sort === "newest") {
                findQuery = findQuery.sort({ createdAt: -1 });
            } else if (sort === "highest_rated") {
                findQuery = findQuery.sort({ rating: -1 });
            } else if (sort === "best_selling") {
                findQuery = findQuery.sort({ numReviews: -1 }); // proxy for best selling
            }
        } else {
            findQuery = findQuery.sort({ createdAt: -1 }); // Default newest
        }

        const products = await findQuery;
        res.status(200).json({ success: true, products });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ======================================
// Get Single Product
// ======================================

const getProductById = async (req, res) => {

    try {

        const product = await Product.findById(req.params.id)
            .populate("vendorId", "shopName ownerName");

        if (!product) {

            return res.status(404).json({

                success: false,
                message: "Product not found"

            });

        }

        res.status(200).json({
            ...product.toObject(),
            name: product.productName,
            success: true,
            product
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,
            message: error.message

        });

    }

};

// ======================================
// Update Product
// ======================================

const updateProduct = async (req, res) => {

    try {

        const product = await Product.findByIdAndUpdate(

            req.params.id,

            req.body,

            {

                new: true,
                runValidators: true

            }

        );

        if (!product) {

            return res.status(404).json({

                success: false,
                message: "Product not found"

            });

        }

        res.status(200).json({

            success: true,
            message: "Product Updated Successfully",
            product

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,
            message: error.message

        });

    }

};

// ======================================
// Delete Product
// ======================================

const deleteProduct = async (req, res) => {

    try {

        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {

            return res.status(404).json({

                success: false,
                message: "Product not found"

            });

        }

        res.status(200).json({

            success: true,
            message: "Product Deleted Successfully"

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,
            message: error.message

        });

    }

};

// ======================================
// Get Products by Vendor
// ======================================

const getProductsByVendor = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const products = await Product.find({ vendorId }).populate("vendorId", "shopName ownerName");
        res.status(200).json({
            success: true,
            products
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ======================================
// Get Similar Products
// ======================================
const getSimilarProducts = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        
        // Similar products in the same category (excluding current)
        const products = await Product.find({
            category: product.category,
            _id: { $ne: id }
        }).limit(4);
        
        res.status(200).json({ success: true, products });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ======================================
// Add Product Review
// ======================================
const addProductReview = async (req, res) => {
    try {
        const { id } = req.params; // Product ID
        const { userId, rating, comment } = req.body;

        const review = await Review.create({
            productId: id,
            userId,
            rating: Number(rating),
            comment
        });

        // Recalculate average rating
        const reviews = await Review.find({ productId: id });
        const numReviews = reviews.length;
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / numReviews;

        await Product.findByIdAndUpdate(id, {
            rating: Math.round(avgRating * 10) / 10,
            numReviews
        });

        res.status(201).json({ success: true, message: "Review added successfully", review });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ======================================
// Get Product Reviews
// ======================================
const getProductReviews = async (req, res) => {
    try {
        const { id } = req.params; // Product ID
        const reviews = await Review.find({ productId: id })
            .populate("userId", "username name profilePicture");
            
        res.status(200).json({ success: true, reviews });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ======================================
// Export
// ======================================

module.exports = {

    addProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    getProductsByVendor,
    getSimilarProducts,
    addProductReview,
    getProductReviews

};