// Admin Analytics operations, Chart.js rendering, and dynamic tables

let inventoryTrendChart = null;

const API_BASE = (window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? (window.location.origin.includes(":5000") ? window.location.origin : "http://localhost:5000")
    : "";

function switchTab(tabId, evt) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    if (evt && evt.currentTarget) {
        evt.currentTarget.classList.add('active');
    }
}

async function loadAnalyticsData() {
    await Promise.all([
        fetchInventoryDashboard(),
        fetchInventoryForecasts(),
        fetchInventoryLogs(),
        fetchCustomerSegments(),
        fetchValidationMetrics(),
        fetchRecommendations(),
        fetchTopProductsAndVendors()
    ]);
}

// 1. Fetch Inventory Intelligence Metrics & Logs
async function fetchInventoryDashboard() {
    try {
        const res = await fetch(`${API_BASE}/api/inventory/dashboard`);
        const data = await res.json();
        if (data.success && data.metrics) {
            const m = data.metrics;
            
            document.getElementById("invTotalProds").textContent = m.totalProducts || 0;
            document.getElementById("invTotalUnits").textContent = (m.totalAvailableStock || 0) + " units";
            document.getElementById("invLowCount").textContent = m.lowStockCount || 0;
            document.getElementById("invOutCount").textContent = m.outOfStockCount || 0;
            document.getElementById("restockCount").textContent = (m.lowStockCount || 0) + (m.outOfStockCount || 0);
            
            const formattedVal = "₹" + (m.currentInventoryValue || 0).toLocaleString();
            document.getElementById("topInventoryValue").textContent = formattedVal;

            // Populate Product Selection dropdown for Stock Adjustment
            const selectEl = document.getElementById("adjustProductSelect");
            if (selectEl && m.products) {
                selectEl.innerHTML = '<option value="">Select Product to Edit...</option>';
                m.products.forEach(p => {
                    const prodName = p.productName || p.name;
                    selectEl.innerHTML += `<option value="${p._id}">${prodName} (Current: ${p.quantity !== undefined ? p.quantity : (p.stock || 0)})</option>`;
                });
            }

            // Render Product-wise Stock Table
            const tableBody = document.querySelector("#invStatusTable tbody");
            if (tableBody && m.products) {
                tableBody.innerHTML = "";
                m.products.forEach(p => {
                    const prodName = p.productName || p.name;
                    const stock = p.quantity !== undefined ? p.quantity : (p.stock || 0);
                    const minStock = p.minStockLevel || 10;
                    const invVal = "₹" + (stock * p.price).toLocaleString();
                    
                    let badge = "";
                    if (stock <= 0) {
                        badge = `<span class="badge badge-danger">Out of Stock</span>`;
                    } else if (stock <= minStock) {
                        badge = `<span class="badge badge-warning">Low Stock (≤${minStock})</span>`;
                    } else {
                        badge = `<span class="badge badge-success">In Stock</span>`;
                    }

                    tableBody.innerHTML += `
                        <tr>
                            <td><strong>${prodName}</strong></td>
                            <td>${p.category}</td>
                            <td>₹${p.price}</td>
                            <td style="font-weight:700;">${stock} units</td>
                            <td>${p.soldQuantity || 0} units</td>
                            <td>${invVal}</td>
                            <td>${badge}</td>
                        </tr>
                    `;
                });
            }

            // Render Inventory Trend Chart
            if (m.inventoryTrend && document.getElementById("inventoryTrendChart")) {
                const ctx = document.getElementById("inventoryTrendChart").getContext("2d");
                if (inventoryTrendChart) inventoryTrendChart.destroy();
                inventoryTrendChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: m.inventoryTrend.map(t => t.month),
                        datasets: [{
                            label: 'Units Sold',
                            data: m.inventoryTrend.map(t => t.unitsSold),
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            fill: true,
                            tension: 0.3
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } }
                    }
                });
            }
        }
    } catch (err) {
        console.error("Error loading inventory dashboard:", err);
    }
}

