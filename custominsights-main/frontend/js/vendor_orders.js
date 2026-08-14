// frontend/js/vendor_orders.js

const vendor = JSON.parse(localStorage.getItem("vendor"));
if (!vendor) {
  alert("Please login as vendor first");
  window.location.href = "vendor_register.html";
}

// Load vendor orders
async function loadVendorOrders() {
  try {
    const res = await fetch(`/api/orders/vendor/${vendor._id}`);
    const data = await res.json();
    const container = document.getElementById("orders-container");
    container.innerHTML = "";

    if (!data.success || data.orders.length === 0) {
      container.innerHTML = "<p>No orders found for your products</p>";
      return;
    }

    data.orders.forEach(order => {
      const productNames = order.products.map(p => p.productName).join(", ");
      const div = document.createElement("div");
      div.className = "vendor-order";
      div.innerHTML = `
        <h3>Order ID: ${order._id}</h3>
        <p>Customer: ${order.userId.username} (${order.userId.email})</p>
        <p>Products: ${productNames}</p>
        <p>Total Amount: $${order.totalAmount}</p>
        <p>Status: ${order.orderStatus}</p>
        <button onclick="updateOrderStatus('${order._id}', 'Shipped')">Mark as Shipped</button>
        <button onclick="updateOrderStatus('${order._id}', 'Delivered')">Mark as Delivered</button>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error("Error loading vendor orders:", err);
  }
}

// Update order status
async function updateOrderStatus(orderId, status) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`Order updated to ${status}`);
      loadVendorOrders();
    } else {
      alert(data.message || "Failed to update order");
    }
  } catch (err) {
    console.error("Error updating order:", err);
  }
}

loadVendorOrders();
