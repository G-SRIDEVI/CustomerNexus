const express=require("express");

const router=express.Router();


const {

placeOrder,

getUserOrders,

getAllOrders,

getVendorOrders,

updateOrderStatus,

cancelOrder,

reorder,

processPayment

}=require("../controllers/orderController");



router.post(
"/place",
placeOrder
);

router.post(
"/payment",
processPayment
);

router.post(
"/reorder",
reorder
);

router.put(
"/:id/cancel",
cancelOrder
);



router.get(
"/user/:userId",
getUserOrders
);



// Admin orders

router.get(
"/",
getAllOrders
);

// Vendor orders
router.get(
"/vendor/:vendorId",
getVendorOrders
);

// Update status
router.put(
"/:id/status",
updateOrderStatus
);



module.exports=router;