// Submit Manual Stock Level Adjustment
async function submitStockAdjustment() {
    const productId = document.getElementById("adjustProductSelect").value;
    const newStock = document.getElementById("adjustNewStock").value;
    const minStockLevel = document.getElementById("adjustMinLevel").value;

    if (!productId || newStock === "") {
        alert("Please select a product and enter the new stock quantity.");
        return;
    }

    try {
        const res = await fetch("http://localhost:5000/api/inventory/adjust", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                productId,
                newStock: parseInt(newStock, 10),
                minStockLevel: minStockLevel !== "" ? parseInt(minStockLevel, 10) : undefined,
                note: "Manual admin stock level update"
            })
        });

        const data = await res.json();
        if (data.success) {
            alert("Success: Product stock level updated!");
            document.getElementById("adjustNewStock").value = "";
            document.getElementById("adjustMinLevel").value = "";
            await Promise.all([fetchInventoryDashboard(), fetchInventoryLogs(), fetchInventoryForecasts()]);
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        console.error("Error adjusting stock:", err);
        alert("Failed to connect to stock adjustment endpoint.");
    }
}

// Fetch Audit Logs
async function fetchInventoryLogs() {
    const logTable = document.querySelector("#invLogTable tbody");
    if (!logTable) return;
    try {
        const res = await fetch("http://localhost:5000/api/inventory/logs");
        const data = await res.json();
        if (data.success && data.logs) {
            logTable.innerHTML = "";
            if (data.logs.length === 0) {
                logTable.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#64748b; padding:16px;">No stock movement logs recorded yet.</td></tr>`;
                return;
            }
            data.logs.slice(0, 15).forEach(l => {
                const prodName = l.productId ? (l.productId.productName || l.productId.name) : "Deleted Item";
                const dateStr = new Date(l.createdAt).toLocaleString();
                
                let badge = "";
                if (l.changeType === "PURCHASE_DEDUCTION") badge = `<span class="badge badge-danger">Deduction</span>`;
                else if (l.changeType === "ORDER_CANCELLED") badge = `<span class="badge badge-success">Restored (Cancelled)</span>`;
                else badge = `<span class="badge badge-info">${l.changeType}</span>`;

                const changeText = l.quantityChange > 0 ? `+${l.quantityChange}` : `${l.quantityChange}`;

                logTable.innerHTML += `
                    <tr>
                        <td style="font-size:12px; color:#64748b;">${dateStr}</td>
                        <td><strong>${prodName}</strong></td>
                        <td>${badge}</td>
                        <td style="font-weight:bold; color:${l.quantityChange > 0 ? '#15803d' : '#b91c1c'};">${changeText}</td>
                        <td>${l.previousStock}</td>
                        <td><strong>${l.newStock}</strong></td>
                        <td style="font-size:12px; color:#475569;">${l.note || '-'}</td>
                    </tr>
                `;
            });
        }
    } catch (err) {
        console.error("Error loading inventory logs:", err);
    }
}

// 2. Fetch Demand Forecasting Metrics
async function fetchInventoryForecasts() {
    const tableBody = document.querySelector("#forecastTable tbody");
    try {
        const response = await fetch(`${API_BASE}/api/inventory/forecasts`);
        const data = await response.json();
        
        if (data.success && data.forecasts && data.forecasts.length > 0) {
            tableBody.innerHTML = "";
            
            data.forecasts.forEach(f => {
                const product = f.productId || { productName: "Deleted Product", quantity: 0, category: "N/A" };
                const currentStock = product.quantity !== undefined ? product.quantity : (product.stock !== undefined ? product.stock : 0);
                const prodName = product.productName || product.name || "Deleted Product";
                const predictedSales = f.predictedStock || 0;
                
                let statusBadge = "";
                if (currentStock < predictedSales) {
                    statusBadge = `<span class="badge badge-danger">⚠️ Under Stocked (Short ${predictedSales - currentStock})</span>`;
                } else if (currentStock <= predictedSales * 1.3) {
                    statusBadge = `<span class="badge badge-warning">⚡ Optimal (Low Buffer)</span>`;
                } else {
                    statusBadge = `<span class="badge badge-success">✅ Healthy</span>`;
                }

                const estDepletionDate = f.estimatedStockOutDate ? new Date(f.estimatedStockOutDate).toLocaleDateString() : "N/A";
                const daily = f.avgDailySales !== undefined ? f.avgDailySales : (predictedSales / 7).toFixed(1);
                const reorderQty = f.reorderQuantity !== undefined ? f.reorderQuantity : Math.max(0, predictedSales * 4 - currentStock);

                tableBody.innerHTML += `
                    <tr>
                        <td><strong>${prodName}</strong></td>
                        <td>${product.category || 'General'}</td>
                        <td style="font-weight: 600;">${currentStock} units</td>
                        <td>${daily} / day</td>
                        <td style="font-weight: 700; color: #2563eb;">${predictedSales} units (7d)</td>
                        <td><span style="color:#d97706; font-weight:600;">${estDepletionDate}</span></td>
                        <td><strong>${reorderQty} units</strong></td>
                        <td>${statusBadge}</td>
                    </tr>
                `;
            });
        } else {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #64748b; padding: 24px;">No forecasts calculated yet. Click "Recalculate Forecasts" above.</td></tr>`;
        }
    } catch (err) {
        console.error("Error loading inventory forecasts:", err);
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red; padding: 24px;">Failed to load forecasts. Ensure backend is running.</td></tr>`;
    }
}

