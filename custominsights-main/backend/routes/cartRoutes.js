const express = require("express");

const router = express.Router();


const {

addCart,

getCart,

removeCart,

updateQuantity,

toggleSaveForLater

}=require("../controllers/cartController");



router.post("/", addCart);
router.post("/add", addCart);
router.post("/remove", removeCart);
router.get("/:userId", getCart);
router.delete("/:id", removeCart);
router.put("/:id/quantity", updateQuantity);
router.put("/:id/save", toggleSaveForLater);

module.exports = router;