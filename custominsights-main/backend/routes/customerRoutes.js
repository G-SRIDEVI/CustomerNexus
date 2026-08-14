const express = require("express");
const router = express.Router();
const {
  segmentCustomers,
  syncCustomers,
  getCustomerAnalyticsDashboard
} = require("../controllers/customerController");

router.get("/segment", segmentCustomers);
router.post("/sync", syncCustomers);
router.get("/dashboard", getCustomerAnalyticsDashboard);

module.exports = router;
