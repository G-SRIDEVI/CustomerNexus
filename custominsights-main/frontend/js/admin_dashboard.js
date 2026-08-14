// Admin Dashboard dynamic statistics and charts loading
async function loadDashboardData() {
  try {
    // 1. Fetch dashboard overview metrics (including Total Users)
    const overviewRes = await fetch("http://localhost:5000/api/analytics/dashboard");
    const overviewData = await overviewRes.json();

    document.getElementById("usersCount").innerText = overviewData.totalUsers ?? 0;
    document.getElementById("productsCount").innerText = overviewData.totalProducts ?? 0;
    document.getElementById("vendorsCount").innerText = overviewData.totalVendors ?? 0;
    document.getElementById("ordersCount").innerText = overviewData.totalOrders ?? 0;
    document.getElementById("revenue").innerText = `₹${(overviewData.totalRevenue ?? 0).toLocaleString()}`;

    // 2. Fetch monthly revenue for Chart.js
    const monthlyRes = await fetch("http://localhost:5000/api/analytics/monthly");
    const monthlyData = await monthlyRes.json();

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const labels = [];
    const salesData = [];

    const monthlyMap = {};
    for (let i = 1; i <= 12; i++) {
      monthlyMap[i] = 0;
    }

    monthlyData.forEach(item => {
      if (item._id && item._id.month) {
        monthlyMap[item._id.month] = item.revenue || 0;
      }
    });

    for (let i = 1; i <= 12; i++) {
      labels.push(months[i - 1]);
      salesData.push(monthlyMap[i]);
    }

    const ctx = document.getElementById("salesChart").getContext("2d");
    new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "Monthly Revenue (₹)",
          data: salesData,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.05)",
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });

    // 3. Fetch Top Selling Products
    try {
      const topProductsRes = await fetch("http://localhost:5000/api/analytics/top-products");
      const topProductsData = await topProductsRes.json();
      const topProductsBody = document.getElementById("topProductsBody");
      topProductsBody.innerHTML = "";

      if (topProductsData.success && topProductsData.products && topProductsData.products.length > 0) {
        topProductsData.products.forEach(product => {
          const imgUrl = product.image ? product.image : "https://via.placeholder.com/32";
          topProductsBody.innerHTML += `
            <tr>
              <td>
                <img src="${imgUrl}" class="thumbnail-img" alt="${product.productName}">
                <span style="font-weight: 600; color: #0f172a;">${product.productName}</span>
              </td>
              <td>${product.totalQty} items</td>
              <td style="font-weight: 600; color: #1e293b;">₹${product.totalSales.toLocaleString()}</td>
            </tr>
          `;
        });
      } else {
        topProductsBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #64748b; padding: 12px;">No products sold yet.</td></tr>`;
      }
    } catch (err) {
      console.error("Error loading top products:", err);
    }

    // 4. Fetch Active Vendors
    try {
      const activeVendorsRes = await fetch("http://localhost:5000/api/analytics/active-vendors");
      const activeVendorsData = await activeVendorsRes.json();
      const activeVendorsBody = document.getElementById("activeVendorsBody");
      activeVendorsBody.innerHTML = "";

      if (activeVendorsData.success && activeVendorsData.vendors && activeVendorsData.vendors.length > 0) {
        activeVendorsData.vendors.forEach(vendor => {
          activeVendorsBody.innerHTML += `
            <tr>
              <td style="font-weight: 600; color: #0f172a;">${vendor.shopName}</td>
              <td>${vendor.ownerName}</td>
              <td style="font-weight: 600; color: #1e293b;">₹${vendor.revenue.toLocaleString()}</td>
            </tr>
          `;
        });
      } else {
        activeVendorsBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #64748b; padding: 12px;">No active vendors.</td></tr>`;
      }
    } catch (err) {
      console.error("Error loading active vendors:", err);
    }

    // 5. Fetch Low Stock Alerts for Inventory Intelligence Widget
    try {
      const compRes = await fetch("http://localhost:5000/api/analytics/comprehensive");
      const compData = await compRes.json();
      const lowStockBody = document.getElementById("lowStockBody");
      if (lowStockBody && compData.success && compData.summary) {
        const alerts = compData.summary.lowStockAlerts || [];
        lowStockBody.innerHTML = "";
        if (alerts.length > 0) {
          alerts.slice(0, 5).forEach(item => {
            lowStockBody.innerHTML += `
              <tr>
                <td><strong>${item.productName}</strong></td>
                <td>${item.category}</td>
                <td style="font-weight:bold; color:#b91c1c;">${item.stock} units</td>
                <td><span class="badge-danger">Low Stock (≤${item.minStockLevel})</span></td>
              </tr>
            `;
          });
        } else {
          lowStockBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#15803d; padding:12px;">✅ All inventory stock levels are healthy!</td></tr>`;
        }
      }
    } catch (err) {
      console.error("Error loading low stock alerts:", err);
    }

  } catch (error) {
    console.error("Error loading dashboard data:", error);
  }
}

// Initial load
loadDashboardData();
