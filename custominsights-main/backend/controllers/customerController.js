const Customer = require("../models/Customer");
const User = require("../models/User");
const Order = require("../models/Order");

// Helper function to sync the Customer collection from User and Order collections
const syncCustomersFromOrders = async () => {
  const users = await User.find({ role: "user" });
  for (const user of users) {
    const orders = await Order.find({ userId: user._id }).sort({ orderDate: 1 });
    
    let totalSpending = 0;
    const purchaseHistory = [];
    let lastPurchaseDate = null;

    orders.forEach(order => {
      totalSpending += (order.totalAmount || 0);
      if (!lastPurchaseDate || new Date(order.orderDate) > new Date(lastPurchaseDate)) {
        lastPurchaseDate = order.orderDate;
      }
      order.products.forEach(p => {
        purchaseHistory.push({
          productId: p.productId,
          quantity: p.quantity,
          price: p.price,
          orderId: order._id,
          date: order.orderDate
        });
      });
    });

    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalSpending / totalOrders : 0;
    
    // Determine 4-Tier RFM Segment
    let segment = "Regular";
    if (totalSpending >= 500 && totalOrders >= 3) {
      segment = "Premium";
    } else if (totalSpending >= 250 || totalOrders >= 2) {
      segment = "Gold";
    } else if (totalSpending >= 100 || totalOrders >= 1) {
      segment = "Silver";
    }

    // Default regions/cities if address isn't present
    const indianCities = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Pune", "Kolkata"];
    const city = user.address?.city || indianCities[Math.abs(user.email.length) % indianCities.length];
    const region = user.address?.state || "Maharashtra";

    await Customer.findOneAndUpdate(
      { email: user.email },
      {
        name: user.name || user.username || "Anonymous Customer",
        email: user.email,
        purchaseHistory: purchaseHistory,
        totalOrders,
        totalSpending,
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
        lastPurchaseDate,
        purchaseFrequency: totalOrders,
        clv: parseFloat(totalSpending.toFixed(2)),
        segment,
        city,
        region,
        createdAt: user.createdAt || new Date()
      },
      { upsert: true, new: true }
    );
  }
};

// Segment customers into RFM segments while preserving frequentBuyers & dormantUsers for compatibility
const segmentCustomers = async (req, res) => {
  try {
    await syncCustomersFromOrders();

    const customers = await Customer.find().populate({
      path: "purchaseHistory.productId",
      model: "Product"
    });

    const segments = {
      frequentBuyers: [],
      dormantUsers: [],
      premium: [],
      gold: [],
      silver: [],
      regular: []
    };

    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    customers.forEach(c => {
      const purchasesLastMonth = c.purchaseHistory.filter(
        p => new Date(p.date) > oneMonthAgo
      ).length;

      const customerData = {
        _id: c._id,
        name: c.name,
        email: c.email,
        purchaseCount30Days: purchasesLastMonth,
        totalPurchases: c.purchaseHistory.length,
        totalOrders: c.totalOrders,
        totalSpending: c.totalSpending,
        averageOrderValue: c.averageOrderValue,
        lastPurchaseDate: c.lastPurchaseDate,
        segment: c.segment,
        city: c.city,
        region: c.region,
        createdAt: c.createdAt
      };

      // Compatibility arrays for validate_analytics.js
      if (purchasesLastMonth >= 3) {
        segments.frequentBuyers.push(customerData);
      } else {
        segments.dormantUsers.push(customerData);
      }

      // 4-Tier RFM classification
      if (c.segment === "Premium") {
        segments.premium.push(customerData);
      } else if (c.segment === "Gold") {
        segments.gold.push(customerData);
      } else if (c.segment === "Silver") {
        segments.silver.push(customerData);
      } else {
        segments.regular.push(customerData);
      }
    });

    res.json({ success: true, segments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Sync endpoint exposed directly
const syncCustomers = async (req, res) => {
  try {
    await syncCustomersFromOrders();
    res.json({ success: true, message: "Customer profiles synchronized successfully." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get complete Customer Behaviour Analytics Dashboard
const getCustomerAnalyticsDashboard = async (req, res) => {
  try {
    await syncCustomersFromOrders();

    const customers = await Customer.find();
    const totalCustomers = customers.length;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const newCustomers = customers.filter(c => new Date(c.createdAt) >= thirtyDaysAgo).length;
    const returningCustomers = customers.filter(c => c.totalOrders >= 2).length;
    const activeCustomers = customers.filter(c => c.lastPurchaseDate && new Date(c.lastPurchaseDate) >= ninetyDaysAgo).length;

    const repeatPurchaseRate = totalCustomers > 0
      ? parseFloat(((returningCustomers / totalCustomers) * 100).toFixed(1))
      : 0;

    const topCustomers = [...customers]
      .sort((a, b) => b.totalSpending - a.totalSpending)
      .slice(0, 10);

    // Geographic distribution
    const regionMap = {};
    customers.forEach(c => {
      const reg = c.city || c.region || "Mumbai";
      regionMap[reg] = (regionMap[reg] || 0) + 1;
    });

    const customersByRegion = Object.keys(regionMap).map(k => ({
      region: k,
      count: regionMap[k]
    }));

    // Spending distribution tiers
    const spendingTiers = {
      low: customers.filter(c => c.totalSpending < 100).length,
      medium: customers.filter(c => c.totalSpending >= 100 && c.totalSpending < 500).length,
      high: customers.filter(c => c.totalSpending >= 500).length
    };

    // Monthly customer growth
    const growthMap = {};
    customers.forEach(c => {
      const monthStr = new Date(c.createdAt).toLocaleString("default", { month: "short", year: "2-digit" });
      growthMap[monthStr] = (growthMap[monthStr] || 0) + 1;
    });

    const customerGrowth = Object.keys(growthMap).map(m => ({
      month: m,
      newCount: growthMap[m]
    }));

    res.json({
      success: true,
      analytics: {
        totalCustomers,
        newCustomers,
        returningCustomers,
        activeCustomers,
        repeatPurchaseRate,
        topCustomers,
        customersByRegion,
        spendingTiers,
        customerGrowth
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  segmentCustomers,
  syncCustomers,
  getCustomerAnalyticsDashboard,
  syncCustomersFromOrders
};
