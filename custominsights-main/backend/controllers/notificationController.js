const Notification = require("../models/Notification");

// Fetch notifications for user
const getNotifications = async (req, res) => {
    try {
        const { userId } = req.params;
        const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, notifications });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Mark notification as read
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findByIdAndUpdate(
            id,
            { isRead: true },
            { new: true }
        );
        res.status(200).json({ success: true, notification });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete notification
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Notification deleted" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper function to create notification programmatically
const createNotification = async (userId, title, message, type = "order") => {
    try {
        await Notification.create({
            userId,
            title,
            message,
            type
        });
    } catch (err) {
        console.error("Error creating notification:", err);
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    deleteNotification,
    createNotification
};
