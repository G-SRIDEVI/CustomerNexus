const Payment = require("../models/Payment");

const createPayment = async (req, res) => {
  try {
    const { orderId, userId, amount, paymentMethod, paymentStatus, transactionId } = req.body;
    const payment = await Payment.create({
      orderId,
      userId,
      amount,
      paymentMethod,
      paymentStatus,
      transactionId
    });
    res.status(201).json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPayments = async (req, res) => {
  try {
    const payments = await Payment.find().populate("userId", "username email");
    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createPayment,
  getPayments
};