// 3. Fetch Customer RFM Segments
async function fetchCustomerSegments() {
    const frequentBody = document.querySelector("#frequentTable tbody");
    const dormantBody = document.querySelector("#dormantTable tbody");
    
    try {
        const response = await fetch(`${API_BASE}/api/customers/segment`);
        const data = await response.json();
        
        if (data.success && data.segments) {
            const { frequentBuyers, dormantUsers, premium, gold, silver, regular } = data.segments;
            
            document.getElementById("frequentCount").textContent = frequentBuyers.length;
            document.getElementById("dormantCount").textContent = dormantUsers.length;
            
            if (premium) document.getElementById("segmentPremiumCount").textContent = premium.length;
            if (gold) document.getElementById("segmentGoldCount").textContent = gold.length;
            if (silver) document.getElementById("segmentSilverCount").textContent = silver.length;
            if (regular) document.getElementById("segmentRegularCount").textContent = regular.length;
            
            if (premium && document.getElementById("topPremiumCount")) {
                document.getElementById("topPremiumCount").textContent = premium.length;
            }

            // Render Frequent Buyers
            frequentBody.innerHTML = "";
            if (frequentBuyers.length > 0) {
                frequentBuyers.forEach(c => {
                    const spendStr = "₹" + (c.totalSpending || 0).toLocaleString();
                    frequentBody.innerHTML += `
                        <tr>
                            <td><strong>${c.name}</strong></td>
                            <td style="font-size:12px; color:#475569;">${c.email}</td>
                            <td style="font-weight: 700; color: #15803d; text-align: center;">${c.purchaseCount30Days}</td>
                            <td><strong>${spendStr}</strong></td>
                        </tr>
                    `;
                });
            } else {
                frequentBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 12px;">No active frequent buyers found.</td></tr>`;
            }
            
            // Render Dormant Users
            dormantBody.innerHTML = "";
            if (dormantUsers.length > 0) {
                dormantUsers.forEach(c => {
                    const spendStr = "₹" + (c.totalSpending || 0).toLocaleString();
                    dormantBody.innerHTML += `
                        <tr>
                            <td><strong>${c.name}</strong></td>
                            <td style="font-size:12px; color:#475569;">${c.email}</td>
                            <td style="font-weight: 500; color: #b91c1c; text-align: center;">${c.purchaseCount30Days}</td>
                            <td><strong>${spendStr}</strong></td>
                        </tr>
                    `;
                });
            } else {
                dormantBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 12px;">No dormant users.</td></tr>`;
            }
        }
    } catch (err) {
        console.error("Error loading customer segments:", err);
    }
}

// 4. Fetch Analytical Validation Metrics
async function fetchValidationMetrics() {
    try {
        const res = await fetch(`${API_BASE}/api/analytics/validation`);
        const data = await res.json();
        if (data.success && data.metrics) {
            const m = data.metrics;
            document.getElementById("topAccuracyVal").textContent = m.forecastAccuracy + "%";
            document.getElementById("valAccuracy").textContent = m.forecastAccuracy + "%";
            document.getElementById("valMAE").textContent = m.mae;
            document.getElementById("valRMSE").textContent = m.rmse;
            document.getElementById("valModelAcc").textContent = m.overallModelAccuracy + "%";

            const valTable = document.querySelector("#validationTable tbody");
            if (valTable && m.validationTable) {
                valTable.innerHTML = "";
                m.validationTable.forEach(item => {
                    valTable.innerHTML += `
                        <tr>
                            <td><strong>${item.productName}</strong></td>
                            <td>${item.category}</td>
                            <td style="font-weight:bold;">${item.actualSales7Days} units</td>
                            <td>${item.predictedSales7Days} units</td>
                            <td style="color:${item.predictionError === 0 ? '#15803d' : '#b91c1c'}; font-weight:bold;">${item.predictionError}</td>
                            <td><span class="badge badge-info">${item.accuracyPercentage}%</span></td>
                        </tr>
                    `;
                });
            }
        }
    } catch (err) {
        console.error("Error loading validation metrics:", err);
    }
}

