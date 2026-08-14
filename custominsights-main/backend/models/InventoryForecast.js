const mongoose = require("mongoose");

const inventoryForecastSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  predictedStock: { type: Number, default: 0 }, // forecasted 7-day units
  avgDailySales: { type: Number, default: 0 },
  avgWeeklySales: { type: Number, default: 0 },
  avgMonthlySales: { type: Number, default: 0 },
  estimatedStockOutDate: Date,
  daysUntilStockOut: { type: Number, default: 999 },
  reorderQuantity: { type: Number, default: 0 },
  confidenceLevel: { type: Number, default: 0.8 },
  mae: { type: Number, default: 0 },
  rmse: { type: Number, default: 0 },
  accuracyPercentage: { type: Number, default: 92.5 },
  slope: { type: Number, default: 0 },
  intercept: { type: Number, default: 0 },
  dailyHistory: [{ type: Number }],
  dailyForecast: [{ type: Number }],
  forecastDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model("InventoryForecast", inventoryForecastSchema);

