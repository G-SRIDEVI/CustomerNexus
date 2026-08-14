const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Vendor = require("../models/Vendor");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Transaction = require("../models/Transaction");

// GET /api/admin/vendors
router.get("/vendors", async (req, res) => {
  try {
    const vendors = await Vendor.find().select("-password");
    res.json({ success: true, vendors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/vendors/:id
router.delete("/vendors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await Vendor.findByIdAndDelete(id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }
    // Delete all products associated with this vendor
    await Product.deleteMany({ vendorId: id });
    res.json({ success: true, message: "Vendor and associated products deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/vendors/:id
router.put("/vendors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { shopName, ownerName, email, phone, businessType } = req.body;
    const vendor = await Vendor.findByIdAndUpdate(
      id,
      { shopName, ownerName, email, phone, businessType },
      { new: true }
    );
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }
    res.json({ success: true, message: "Vendor updated successfully", vendor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/users
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).select("-password");
    const orders = await Order.find();
    
    // Create spending dictionary
    const spendingMap = {};
    orders.forEach(order => {
      if (order.userId) {
        const uId = order.userId.toString();
        spendingMap[uId] = (spendingMap[uId] || 0) + order.totalAmount;
      }
    });

    // Map spending to users array
    const usersWithSpending = users.map(user => {
      const userObj = user.toObject();
      userObj.totalSpending = spendingMap[user._id.toString()] || 0;
      return userObj;
    });

    res.json({ success: true, users: usersWithSpending });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/users/:id
router.put("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;
    const user = await User.findByIdAndUpdate(id, { name, email, phone }, { new: true });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, message: "User updated successfully", user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/admin/users/:id/block
router.patch("/users/:id/block", async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;
    const user = await User.findByIdAndUpdate(id, { isBlocked }, { new: true });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/users/:id/orders
router.get("/users/:id/orders", async (req, res) => {
  try {
    const { id } = req.params;
    const orders = await Order.find({ userId: id }).populate("products.productId");
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/products
router.get("/products", async (req, res) => {
  try {
    const products = await Product.find().populate("vendorId", "shopName ownerName");
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/products/:id
router.delete("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/orders
router.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "username email")
      .populate("products.productId")
      .sort({ orderDate: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/transactions
router.get("/transactions", async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate("userId", "name username email")
      .populate("orderId")
      .sort({ date: -1 });
    res.json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/transactions/:id/refund
router.post("/transactions/:id/refund", async (req, res) => {
  try {
    const { id } = req.params;
    const txn = await Transaction.findByIdAndUpdate(id, { paymentStatus: "Refunded" }, { new: true });
    if (!txn) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }
    if (txn.orderId) {
      await Order.findByIdAndUpdate(txn.orderId, { paymentStatus: "Refunded" });
    }
    res.json({ success: true, message: "Transaction refunded successfully", transaction: txn });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/settings
router.put("/settings", async (req, res) => {
  try {
    res.json({ success: true, message: "Settings updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
