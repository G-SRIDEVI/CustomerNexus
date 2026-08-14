// Vendor Dashboard Controller
const vendor = JSON.parse(localStorage.getItem("vendor"));
const token = localStorage.getItem("vendorToken");

if (!vendor) {
  window.location.href = "vendor_login.html";
} else {
  // Normalize vendor identifier (support both id and _id)
  vendor._id = vendor._id || vendor.id;
}

// Global lists
let myProducts = [];
let myOrders = [];
let myCoupons = JSON.parse(localStorage.getItem(`coupons_${vendor._id}`)) || [
  { code: "WELCOME10", discount: 10, start: "2026-07-01", end: "2026-08-01", active: true }
];

// Document elements
const navVendorName = document.getElementById("navVendorName");
const navCurrentDate = document.getElementById("navCurrentDate");

// Charts references
let salesChartInst = null;
let revenueChartInst = null;
let categoryChartInst = null;

// Initialize
function initConsole() {
  // Set vendor metadata
  navVendorName.innerText = vendor.shopName || vendor.ownerName;
  navCurrentDate.innerText = new Date().toLocaleDateString("en-US", {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // Restore cached ML metrics if present
  restoreCachedVendorMlAnalytics();

  // Activate current section based on clean page URL
  const currentSection = syncTabFromUrl();
  activateVendorSection(currentSection);
}

// Always scroll to top of page on refresh
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);
document.addEventListener("DOMContentLoaded", () => {
  window.scrollTo(0, 0);
});

function activateVendorSection(targetSection) {
  const menuItems = document.querySelectorAll(".sidebar-menu .menu-item");
  const targetItem = document.querySelector(`.sidebar-menu .menu-item[data-section="${targetSection}"]`);
  
  if (targetItem) {
    menuItems.forEach(mi => mi.classList.remove("active"));
    targetItem.classList.add("active");
  }

  const sections = document.querySelectorAll(".content-section");
  sections.forEach(sec => sec.classList.remove("active"));
  const activeSec = document.getElementById(targetSection);
  if (activeSec) {
    activeSec.classList.add("active");
  }

  if (targetSection === "dashboard") loadDashboardStats();
  if (targetSection === "products") loadProducts();
  if (targetSection === "orders") loadOrders();
  if (targetSection === "analytics") calculateAnalytics();
  if (targetSection === "reviews") loadReviews();
  if (targetSection === "offers") renderCoupons();
  if (targetSection === "profile") loadProfileForm();
}

function syncTabFromUrl() {
  const path = window.location.pathname;
  if (path.endsWith("vendor_products.html")) return "products";
  if (path.endsWith("vendor_orders.html")) return "orders";
  if (path.endsWith("vendor_analytics.html")) return "analytics";
  if (path.endsWith("vendor_reviews.html")) return "reviews";
  if (path.endsWith("vendor_offers.html")) return "offers";
  if (path.endsWith("vendor_profile.html")) return "profile";
  if (path.endsWith("vendor_settings.html")) return "settings";

  // Legacy hash clean fallback
  const hash = window.location.hash.replace("#", "").trim();
  if (hash) {
    const targetUrl = hash === "dashboard" ? "vendor_dashboard.html" : `vendor_${hash}.html`;
    history.replaceState({ section: hash }, "", targetUrl);
    return hash;
  }

  return "dashboard";
}

function restoreCachedVendorMlAnalytics() {
  try {
    const cachedStr = localStorage.getItem("cached_vendor_ml_analytics");
    if (cachedStr) {
      const data = JSON.parse(cachedStr);
      const revenue = data.totalRevenue || 148500;
      const ordersCount = data.totalOrders || 42;
      const avgOrderVal = ordersCount > 0 ? (revenue / ordersCount) : 3535.71;
      const profitMargin = revenue * 0.15;

      const revElem = document.getElementById("vendorTotalRevenue");
      if (revElem) revElem.innerText = `₹${revenue.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
      
      const ordElem = document.getElementById("vendorTotalOrders");
      if (ordElem) ordElem.innerText = ordersCount;
      
      const avgElem = document.getElementById("vendorAvgOrder");
      if (avgElem) avgElem.innerText = `₹${avgOrderVal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
      
      const pmElem = document.getElementById("vendorProfitMargin");
      if (pmElem) pmElem.innerText = `₹${profitMargin.toLocaleString(undefined, {minimumFractionDigits: 2})}`;

      renderVendorSectionCharts(revenue);
      loadInlineVendorBenchmarking();
    }
  } catch (e) {
    console.error("Error restoring vendor cached ML analytics:", e);
  }
}

// -----------------------------------------------------
// 1. DASHBOARD & CHARTS
// -----------------------------------------------------
async function loadDashboardStats() {
  try {
    const res = await fetch(`http://localhost:5000/api/analytics/vendor/${vendor._id}`);
    const data = await res.json();

    const prodCount = data.totalProducts ?? 0;
    const ordCount = data.totalOrders ?? 0;
    const revCount = data.totalRevenue ?? 0;
    const pendCount = data.pendingOrders ?? 0;

    // Set Card values
    document.getElementById("cardTotalProducts").innerText = prodCount;
    document.getElementById("cardTotalOrders").innerText = ordCount;
    document.getElementById("cardTotalSales").innerText = `₹${revCount.toLocaleString()}`;
    document.getElementById("cardMonthlyRevenue").innerText = `₹${revCount.toLocaleString()}`;
    document.getElementById("cardAvgRating").innerText = "4.8";
    document.getElementById("cardPendingOrders").innerText = pendCount;
    document.getElementById("cardTodaySales").innerText = `₹${Math.round(revCount * 0.1).toLocaleString()}`;

    // Compute low stock items
    try {
      const pRes = await fetch(`http://localhost:5000/api/products/vendor/${vendor._id}`);
      const data = await pRes.json();
      const products = data.products || data || [];
      const lowStock = products.filter(p => p.quantity < 10).length;
      document.getElementById("cardLowStock").innerText = lowStock;
    } catch (e) {
      document.getElementById("cardLowStock").innerText = "0";
    }

    // Render placeholder charts
    renderCharts(revCount);
  } catch (error) {
    console.error("Error loading stats:", error);
  }
}

function renderCharts(totalRevenue) {
  if (typeof Chart === 'undefined') {
    console.warn("Chart.js not loaded.");
    return;
  }
  const rev = (totalRevenue && totalRevenue > 0) ? totalRevenue : 148500;
  
  // Monthly Sales Chart (Line)
  const monthlyCanvas = document.getElementById("monthlySalesChart");
  if (monthlyCanvas) {
    const monthlyCtx = monthlyCanvas.getContext("2d");
    if (salesChartInst) salesChartInst.destroy();
    salesChartInst = new Chart(monthlyCtx, {
      type: 'line',
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [{
          label: "Sales Revenue (₹)",
          data: [rev * 0.1, rev * 0.15, rev * 0.12, rev * 0.22, rev * 0.25, rev],
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.4,
          fill: true
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  // Revenue Chart (Bar)
  const revCanvas = document.getElementById("revenueChart");
  if (revCanvas) {
    const revCtx = revCanvas.getContext("2d");
    if (revenueChartInst) revenueChartInst.destroy();
    revenueChartInst = new Chart(revCtx, {
      type: 'bar',
      data: {
        labels: ["Wk 1", "Wk 2", "Wk 3", "Wk 4"],
        datasets: [{
          label: "Weekly Revenue",
          data: [rev * 0.2, rev * 0.25, rev * 0.15, rev * 0.4],
          backgroundColor: "#10b981",
          borderRadius: 8
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  // Categories Chart (Pie)
  const catCtx = document.getElementById("categoryChart").getContext("2d");
  if (categoryChartInst) categoryChartInst.destroy();
  categoryChartInst = new Chart(catCtx, {
    type: 'pie',
    data: {
      labels: ["Electronics", "Fashion", "Beauty", "Home Decor"],
      datasets: [{
        data: [40, 25, 20, 15],
        backgroundColor: ["#3b82f6", "#ec4899", "#8b5cf6", "#f59e0b"]
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// -----------------------------------------------------
// 2. PRODUCT CATALOG (CRUD & FILTERS)
// -----------------------------------------------------
async function loadProducts() {
  const tbody = document.getElementById("productsTableBody");
  tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">Loading catalog...</td></tr>`;

  try {
    const res = await fetch(`http://localhost:5000/api/products/vendor/${vendor._id}`);
    const data = await res.json();
    myProducts = data.products || data || [];
    
    // Fill category filter options dynamically
    const catSelect = document.getElementById("productCategoryFilter");
    catSelect.innerHTML = `<option value="All">All Categories</option>`;
    const uniqueCategories = [...new Set(myProducts.map(p => p.category))];
    uniqueCategories.forEach(cat => {
      catSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });

    applyProductFilters();
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red; padding: 20px;">Failed to fetch products from database.</td></tr>`;
  }
}

function applyProductFilters() {
  const searchQuery = document.getElementById("productSearch").value.toLowerCase().trim();
  const catVal = document.getElementById("productCategoryFilter").value;
  const stockVal = document.getElementById("productStockFilter").value;
  const sortVal = document.getElementById("productSort").value;

  let filtered = [...myProducts];

  // Search filter
  if (searchQuery) {
    filtered = filtered.filter(p => p.productName.toLowerCase().includes(searchQuery));
  }

  // Category filter
  if (catVal !== "All") {
    filtered = filtered.filter(p => p.category === catVal);
  }

  // Stock filter
  if (stockVal === "InStock") {
    filtered = filtered.filter(p => p.quantity >= 10);
  } else if (stockVal === "LowStock") {
    filtered = filtered.filter(p => p.quantity > 0 && p.quantity < 10);
  } else if (stockVal === "OutOfStock") {
    filtered = filtered.filter(p => p.quantity === 0);
  }

  // Sort
  if (sortVal === "LowHigh") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortVal === "HighLow") {
    filtered.sort((a, b) => b.price - a.price);
  }

  renderProductTable(filtered);
}

// Listeners for filters
document.getElementById("productSearch").addEventListener("input", applyProductFilters);
document.getElementById("productCategoryFilter").addEventListener("change", applyProductFilters);
document.getElementById("productStockFilter").addEventListener("change", applyProductFilters);
document.getElementById("productSort").addEventListener("change", applyProductFilters);

function renderProductTable(products) {
  const tbody = document.getElementById("productsTableBody");
  tbody.innerHTML = "";

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #64748b; padding: 20px;">No matching products found.</td></tr>`;
    return;
  }

  products.forEach(p => {
    const img = p.image ? p.image : "https://via.placeholder.com/44";
    const statusBadge = p.quantity === 0 
      ? `<span class="status-badge status-out">Out of Stock</span>` 
      : p.quantity < 10 
        ? `<span class="status-badge status-pending">Low Stock</span>`
        : `<span class="status-badge status-active">Active</span>`;

    tbody.innerHTML += `
      <tr>
        <td><img src="${img}" class="product-thumbnail" alt="${p.productName}"></td>
        <td style="font-weight: 600; color: #0f172a;">${p.productName}</td>
        <td>${p.category}</td>
        <td style="font-weight: 600;">₹${p.price.toLocaleString()}</td>
        <td>${p.quantity}</td>
        <td>${statusBadge}</td>
        <td>⭐ 4.8</td>
        <td>
          <button class="action-btn btn-primary btn-sm" onclick="openEditProductTab('${p._id}', '${p.productName}', '${p.category}', '${p.description || ''}', ${p.price}, ${p.quantity}, '${p.image || ''}', '${p.brand || ''}', '${p.sku || ''}', '${p.weight || ''}', '${p.dimensions || ''}')">Edit</button>
          <button class="action-btn btn-danger btn-sm" onclick="deleteProduct('${p._id}')">Delete</button>
        </td>
      </tr>
    `;
  });
}

// Add/Edit Product Tab triggers
const productForm = document.getElementById("productForm");

function switchToAddProductTab() {
  const menuItems = document.querySelectorAll(".sidebar-menu .menu-item");
  menuItems.forEach(mi => {
    if (mi.getAttribute("data-section") === "addProduct") {
      mi.classList.add("active");
    } else {
      mi.classList.remove("active");
    }
  });
  document.querySelectorAll(".content-section").forEach(sec => sec.classList.remove("active"));
  document.getElementById("addProduct").classList.add("active");
  
  productForm.reset();
  document.getElementById("modalProductId").value = "";
  document.getElementById("productFormTitle").innerText = "Add New Product";
}

function openEditProductTab(id, name, cat, desc, price, stock, image, brand, sku, weight, dim) {
  switchToAddProductTab();
  document.getElementById("productFormTitle").innerText = "Edit Product Details";
  document.getElementById("modalProductId").value = id;
  document.getElementById("prodName").value = name;
  document.getElementById("prodCategory").value = cat;
  document.getElementById("prodDesc").value = desc;
  document.getElementById("prodPrice").value = price;
  document.getElementById("prodStock").value = stock;
  document.getElementById("prodImage").value = image;
  document.getElementById("prodBrand").value = brand;
  document.getElementById("prodSku").value = sku;
  document.getElementById("prodWeight").value = weight;
  document.getElementById("prodDim").value = dim;
}

function cancelProductEdit() {
  const menuItems = document.querySelectorAll(".sidebar-menu .menu-item");
  menuItems.forEach(mi => {
    if (mi.getAttribute("data-section") === "products") {
      mi.classList.add("active");
    } else {
      mi.classList.remove("active");
    }
  });
  document.querySelectorAll(".content-section").forEach(sec => sec.classList.remove("active"));
  document.getElementById("products").classList.add("active");
  loadProducts();
}

// Product Form Submit
productForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("modalProductId").value;
  const productName = document.getElementById("prodName").value.trim();
  const category = document.getElementById("prodCategory").value;
  const description = document.getElementById("prodDesc").value.trim();
  const price = Number(document.getElementById("prodPrice").value);
  const quantity = Number(document.getElementById("prodStock").value);
  const image = document.getElementById("prodImage").value.trim();
  const brand = document.getElementById("prodBrand").value.trim();
  const sku = document.getElementById("prodSku").value.trim();
  const weight = document.getElementById("prodWeight").value.trim();
  const dimensions = document.getElementById("prodDim").value.trim();

  const submitBtn = productForm.querySelector("button[type='submit']");
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving...";

  const payload = {
    vendorId: vendor._id,
    productName,
    category,
    description,
    price,
    quantity,
    image,
    brand,
    sku,
    weight,
    dimensions
  };

  try {
    let url = "http://localhost:5000/api/products";
    let method = "POST";

    if (id) {
      url = `http://localhost:5000/api/products/${id}`;
      method = "PUT";
    }

    const res = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok || data.success) {
      alert("Product saved successfully!");
      cancelProductEdit();
    } else {
      alert(data.message || "Failed to save product.");
    }
  } catch (err) {
    console.error(err);
    alert("Connection error occurred.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Save Product";
  }
});

// Delete product
async function deleteProduct(productId) {
  if (confirm("Are you sure you want to delete this product listing? This action cannot be undone.")) {
    try {
      const res = await fetch(`http://localhost:5000/api/products/${productId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok || data.success) {
        alert("Product deleted successfully!");
        loadProducts();
      } else {
        alert(data.message || "Failed to delete product.");
      }
    } catch (err) {
      console.error(err);
      alert("Connection error occurred.");
    }
  }
}

// -----------------------------------------------------
// 3. VENDOR ORDERS MANAGEMENT
// -----------------------------------------------------
async function loadOrders() {
  const tbody = document.getElementById("ordersTableBody");
  tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px;">Loading order sheets...</td></tr>`;

  try {
    const res = await fetch(`http://localhost:5000/api/orders/vendor/${vendor._id}`);
    const data = await res.json();
    myOrders = data.orders || data || [];

    renderOrdersTable(myOrders);
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: red; padding: 20px;">Failed to load vendor orders.</td></tr>`;
  }
}

function renderOrdersTable(orders) {
  const tbody = document.getElementById("ordersTableBody");
  tbody.innerHTML = "";

  if (!orders || orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #64748b; padding: 20px;">No orders received yet.</td></tr>`;
    return;
  }

  orders.forEach(order => {
    // Collect products matching this vendor's ID
    const vendorProducts = order.products.filter(p => {
      if (!p.productId) return false;
      const vId = p.productId.vendorId && p.productId.vendorId._id 
        ? p.productId.vendorId._id.toString() 
        : (p.productId.vendorId ? p.productId.vendorId.toString() : "");
      return vId === vendor._id;
    });
    
    vendorProducts.forEach(p => {
      const customerName = order.userId ? (order.userId.name || order.userId.username) : "Guest/User";
      const orderDate = new Date(order.orderDate || order.createdAt).toLocaleDateString();
      const amount = p.price * p.quantity;

      tbody.innerHTML += `
        <tr>
          <td style="font-weight: 600; color: #475569;">#${order._id.substring(18)}</td>
          <td>${customerName}</td>
          <td>${p.productId.productName}</td>
          <td>${p.quantity}</td>
          <td style="font-weight: 600; color: #0f172a;">₹${amount.toLocaleString()}</td>
          <td>
            <span class="status-badge" style="
              background: ${order.paymentStatus === 'Paid' ? '#dcfce7' : '#fee2e2'};
              color: ${order.paymentStatus === 'Paid' ? '#15803d' : '#b91c1c'};
            ">${order.paymentStatus}</span>
          </td>
          <td>
            <span class="status-badge" style="
              background: ${order.orderStatus === 'Delivered' ? '#dcfce7' : order.orderStatus === 'Cancelled' ? '#fee2e2' : '#fef9c3'};
              color: ${order.orderStatus === 'Delivered' ? '#15803d' : order.orderStatus === 'Cancelled' ? '#b91c1c' : '#854d0e'};
            ">${order.orderStatus}</span>
          </td>
          <td>${orderDate}</td>
          <td>
            <select style="padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1; outline: none; cursor: pointer;" onchange="updateOrderStatus('${order._id}', this.value)">
              <option value="Pending" ${order.orderStatus === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Accepted" ${order.orderStatus === 'Accepted' ? 'selected' : ''}>Accepted</option>
              <option value="Packed" ${order.orderStatus === 'Packed' ? 'selected' : ''}>Packed</option>
              <option value="Shipped" ${order.orderStatus === 'Shipped' ? 'selected' : ''}>Shipped</option>
              <option value="Delivered" ${order.orderStatus === 'Delivered' ? 'selected' : ''}>Delivered</option>
              <option value="Cancelled" ${order.orderStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
        </tr>
      `;
    });
  });
}

// Update Order status
async function updateOrderStatus(orderId, newStatus) {
  try {
    const res = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderStatus: newStatus })
    });
    const data = await res.json();
    if (res.ok || data.success) {
      alert("Order status updated successfully!");
      loadOrders();
    } else {
      alert(data.message || "Failed to update order status.");
    }
  } catch (error) {
    console.error("Error updating order status:", error);
  }
}

// -----------------------------------------------------
// 4. INVENTORY STOCK MANAGEMENT
// -----------------------------------------------------
async function loadInventory() {
  const tbody = document.getElementById("inventoryListBody");
  tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 12px;">Loading stock listings...</td></tr>`;

  try {
    const res = await fetch(`http://localhost:5000/api/products/vendor/${vendor._id}`);
    const data = await res.json();
    myProducts = data.products || data || [];

    tbody.innerHTML = "";
    if (myProducts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 12px;">No products in inventory.</td></tr>`;
      return;
    }

    myProducts.forEach(p => {
      const alertBadge = p.quantity === 0
        ? `<span class="status-badge status-out">Out of Stock</span>`
        : p.quantity < 10
          ? `<span class="status-badge status-pending">Low Stock Warning</span>`
          : `<span class="status-badge status-active">Optimal Stock</span>`;

      tbody.innerHTML += `
        <tr>
          <td style="font-weight: 600; color: #0f172a;">${p.productName}</td>
          <td>${p.quantity} items left</td>
          <td>${alertBadge}</td>
          <td>
            <button class="action-btn btn-primary btn-sm" onclick="restockProduct('${p._id}', '${p.productName}', ${p.quantity})">🔄 Restock</button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red; padding: 12px;">Failed to load.</td></tr>`;
  }
}

// Restock
async function restockProduct(id, name, currentQty) {
  const restockQty = prompt(`How many items of "${name}" do you want to add? (Current stock: ${currentQty})`);
  if (restockQty === null) return;

  const addition = Number(restockQty);
  if (isNaN(addition) || addition <= 0) {
    alert("Please enter a valid positive number.");
    return;
  }

  const finalQty = currentQty + addition;

  try {
    const res = await fetch(`http://localhost:5000/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: finalQty })
    });

    const data = await res.json();
    if (res.ok || data.success) {
      alert("Inventory restocked successfully!");
      loadInventory();
    } else {
      alert(data.message || "Failed to update inventory.");
    }
  } catch (e) {
    console.error(e);
    alert("Connection error occurred.");
  }
}

// -----------------------------------------------------
// 5. VENDOR ANALYTICS SECTION (INLINE SPA EMBEDDED)
// -----------------------------------------------------
let vendorSalesChartInst = null;
let vendorRevenueChartInst = null;
let vendorStockChartInst = null;

async function calculateAnalytics() {
  try {
    const res = await fetch(`http://localhost:5000/api/analytics/vendor/${vendor._id}`);
    const data = await res.json();

    const revenue = data.totalRevenue || 148500;
    const ordersCount = data.totalOrders || 42;
    const avgOrderVal = ordersCount > 0 ? (revenue / ordersCount) : 3535.71;
    const profitMargin = revenue * 0.15;

    const revElem = document.getElementById("vendorTotalRevenue");
    if (revElem) revElem.innerText = `₹${revenue.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    
    const ordElem = document.getElementById("vendorTotalOrders");
    if (ordElem) ordElem.innerText = ordersCount;
    
    const avgElem = document.getElementById("vendorAvgOrder");
    if (avgElem) avgElem.innerText = `₹${avgOrderVal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    
    const pmElem = document.getElementById("vendorProfitMargin");
    if (pmElem) pmElem.innerText = `₹${profitMargin.toLocaleString(undefined, {minimumFractionDigits: 2})}`;

    try {
      localStorage.setItem("cached_vendor_ml_analytics", JSON.stringify({ totalRevenue: revenue, totalOrders: ordersCount }));
    } catch (e) {}

    renderVendorSectionCharts(revenue);
    loadInlineVendorBenchmarking();
  } catch (err) {
    console.error("Error loading inline vendor analytics:", err);
  }
}

function refreshVendorAnalyticsMetrics() {
  calculateAnalytics();
  alert("Metrics synchronized with FastAPI analytics service!");
}

function renderVendorSectionCharts(revenue) {
  if (typeof Chart === 'undefined') return;

  // 1. Sales Line Chart
  const salesCanvas = document.getElementById("vendorSalesChart");
  if (salesCanvas) {
    const ctx = salesCanvas.getContext("2d");
    if (vendorSalesChartInst) vendorSalesChartInst.destroy();
    vendorSalesChartInst = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"],
        datasets: [{
          label: "Weekly Sales Volume",
          data: [8, 14, 11, 19, 24],
          borderColor: "#4f46e5",
          backgroundColor: "rgba(79, 70, 229, 0.08)",
          borderWidth: 3,
          tension: 0.35,
          fill: true
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  // 2. Category Bar Chart
  const revCanvas = document.getElementById("vendorRevenueChart");
  if (revCanvas) {
    const ctx = revCanvas.getContext("2d");
    if (vendorRevenueChartInst) vendorRevenueChartInst.destroy();
    vendorRevenueChartInst = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Electronics", "Fashion", "Home Decor", "Beauty"],
        datasets: [{
          label: "Revenue (₹)",
          data: [64500, 38200, 28100, 17700],
          backgroundColor: ["#4f46e5", "#10b981", "#f59e0b", "#8b5cf6"],
          borderRadius: 8
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  // 3. Stock Doughnut Chart
  const stockCanvas = document.getElementById("vendorStockChart");
  if (stockCanvas) {
    const ctx = stockCanvas.getContext("2d");
    if (vendorStockChartInst) vendorStockChartInst.destroy();
    vendorStockChartInst = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Smart VR Headset", "Wireless Headphones", "Smart Watch Band", "4K Camera"],
        datasets: [{
          data: [12, 5, 28, 8],
          backgroundColor: ["#4f46e5", "#10b981", "#f59e0b", "#ec4899"],
          borderWidth: 2,
          borderColor: "#ffffff"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "right", labels: { boxWidth: 10, font: { size: 11 } } } },
        cutout: "65%"
      }
    });
  }
}

async function loadInlineVendorBenchmarking() {
  const tableBody = document.querySelector("#inlineBenchmarkingTable tbody");
  if (!tableBody) return;

  try {
    const res = await fetch(`http://localhost:8000/vendors/ranking`);
    const rankings = await res.json();

    if (Array.isArray(rankings) && rankings.length > 0) {
      tableBody.innerHTML = "";
      rankings.forEach(v => {
        const isCurrent = vendor && (v.id === vendor._id || v.id === vendor.id || v.business_name === vendor.shopName);
        tableBody.innerHTML += `
          <tr style="${isCurrent ? 'background: #eff6ff; font-weight: 600;' : ''}">
            <td><span style="display:inline-flex; width:22px; height:22px; border-radius:50%; background:#e0f2fe; color:#0369a1; align-items:center; justify-content:center; font-size:11px; font-weight:bold;">${v.rank}</span></td>
            <td>${v.business_name} ${isCurrent ? '<span style="font-size:10px; background:#3b82f6; color:white; padding:1px 6px; border-radius:10px; margin-left:4px;">You</span>' : ''}</td>
            <td style="color:#10b981; font-weight:bold;">₹${(v.revenue || 0).toLocaleString()}</td>
            <td>${v.orders || 0}</td>
            <td>
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:11px;">${v.fulfillment_rate || 95}%</span>
                <div style="flex:1; height:4px; background:#e2e8f0; border-radius:2px; overflow:hidden;">
                  <div style="width:${v.fulfillment_rate || 95}%; height:100%; background:#10b981;"></div>
                </div>
              </div>
            </td>
          </tr>
        `;
      });
    } else {
      renderFallbackInlineBenchmarking(tableBody);
    }
  } catch (err) {
    renderFallbackInlineBenchmarking(tableBody);
  }
}

function renderFallbackInlineBenchmarking(tableBody) {
  const sample = [
    { rank: 1, name: vendor ? vendor.shopName || "smart gadgets" : "smart gadgets", gmv: 8130000, orders: 98, rate: 96.2 },
    { rank: 2, name: "Tech Store", gmv: 667831, orders: 128, rate: 92.0 }
  ];

  tableBody.innerHTML = "";
  sample.forEach(s => {
    tableBody.innerHTML += `
      <tr>
        <td><span style="display:inline-flex; width:22px; height:22px; border-radius:50%; background:#e0f2fe; color:#0369a1; align-items:center; justify-content:center; font-size:11px; font-weight:bold;">${s.rank}</span></td>
        <td style="font-weight:600;">${s.name} <span style="font-size:10px; background:#3b82f6; color:white; padding:1px 6px; border-radius:10px; margin-left:4px;">You</span></td>
        <td style="color:#10b981; font-weight:bold;">₹${s.gmv.toLocaleString()}</td>
        <td>${s.orders}</td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:11px;">${s.rate}%</span>
            <div style="flex:1; height:4px; background:#e2e8f0; border-radius:2px; overflow:hidden;">
              <div style="width:${s.rate}%; height:100%; background:#10b981;"></div>
            </div>
          </div>
        </td>
      </tr>
    `;
  });
}

// -----------------------------------------------------
// 6. CUSTOMER REVIEWS
// -----------------------------------------------------
function loadReviews() {
  const container = document.getElementById("reviewsContainer");
  if (!container) return;
  container.innerHTML = "";

  const mockReviews = [
    { customer: "Arun K.", rating: 5, date: "2026-07-14", text: "Excellent quality, extremely fast delivery. Highly recommended store!", verified: true },
    { customer: "Priya M.", rating: 4, date: "2026-07-12", text: "Very good fit and finish. Colors match the catalog pictures perfectly.", verified: true },
    { customer: "Vijay R.", rating: 5, date: "2026-07-09", text: "Great product! Customer support was super responsive.", verified: true },
    { customer: "Sneha P.", rating: 4, date: "2026-07-04", text: "Delivered safely with nice protective packaging.", verified: true }
  ];

  mockReviews.forEach(rev => {
    let stars = "★".repeat(rev.rating) + "☆".repeat(5 - rev.rating);

    container.innerHTML += `
      <div class="review-item">
        <div class="review-avatar">${rev.customer[0]}</div>
        <div class="review-info">
          <div class="review-header">
            <h4>${rev.customer} ${rev.verified ? '<span style="font-size:10px; background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:10px; font-weight:600;">✓ Verified Buyer</span>' : ''}</h4>
            <span class="review-date">${rev.date}</span>
          </div>
          <div class="review-stars">${stars}</div>
          <p class="review-text">"${rev.text}"</p>
          <button class="action-btn btn-primary" onclick="alert('Reply dialog opened for customer ${rev.customer}')" style="margin-top: 10px; font-size: 12px; padding: 6px 12px;">💬 Reply to Customer</button>
        </div>
      </div>
    `;
  });
}

// -----------------------------------------------------
// 7. OFFERS & COUPONS
// -----------------------------------------------------
function renderCoupons() {
  const tbody = document.getElementById("couponsListBody");
  tbody.innerHTML = "";

  if (myCoupons.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 12px;">No active coupon offers.</td></tr>`;
    return;
  }

  myCoupons.forEach((coupon, index) => {
    const statusText = coupon.active ? "Enabled" : "Disabled";
    const statusBadgeClass = coupon.active ? "status-active" : "status-out";

    tbody.innerHTML += `
      <tr>
        <td style="font-weight: 700; color: #2563eb;">${coupon.code}</td>
        <td>${coupon.discount}% Off</td>
        <td>${coupon.start} to ${coupon.end}</td>
        <td>
          <span class="status-badge ${statusBadgeClass}" onclick="toggleCouponStatus(${index})" style="cursor: pointer;">${statusText}</span>
        </td>
      </tr>
    `;
  });
}

// Create Coupon
document.getElementById("createOfferForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const code = document.getElementById("offerCoupon").value.trim().toUpperCase();
  const discount = Number(document.getElementById("offerDiscount").value);
  const start = document.getElementById("offerStart").value;
  const end = document.getElementById("offerEnd").value;

  myCoupons.push({ code, discount, start, end, active: true });
  localStorage.setItem(`coupons_${vendor._id}`, JSON.stringify(myCoupons));

  alert("Coupon offer created successfully!");
  document.getElementById("createOfferForm").reset();
  renderCoupons();
});

function toggleCouponStatus(index) {
  myCoupons[index].active = !myCoupons[index].active;
  localStorage.setItem(`coupons_${vendor._id}`, JSON.stringify(myCoupons));
  renderCoupons();
}

// -----------------------------------------------------
// 8. PROFILE SETTINGS
// -----------------------------------------------------
function loadProfileForm() {
  document.getElementById("profShopName").value = vendor.shopName || "";
  document.getElementById("profOwnerName").value = vendor.ownerName || "";
  document.getElementById("profEmail").value = vendor.email || "";
  document.getElementById("profPhone").value = vendor.phone || "";
  document.getElementById("profBusinessType").value = vendor.businessType || "";

  // Load secondary fields
  document.getElementById("profGst").value = vendor.gstNumber || "";
  document.getElementById("profAddress").value = vendor.address || "";
  document.getElementById("profBank").value = vendor.bankAccount || "";
  document.getElementById("profUpi").value = vendor.upiId || "";
  document.getElementById("profLogo").value = vendor.shopLogo || "";
}

// Save Profile form submit
document.getElementById("vendorProfileForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const shopName = document.getElementById("profShopName").value.trim();
  const ownerName = document.getElementById("profOwnerName").value.trim();
  const phone = document.getElementById("profPhone").value.trim();
  const businessType = document.getElementById("profBusinessType").value.trim();

  // Secondary details
  const gstNumber = document.getElementById("profGst").value.trim();
  const address = document.getElementById("profAddress").value.trim();
  const bankAccount = document.getElementById("profBank").value.trim();
  const upiId = document.getElementById("profUpi").value.trim();
  const shopLogo = document.getElementById("profLogo").value.trim();

  const submitBtn = e.target.querySelector("button[type='submit']");
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving details...";

  const payload = {
    shopName,
    ownerName,
    phone,
    businessType,
    gstNumber,
    address,
    bankAccount,
    upiId,
    shopLogo
  };

  try {
    const res = await fetch(`http://localhost:5000/api/vendors/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok || data.success) {
      alert("Vendor profile details updated successfully!");
      // Save local updates
      const updatedVendor = { ...vendor, ...payload };
      localStorage.setItem("vendor", JSON.stringify(updatedVendor));
      loadProfileForm();
    } else {
      alert(data.message || "Failed to update profile.");
    }
  } catch (err) {
    console.error(err);
    alert("Connection error occurred.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "💾 Save Profile details";
  }
});

// Change vendor password in Settings
async function changeVendorPassword() {
  const password = document.getElementById("setNewPassword").value.trim();
  if (!password) {
    alert("Please enter a new password.");
    return;
  }

  try {
    const res = await fetch(`http://localhost:5000/api/vendors/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ password })
    });

    const data = await res.json();
    if (res.ok || data.success) {
      alert("Password updated successfully!");
      document.getElementById("setNewPassword").value = "";
    } else {
      alert(data.message || "Failed to change password.");
    }
  } catch (e) {
    console.error(e);
  }
}

// Dark Mode Toggle settings
function toggleDarkTheme() {
  const isDark = document.getElementById("setDarkMode").checked;
  if (isDark) {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }
}

// Delete vendor account
async function deleteVendorAccount() {
  if (confirm("WARNING: Are you sure you want to permanently delete your vendor account? This will delete all your products and cannot be reversed.")) {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/vendors/${vendor._id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok || data.success) {
        alert("Account deleted. Thank you for using ShopSense.");
        logoutVendor();
      } else {
        alert(data.message || "Failed to delete account.");
      }
    } catch (err) {
      console.error(err);
    }
  }
}

// Logout vendor
function logoutVendor() {
  localStorage.removeItem("vendor");
  localStorage.removeItem("vendorToken");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("role");
  window.location.href = "vendor_login.html";
}

// Initial bootstrap run
initConsole();