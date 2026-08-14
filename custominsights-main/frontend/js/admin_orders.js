// Order Management Logic
let allOrders = [];

const tableBody = document.getElementById("orderTableBody");
const searchInput = document.getElementById("searchOrderInput");

// Load orders
async function loadOrders() {
  try {
    const res = await fetch("http://localhost:5000/api/admin/orders");
    const data = await res.json();

    if (data.success) {
      allOrders = data.orders || [];
      renderOrders(allOrders);
    } else {
      tableBody.innerHTML = `<tr><td colspan="7" style="color: red; padding: 20px;">Failed to load orders: ${data.message}</td></tr>`;
    }
  } catch (error) {
    console.error("Error loading orders:", error);
    tableBody.innerHTML = `<tr><td colspan="7" style="color: red; padding: 20px;">Failed to load orders due to a connection error.</td></tr>`;
  }
}

// Render order list
function renderOrders(ordersToRender) {
  tableBody.innerHTML = "";

  if (ordersToRender.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="padding: 20px; color: #64748b;">No orders found.</td></tr>`;
    return;
  }

  ordersToRender.forEach(order => {
    const customerName = order.userId ? `${order.userId.name || order.userId.username || 'User'} (${order.userId.email})` : "Guest/User";
    
    // Construct product list representation
    const productList = order.products.map(p => {
      const pName = p.productId ? p.productId.productName : (p.productName || "Unknown Product");
      return `${pName} (x${p.quantity})`;
    }).join(", ");

    const displayId = order._id.substring(18);

    tableBody.innerHTML += `
      <tr>
        <td style="font-weight: 600; color: #334155;">#${displayId}</td>
        <td>${customerName}</td>
        <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${productList}">${productList}</td>
        <td style="font-weight: 600; color: #1e293b;">₹${order.totalAmount.toLocaleString()}</td>
        <td>
          <span class="status-badge" style="
            background: ${order.paymentStatus === 'Paid' ? '#dcfce7' : '#fee2e2'};
            color: ${order.paymentStatus === 'Paid' ? '#15803d' : '#b91c1c'};
          ">${order.paymentStatus} (${order.paymentMethod})</span>
        </td>
        <td>
          <span class="status-badge" style="
            background: ${order.orderStatus === 'Delivered' ? '#dcfce7' : order.orderStatus === 'Shipped' ? '#dbeafe' : order.orderStatus === 'Cancelled' ? '#fee2e2' : '#fef9c3'};
            color: ${order.orderStatus === 'Delivered' ? '#15803d' : order.orderStatus === 'Shipped' ? '#1d4ed8' : order.orderStatus === 'Cancelled' ? '#b91c1c' : '#854d0e'};
          ">${order.orderStatus}</span>
        </td>
        <td>
          <select class="status-select" onchange="updateStatus('${order._id}', this.value)">
            <option value="Processing" ${order.orderStatus === 'Processing' ? 'selected' : ''}>Processing</option>
            <option value="Shipped" ${order.orderStatus === 'Shipped' ? 'selected' : ''}>Shipped</option>
            <option value="Delivered" ${order.orderStatus === 'Delivered' ? 'selected' : ''}>Delivered</option>
            <option value="Cancelled" ${order.orderStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
      </tr>
    `;
  });
}

// Filter orders
if (searchInput) {
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase().trim();
    const filtered = allOrders.filter(order => {
      const username = order.userId ? order.userId.username.toLowerCase() : "";
      const email = order.userId ? order.userId.email.toLowerCase() : "";
      return username.includes(query) || email.includes(query) || order._id.includes(query);
    });
    renderOrders(filtered);
  });
}

// Update order status
async function updateStatus(orderId, newStatus) {
  try {
    const res = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ orderStatus: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      alert("Order status updated successfully!");
      loadOrders();
    } else {
      alert(data.message || "Failed to update order status");
    }
  } catch (error) {
    console.error("Error updating order status:", error);
    alert("Failed to update status due to a connection error.");
  }
}

// Initial load
loadOrders();
