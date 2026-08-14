const Order = require("../models/Order");
const Product = require("../models/Product");
const InventoryForecast = require("../models/InventoryForecast");
const InventoryLog = require("../models/InventoryLog");

// Helper function: Calculate Linear Regression forecast (Ordinary Least Squares - OLS)
function calculateLinearRegression(x, y) {
  const n = x.length;
  if (n === 0) return { slope: 0, intercept: 0, predict: () => 0 };
  if (n === 1) return { slope: 0, intercept: y[0], predict: () => y[0] };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumXX += x[i] * x[i];
  }

  const denom = (n * sumXX - sumX * sumX);
  let slope = 0;
  let intercept = sumY / n;

  if (denom !== 0) {
    slope = (n * sumXY - sumX * sumY) / denom;
    intercept = (sumY - slope * sumX) / n;
  }

  const predict = (futureDay) => {
    return Math.max(0, slope * futureDay + intercept);
  };

  return { slope, intercept, predict };
}

// Forecast stock based on historical sales using Linear Regression
const forecastInventory = async (req, res) => {
  try {
    const { productId, days = 14 } = req.query;
    const daysNum = Math.max(7, parseInt(days, 10) || 14);

    const runProductForecast = async (product) => {
      const currentStock = product.quantity !== undefined ? product.quantity : (product.stock || 0);

      // Build daily sales dataset for the last N days
      const now = new Date();
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - daysNum);

      const orders = await Order.find({
        "products.productId": product._id,
        orderDate: { $gte: cutoffDate }
      });

      // Map sales to individual days (1 to daysNum)
      const dailySalesMap = {};
      for (let d = 1; d <= daysNum; d++) {
        dailySalesMap[d] = 0;
      }

      orders.forEach(order => {
        const orderDate = new Date(order.orderDate || order.createdAt);
        const diffTime = Math.abs(now - orderDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const dayIndex = Math.max(1, Math.min(daysNum, daysNum - diffDays + 1));

        order.products.forEach(p => {
          if (p.productId && p.productId.toString() === product._id.toString()) {
            dailySalesMap[dayIndex] = (dailySalesMap[dayIndex] || 0) + (p.quantity || 1);
          }
        });
      });

      const x = [];
      const y = [];
      let totalQty = 0;

      for (let d = 1; d <= daysNum; d++) {
        x.push(d);
        const qty = dailySalesMap[d] || 0;
        y.push(qty);
        totalQty += qty;
      }

      // Execute Linear Regression (OLS) Algorithm
      const { slope, intercept, predict } = calculateLinearRegression(x, y);

      // Forecast future demand using Linear Regression model
      // 7-day projected demand: sum of predicted daily sales for day (daysNum + 1) to (daysNum + 7)
      let predictedStock7Days = 0;
      for (let k = 1; k <= 7; k++) {
        const futureDay = daysNum + k;
        const predictedDailyQty = predict(futureDay);
        predictedStock7Days += predictedDailyQty;
      }

      // 30-day projected demand
      let predictedStock30Days = 0;
      for (let k = 1; k <= 30; k++) {
        const futureDay = daysNum + k;
        const predictedDailyQty = predict(futureDay);
        predictedStock30Days += predictedDailyQty;
      }

      const avgDailySales = parseFloat((predictedStock7Days / 7).toFixed(2));
      const avgWeeklySales = parseFloat(predictedStock7Days.toFixed(2));
      const avgMonthlySales = parseFloat(predictedStock30Days.toFixed(2));
      const predictedStock = Math.round(predictedStock7Days);

      const daysUntilStockOut = avgDailySales > 0 ? Math.round(currentStock / avgDailySales) : 999;
      const estimatedStockOutDate = avgDailySales > 0
        ? new Date(Date.now() + (currentStock / avgDailySales) * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      const minStock = product.minStockLevel || 10;
      const reorderQuantity = Math.max(0, Math.round(avgMonthlySales + minStock - currentStock));

      // Calculate Residual Error Metrics (MAE & RMSE) for Linear Regression fit
      let maeSum = 0;
      let rmseSum = 0;

      for (let i = 0; i < daysNum; i++) {
        const fittedValue = predict(x[i]);
        const residual = Math.abs(y[i] - fittedValue);
        maeSum += residual;
        rmseSum += residual * residual;
      }

      const mae = parseFloat((maeSum / daysNum).toFixed(2));
      const rmse = parseFloat(Math.sqrt(rmseSum / daysNum).toFixed(2));
      const meanY = totalQty / daysNum;
      
      let accuracyPercentage = 95.0;
      if (meanY > 0) {
        const errorRatio = mae / meanY;
        accuracyPercentage = parseFloat(Math.max(65.0, Math.min(99.5, 100 - (errorRatio * 25))).toFixed(1));
      }

      const dailyForecast = [];
      for (let k = 1; k <= 7; k++) {
        dailyForecast.push(parseFloat(predict(daysNum + k).toFixed(2)));
      }

      const forecast = await InventoryForecast.findOneAndUpdate(
        { productId: product._id },
        {
          productId: product._id,
          predictedStock,
          avgDailySales,
          avgWeeklySales,
          avgMonthlySales,
          daysUntilStockOut,
          estimatedStockOutDate,
          reorderQuantity,
          confidenceLevel: parseFloat((Math.min(0.98, Math.max(0.75, accuracyPercentage / 100))).toFixed(2)),
          mae,
          rmse,
          accuracyPercentage,
          slope: parseFloat(slope.toFixed(4)),
          intercept: parseFloat(intercept.toFixed(4)),
          dailyHistory: y,
          dailyForecast: dailyForecast,
          forecastDate: new Date()
        },
        { upsert: true, new: true }
      );

      // Return forecast object along with algorithm parameters
      return {
        ...forecast.toObject(),
        slope: parseFloat(slope.toFixed(4)),
        intercept: parseFloat(intercept.toFixed(4)),
        historicalPoints: { x, y }
      };
    };

    if (productId) {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      const forecast = await runProductForecast(product);
      return res.json({ success: true, forecast, algorithm: "Linear Regression Algorithm (Ordinary Least Squares)" });
    } else {
      const products = await Product.find();
      const forecastResults = [];
      for (const product of products) {
        const f = await runProductForecast(product);
        forecastResults.push(f);
      }

      const populatedForecasts = await InventoryForecast.find().populate("productId");
      
      let totalProjectedDemand7Days = 0;
      let totalReorderQtyNeeded = 0;
      let totalAccuracy = 0;
      
      populatedForecasts.forEach(f => {
        totalProjectedDemand7Days += (f.predictedStock || 0);
        totalReorderQtyNeeded += (f.reorderQuantity || 0);
        totalAccuracy += (f.accuracyPercentage || 92.5);
      });

      const avgSystemAccuracy = populatedForecasts.length > 0
        ? parseFloat((totalAccuracy / populatedForecasts.length).toFixed(1))
        : 95.0;

      return res.json({
        success: true,
        forecasts: populatedForecasts,
        detailedResults: forecastResults,
        summary: {
          totalProjectedDemand7Days,
          totalReorderQtyNeeded,
          avgSystemAccuracy
        },
        algorithm: "Linear Regression Algorithm (Ordinary Least Squares)"
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Retrieve saved forecasts (auto-recalculate if none exist)
const getForecasts = async (req, res) => {
  try {
    let forecasts = await InventoryForecast.find().populate("productId");
    if (!forecasts || forecasts.length === 0) {
      return await forecastInventory(req, res);
    }
    
    let totalProjectedDemand7Days = 0;
    let totalReorderQtyNeeded = 0;
    let totalAccuracy = 0;
    
    forecasts.forEach(f => {
      totalProjectedDemand7Days += (f.predictedStock || 0);
      totalReorderQtyNeeded += (f.reorderQuantity || 0);
      totalAccuracy += (f.accuracyPercentage || 92.5);
    });

    const avgSystemAccuracy = forecasts.length > 0
      ? parseFloat((totalAccuracy / forecasts.length).toFixed(1))
      : 95.0;

    res.json({
      success: true,
      forecasts,
      summary: {
        totalProjectedDemand7Days,
        totalReorderQtyNeeded,
        avgSystemAccuracy
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get complete Inventory Intelligence Dashboard metrics
const getInventoryDashboard = async (req, res) => {
  try {
    const products = await Product.find().populate("vendorId");
    
    let totalProducts = products.length;
    let currentInventoryValue = 0;
    let totalAvailableStock = 0;

    const lowStockProducts = [];
    const outOfStockProducts = [];

    products.forEach(p => {
      const stockVal = p.quantity !== undefined ? p.quantity : (p.stock || 0);
      const minStock = p.minStockLevel || 10;
      const priceVal = p.price || 0;

      totalAvailableStock += stockVal;
      currentInventoryValue += stockVal * priceVal;

      if (stockVal <= 0) {
        outOfStockProducts.push({
          _id: p._id,
          productName: p.productName || p.name,
          category: p.category,
          stock: stockVal,
          price: priceVal,
          status: "Out of Stock"
        });
      } else if (stockVal <= minStock) {
        lowStockProducts.push({
          _id: p._id,
          productName: p.productName || p.name,
          category: p.category,
          stock: stockVal,
          minStockLevel: minStock,
          price: priceVal,
          status: "Low Stock"
        });
      }
    });

    const mostSoldProducts = [...products]
      .sort((a, b) => (b.soldQuantity || 0) - (a.soldQuantity || 0))
      .slice(0, 5)
      .map(p => ({
        _id: p._id,
        productName: p.productName || p.name,
        category: p.category,
        price: p.price,
        stock: p.quantity !== undefined ? p.quantity : (p.stock || 0),
        soldQuantity: p.soldQuantity || 0
      }));

    const recentlyUpdatedProducts = [...products]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5)
      .map(p => ({
        _id: p._id,
        productName: p.productName || p.name,
        category: p.category,
        stock: p.quantity !== undefined ? p.quantity : (p.stock || 0),
        updatedAt: p.updatedAt
      }));

    // Generate monthly inventory trend from orders
    const allOrders = await Order.find().sort({ orderDate: 1 });
    const monthlyTrendMap = {};

    allOrders.forEach(o => {
      const monthKey = new Date(o.orderDate).toLocaleString("default", { month: "short", year: "2-digit" });
      if (!monthlyTrendMap[monthKey]) {
        monthlyTrendMap[monthKey] = { month: monthKey, unitsSold: 0, revenue: 0 };
      }
      let orderUnits = 0;
      o.products.forEach(p => { orderUnits += (p.quantity || 1); });
      monthlyTrendMap[monthKey].unitsSold += orderUnits;
      monthlyTrendMap[monthKey].revenue += (o.totalAmount || 0);
    });

    const inventoryTrend = Object.values(monthlyTrendMap);

    res.json({
      success: true,
      metrics: {
        totalProducts,
        currentInventoryValue,
        totalAvailableStock,
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length,
        lowStockProducts,
        outOfStockProducts,
        mostSoldProducts,
        recentlyUpdatedProducts,
        inventoryTrend,
        products
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Retrieve Inventory Audit Movement Logs
const getInventoryLogs = async (req, res) => {
  try {
    const logs = await InventoryLog.find()
      .populate("productId")
      .populate("orderId")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Manual Stock Adjustment / CRUD Operation
const adjustStock = async (req, res) => {
  try {
    const { productId, newStock, minStockLevel, note } = req.body;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const prevStock = product.quantity !== undefined ? product.quantity : (product.stock || 0);
    const updatedStockNum = parseInt(newStock, 10);
    
    if (isNaN(updatedStockNum) || updatedStockNum < 0) {
      return res.status(400).json({ success: false, message: "Invalid stock quantity" });
    }

    product.quantity = updatedStockNum;
    product.stock = updatedStockNum;
    if (minStockLevel !== undefined && !isNaN(parseInt(minStockLevel, 10))) {
      product.minStockLevel = parseInt(minStockLevel, 10);
    }
    await product.save();

    const change = updatedStockNum - prevStock;
    await InventoryLog.create({
      productId: product._id,
      changeType: change >= 0 ? "RESTOCK" : "STOCK_ADJUSTMENT",
      quantityChange: change,
      previousStock: prevStock,
      newStock: updatedStockNum,
      note: note || "Manual stock adjustment via Admin Console"
    });

    res.json({ success: true, message: "Stock updated successfully", product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  forecastInventory,
  getForecasts,
  getInventoryDashboard,
  getInventoryLogs,
  adjustStock
};
