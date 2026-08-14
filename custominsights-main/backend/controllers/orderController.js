const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Transaction = require("../models/Transaction");
const Product = require("../models/Product");
const InventoryLog = require("../models/InventoryLog");
const { createNotification } = require("./notificationController");
const { syncCustomersFromOrders } = require("./customerController");

// PLACE ORDER
const placeOrder = async (req, res) => {
  try {
    const { userId, paymentMethod, address } = req.body;

    const cartItems = await Cart.find({
      userId: userId,
      saveForLater: false
    }).populate("productId");

    if (cartItems.length === 0) {
      return res.status(400).json({
        message: "Cart is empty"
      });
    }

    let products = [];
    let totalAmount = 0;

    cartItems.forEach(item => {
      products.push({
        productId: item.productId._id,
        productName: item.productId.productName || item.productId.name,
        quantity: item.quantity,
        price: item.productId.price
      });

      totalAmount += item.productId.price * item.quantity;
    });

    // Create Order
    const order = await Order.create({
      userId: userId,
      products: products,
      totalAmount: totalAmount,
      paymentMethod: paymentMethod || "COD",
      paymentStatus: "Paid",
      orderStatus: "Processing"
    });

    // Create Transaction Automatically
    const transaction = await Transaction.create({
      userId: userId,
      orderId: order._id,
      amount: totalAmount,
      paymentMethod: paymentMethod || "COD",
      paymentStatus: "Success"
    });

    // Automatically update product stock & record inventory movement history
    for (const item of products) {
      const dbProduct = await Product.findById(item.productId);
      if (dbProduct) {
        const prevStock = dbProduct.quantity !== undefined ? dbProduct.quantity : (dbProduct.stock || 0);
        const newStock = Math.max(0, prevStock - item.quantity);
        dbProduct.quantity = newStock;
        dbProduct.stock = newStock;
        dbProduct.soldQuantity = (dbProduct.soldQuantity || 0) + item.quantity;
        await dbProduct.save();

        await InventoryLog.create({
          productId: dbProduct._id,
          changeType: "PURCHASE_DEDUCTION",
          quantityChange: -item.quantity,
          previousStock: prevStock,
          newStock: newStock,
          orderId: order._id,
          note: `Order purchase #${order._id}`
        });
      }
    }

    // Remove cart items
    await Cart.deleteMany({
      userId: userId,
      saveForLater: false
    });

    // Add Order Placement Notification
    await createNotification(
      userId,
      "Order Placed 🎉",
      `Your order for ${products.length} item(s) has been placed successfully. Order ID: ${order._id}`,
      "order"
    );

    // Sync Customer analytics asynchronously
    try {
      await syncCustomersFromOrders();
    } catch (err) {
      console.error("Error syncing customer statistics:", err.message);
    }

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
      transaction
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

// GET USER ORDERS
const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.params.userId
    }).sort({
      orderDate: -1
    });

    res.json({ success: true, orders: orders });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

// ADMIN VIEW ALL ORDERS
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId")
      .populate({
        path: "products.productId",
        populate: { path: "vendorId" }
      })
      .sort({
        orderDate: -1
      });

    res.json({ success: true, orders: orders });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