// 5. Fetch Recommendations & Top Performers
async function fetchRecommendations() {
    const container = document.getElementById("adminRecContainer");
    if (!container) return;
    try {
        const res = await fetch(`${API_BASE}/api/recommendations?limit=4`);
        const data = await res.json();
        if (data.success && data.products) {
            container.innerHTML = "";
            data.products.forEach(p => {
                const prodName = p.productName || p.name;
                const img = p.image || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400";
                container.innerHTML += `
                    <div class="rec-card">
                        <img src="${img}" alt="${prodName}" class="rec-img">
                        <h4 style="font-size:14px; font-weight:bold; margin-bottom:4px; color:#0f172a;">${prodName}</h4>
                        <p style="font-size:12px; color:#64748b; margin-bottom:8px;">Category: ${p.category}</p>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-weight:bold; color:#15803d; font-size:15px;">₹${p.price}</span>
                            <span class="badge badge-purple">Recommended</span>
                        </div>
                    </div>
                `;
            });
        }
    } catch (err) {
        console.error("Error loading recommendations:", err);
    }
}

async function fetchTopProductsAndVendors() {
    try {
        const [prodRes, vendRes] = await Promise.all([
            fetch(`${API_BASE}/api/analytics/top-products`),
            fetch(`${API_BASE}/api/analytics/active-vendors`)
        ]);
        
        const prodData = await prodRes.json();
        const vendData = await vendRes.json();

        const prodTable = document.querySelector("#topSellingTable tbody");
        if (prodTable && prodData.success && prodData.products) {
            prodTable.innerHTML = "";
            prodData.products.forEach(p => {
                prodTable.innerHTML += `
                    <tr>
                        <td><strong>${p.productName}</strong></td>
                        <td>${p.category}</td>
                        <td style="font-weight:bold;">${p.totalQty}</td>
                        <td>₹${p.totalSales.toLocaleString()}</td>
                    </tr>
                `;
            });
        }

        const vendTable = document.querySelector("#topVendorTable tbody");
        if (vendTable && vendData.success && vendData.vendors) {
            vendTable.innerHTML = "";
            vendData.vendors.forEach(v => {
                vendTable.innerHTML += `
                    <tr>
                        <td><strong>${v.shopName}</strong></td>
                        <td>${v.ownerName}</td>
                        <td>${v.salesCount}</td>
                        <td style="font-weight:bold; color:#15803d;">₹${v.revenue.toLocaleString()}</td>
                    </tr>
                `;
            });
        }
    } catch (err) {
        console.error("Error loading top products and vendors:", err);
    }
}

// Pipelines execution
async function runForecastPipeline() {
    const btn = document.getElementById("btnRecalculateForecast");
    const originalText = btn.textContent;
    btn.textContent = "⚡ Running Forecasting...";
    btn.disabled = true;
    
    try {
        const res = await fetch(`${API_BASE}/api/inventory/forecast`);
        const data = await res.json();
        if (data.success) {
            alert("Success: Inventory forecasts generated and database metrics synced!");
            await Promise.all([fetchInventoryForecasts(), fetchValidationMetrics()]);
        } else {
            alert("Error running forecasts: " + data.error);
        }
    } catch (err) {
        console.error("Error running forecast pipeline:", err);
        alert("Failed to connect to forecast pipeline endpoint.");
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function runSegmentationPipeline() {
    const btn = document.getElementById("btnSyncCustomers");
    const originalText = btn.textContent;
    btn.textContent = "🎯 Processing Pipelines...";
    btn.disabled = true;
    
    try {
        const res = await fetch(`${API_BASE}/api/customers/segment`);
        const data = await res.json();
        if (data.success) {
            alert("Success: Customer transaction behaviors analyzed and segments recalculated!");
            await fetchCustomerSegments();
        } else {
            alert("Error segmenting customers: " + data.error);
        }
    } catch (err) {
        console.error("Error segmenting customer profiles:", err);
        alert("Failed to connect to customer behavior pipeline.");
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// Initial load on DOM ready
document.addEventListener("DOMContentLoaded", loadAnalyticsData);
