const express = require("express");

const router = express.Router();


const {

addWishlist,

getWishlist,

removeWishlist


}=require("../controllers/wishlistController");



router.post("/",addWishlist);
router.post("/add",addWishlist);
router.get("/:userId",getWishlist);
router.delete("/:id",removeWishlist);



module.exports=router;