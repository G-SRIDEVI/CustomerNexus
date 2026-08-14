const express = require("express");
const router = express.Router();
const {
    getNotifications,
    markAsRead,
    deleteNotification
} = require("../controllers/notificationController");

router.get("/user/:userId", getNotifications);
router.put("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

module.exports = router;