// GET VENDOR ORDERS
const getVendorOrders = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const orders = await Order.find()
      .populate("userId")
      .populate({
        path: "products.productId",
        populate: { path: "vendorId" }
      })
      .sort({
        orderDate: -1
      });

    const filteredOrders = [];
    orders.forEach(order => {
      const vendorProducts = order.products.filter(
        p => p.productId && p.productId.vendorId && p.productId.vendorId._id.toString() === vendorId
      );
      if (vendorProducts.length > 0) {
        filteredOrders.push({
          _id: order._id,
          userId: order.userId,
          orderDate: order.orderDate,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          products: vendorProducts,
          totalAmount: vendorProducts.reduce((sum, p) => sum + p.price * p.quantity, 0)
        });
      }
    });

    res.json({ success: true, orders: filteredOrders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE ORDER STATUS
const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus } = req.body;
    const existingOrder = await Order.findById(req.params.id);
    if (!existingOrder) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const previousStatus = existingOrder.orderStatus;
    existingOrder.orderStatus = orderStatus;
    await existingOrder.save();

    // If order was cancelled, restore inventory
    if (orderStatus === "Cancelled" && previousStatus !== "Cancelled") {
      for (const item of existingOrder.products) {
        if (item.productId) {
          const dbProduct = await Product.findById(item.productId);
          if (dbProduct) {
            const prevStock = dbProduct.quantity !== undefined ? dbProduct.quantity : (dbProduct.stock || 0);
            const newStock = prevStock + item.quantity;
            dbProduct.quantity = newStock;
            dbProduct.stock = newStock;
            dbProduct.soldQuantity = Math.max(0, (dbProduct.soldQuantity || 0) - item.quantity);
            await dbProduct.save();

            await InventoryLog.create({
              productId: dbProduct._id,
              changeType: "ORDER_CANCELLED",
              quantityChange: item.quantity,
              previousStock: prevStock,
              newStock: newStock,
              orderId: existingOrder._id,
              note: `Order status update to Cancelled #${existingOrder._id}`
            });
          }
        }
      }

      try {
        await syncCustomersFromOrders();
      } catch (err) {
        console.error("Error syncing customer statistics:", err.message);
      }
    }

    // Trigger Notification
    let emoji = "📦";
    if (orderStatus === "Shipped") emoji = "🚚";
    if (orderStatus === "Delivered") emoji = "🎁";
    if (orderStatus === "Cancelled") emoji = "❌";

    await createNotification(
      existingOrder.userId,
      `Order ${orderStatus} ${emoji}`,
      `Your order status has been updated to ${orderStatus}. Order ID: ${existingOrder._id}`,
      "order"
    );

    res.json({ success: true, message: "Order status updated successfully", order: existingOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// CANCEL ORDER
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.orderStatus !== "Processing" && order.orderStatus !== "Pending") {
      return res.status(400).json({ success: false, message: "Cannot cancel order after shipping" });
    }

    const previousStatus = order.orderStatus;
    order.orderStatus = "Cancelled";
    await order.save();

    if (previousStatus !== "Cancelled") {
      for (const item of order.products) {
        if (item.productId) {
          const dbProduct = await Product.findById(item.productId);
          if (dbProduct) {
            const prevStock = dbProduct.quantity !== undefined ? dbProduct.quantity : (dbProduct.stock || 0);
            const newStock = prevStock + item.quantity;
            dbProduct.quantity = newStock;
            dbProduct.stock = newStock;
            dbProduct.soldQuantity = Math.max(0, (dbProduct.soldQuantity || 0) - item.quantity);
            await dbProduct.save();

            await InventoryLog.create({
              productId: dbProduct._id,
              changeType: "ORDER_CANCELLED",
              quantityChange: item.quantity,
              previousStock: prevStock,
              newStock: newStock,
              orderId: order._id,
              note: `Order cancellation #${order._id}`
            });
          }
        }
      }

      try {
        await syncCustomersFromOrders();
      } catch (err) {
        console.error("Error syncing customer statistics:", err.message);
      }
    }

    await createNotification(
      order.userId,
      "Order Cancelled ❌",
      `Your order with ID ${order._id} has been cancelled successfully.`,
      "order"
    );

    res.json({ success: true, message: "Order cancelled successfully", order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// REORDER PREVIOUS PURCHASES
const reorder = async (req, res) => {
  try {
    const { orderId, userId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Add items to user's cart
    for (const item of order.products) {
      const existingCart = await Cart.findOne({
        userId,
        productId: item.productId
      });

      if (existingCart) {
        existingCart.quantity += item.quantity;
        existingCart.saveForLater = false;
        await existingCart.save();
      } else {
        await Cart.create({
          userId,
          productId: item.productId,
          quantity: item.quantity,
          saveForLater: false
        });
      }
    }

    res.json({ success: true, message: "All items added back to cart" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const processPayment = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Payment processed successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  placeOrder,
  getUserOrders,
  getAllOrders,
  getVendorOrders,
  updateOrderStatus,
  cancelOrder,
  reorder,
  processPayment
};