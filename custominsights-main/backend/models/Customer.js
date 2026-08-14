const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  purchaseHistory: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: Number,
      price: Number,
      orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
      date: Date
    }
  ],
  totalOrders: { type: Number, default: 0 },
  totalSpending: { type: Number, default: 0 },
  averageOrderValue: { type: Number, default: 0 },
  lastPurchaseDate: Date,
  purchaseFrequency: { type: Number, default: 0 },
  clv: { type: Number, default: 0 },
  segment: { type: String, default: "Regular" },
  city: { type: String, default: "Mumbai" },
  region: { type: String, default: "Maharashtra" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Customer", customerSchema);
