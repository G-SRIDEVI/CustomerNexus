const express = require("express");
const router = express.Router();

const {
    registerVendor,
    loginVendor,
    getVendors,
    addVendor,
    updateVendor
} = require("../controllers/vendorController");

router.post("/register", registerVendor);

router.post("/login", loginVendor);

router.get("/", getVendors);

router.post("/", addVendor);

router.put("/:id", updateVendor);

module.exports = router;