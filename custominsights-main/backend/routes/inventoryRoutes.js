const express = require("express");
const router = express.Router();
const {
  forecastInventory,
  getForecasts,
  getInventoryDashboard,
  getInventoryLogs,
  adjustStock
} = require("../controllers/inventoryController");

router.get("/forecast", forecastInventory);
router.get("/forecasts", getForecasts);
router.get("/dashboard", getInventoryDashboard);
router.get("/logs", getInventoryLogs);
router.post("/adjust", adjustStock);

module.exports = router;
