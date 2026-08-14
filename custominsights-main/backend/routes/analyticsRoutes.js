const express = require("express");
const router = express.Router();

const {
  getSalesAnalytics,
  getDashboard,
  getMonthlyRevenue,
  getCategoryAnalytics,
  getVendorAnalytics,
  getTopSellingProducts,
  getActiveVendors,
  getValidationMetrics,
  getComprehensiveAnalytics
} = require("../controllers/analyticsController");

router.get("/", getSalesAnalytics);
router.get("/dashboard", getDashboard);
router.get("/monthly", getMonthlyRevenue);
router.get("/categories", getCategoryAnalytics);
router.get("/vendor/:vendorId", getVendorAnalytics);
router.get("/top-products", getTopSellingProducts);
router.get("/active-vendors", getActiveVendors);
router.get("/validation", getValidationMetrics);
router.get("/comprehensive", getComprehensiveAnalytics);

module.exports = router;