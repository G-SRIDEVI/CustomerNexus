// frontend/js/user_dashboard.js

let currentUser = JSON.parse(localStorage.getItem("user"));
if (!currentUser) {
    window.location.href = "user_login.html";
}

async function loadDashboardData() {
    loadUserProfile(); // from user.js
    
    const userId = currentUser._id;
    
    try {
        // 1. Fetch User details for reward points
        const userRes = await fetch(`http://localhost:5000/api/users/${userId}`);
        const userData = await userRes.json();
        if (userData.success) {
            currentUser = { ...currentUser, ...userData.user };
            localStorage.setItem("user", JSON.stringify(currentUser));
            document.getElementById("reward-points").textContent = currentUser.rewardPoints || 0;
        }

        // 2. Fetch Wishlist count
        const wishlistRes = await fetch(`http://localhost:5000/api/wishlist/${userId}`);
        const wishlistData = await wishlistRes.json();
        const wishlistCount = wishlistData.success ? wishlistData.items.length : 0;
        document.getElementById("wishlist-count").textContent = wishlistCount;

        // 3. Fetch Orders & spent amount
        const ordersRes = await fetch(`http://localhost:5000/api/orders/user/${userId}`);
        const ordersData = await ordersRes.json();
        
        let totalOrders = 0;
        let totalSpent = 0;
        let recentOrders = [];
        
        if (ordersData.success && ordersData.orders) {
            totalOrders = ordersData.orders.length;
            totalSpent = ordersData.orders
                .filter(o => o.orderStatus !== "Cancelled")
                .reduce((sum, o) => sum + o.totalAmount, 0);
            recentOrders = ordersData.orders.slice(0, 5); // top 5
        }
        
        document.getElementById("total-orders").textContent = totalOrders;
        document.getElementById("total-spent").textContent = `₹${totalSpent}`;

        // Populate Recent Orders Table
        const tbody = document.querySelector("#orders-table tbody");
        tbody.innerHTML = "";
        
        if (recentOrders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4">No Orders Yet</td></tr>`;
        } else {
            recentOrders.forEach(order => {
                const tr = document.createElement("tr");
                const itemsList = order.products.map(p => `${p.productName} (x${p.quantity})`).join(", ");
                tr.innerHTML = `
                    <td><strong>#${order._id.substring(18)}</strong></td>
                    <td style="max-width: 250px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${itemsList}</td>
                    <td><span class="status-badge status-${order.orderStatus.toLowerCase()}" style="padding: 4px 8px; border-radius: 4px; font-size:12px; font-weight:bold; background:${getStatusBg(order.orderStatus)}; color:white;">${order.orderStatus}</span></td>
                    <td>₹${order.totalAmount}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        // 4. Load Notifications
        await fetchNotifications();

        // 5. Load Recently Viewed Products
        loadRecentlyViewed();

        // 6. Load Recommendations
        loadRecommendations();

    } catch (err) {
        console.error("Dashboard error:", err);
    }
}

function getStatusBg(status) {
    switch (status) {
        case "Processing": return "#3b82f6";
        case "Shipped": return "#f59e0b";
        case "Delivered": return "#10b981";
        case "Cancelled": return "#ef4444";
        default: return "#6b7280";
    }
}

// Notifications Handling
async function fetchNotifications() {
    try {
        const res = await fetch(`http://localhost:5000/api/notifications/user/${currentUser._id}`);
        const data = await res.json();
        
        const badge = document.getElementById("notif-badge");
        const list = document.getElementById("notif-list");
        
        if (data.success && data.notifications.length > 0) {
            const unread = data.notifications.filter(n => !n.isRead).length;
            if (unread > 0) {
                badge.style.display = "inline-block";
                badge.textContent = unread;
            } else {
                badge.style.display = "none";
            }
            
            list.innerHTML = "";
            data.notifications.forEach(n => {
                const div = document.createElement("div");
                div.style.padding = "10px 0";
                div.style.borderBottom = "1px solid #f1f5f9";
                div.style.display = "flex";
                div.style.justifyContent = "space-between";
                div.style.alignItems = "center";
                if (!n.isRead) {
                    div.style.fontWeight = "bold";
                }
                
                div.innerHTML = `
                    <div style="flex: 1; padding-right:10px;">
                        <div style="font-size:13px; color:#1e293b;">${n.title}</div>
                        <div style="font-size:11px; color:#64748b; margin-top:2px;">${n.message}</div>
                    </div>
                    <div>
                        ${!n.isRead ? `<button onclick="markAsRead('${n._id}', event)" style="padding: 2px 6px; font-size:10px; background:#e0f2fe; color:#0369a1; border:none; border-radius:4px; cursor:pointer;">Read</button>` : ""}
                    </div>
                `;
                list.appendChild(div);
            });
        } else {
            badge.style.display = "none";
            list.innerHTML = `<p style="color:#64748b; text-align:center; padding:10px 0;">No new alerts.</p>`;
        }
    } catch (err) {
        console.error(err);
    }
}

function toggleNotifications() {
    const dropdown = document.getElementById("notif-dropdown");
    dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
}

async function markAsRead(id, event) {
    event.stopPropagation();
    try {
        await fetch(`http://localhost:5000/api/notifications/${id}/read`, { method: "PUT" });
        await fetchNotifications();
    } catch (err) {
        console.error(err);
    }
}

async function clearAllNotifications(event) {
    event.preventDefault();
    try {
        const res = await fetch(`http://localhost:5000/api/notifications/user/${currentUser._id}`);
        const data = await res.json();
        if (data.success) {
            const promises = data.notifications.map(n => fetch(`http://localhost:5000/api/notifications/${n._id}`, { method: "DELETE" }));
            await Promise.all(promises);
            await fetchNotifications();
        }
    } catch (err) {
        console.error(err);
    }
}

// Recently Viewed
function loadRecentlyViewed() {
    const container = document.getElementById("recent-products-container");
    const viewedIds = JSON.parse(localStorage.getItem("recentlyViewed")) || [];
    
    if (viewedIds.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted); font-size:14px;">No recently viewed items.</p>`;
        return;
    }
    
    container.innerHTML = "";
    // Fetch products and show them
    viewedIds.slice(0, 4).forEach(async (id) => {
        try {
            const res = await fetch(`http://localhost:5000/api/products/${id}`);
            const data = await res.json();
            if (data.success && data.product) {
                const p = data.product;
                const div = document.createElement("div");
                div.className = "grid-product-card";
                
                div.innerHTML = `
                    <img src="${p.image || 'https://via.placeholder.com/150'}" alt="${p.productName}">
                    <h4>${p.productName}</h4>
                    <p>₹${p.price}</p>
                    <a href="product_details.html?id=${p._id}">View Details →</a>
                `;
                container.appendChild(div);
            }
        } catch (err) {
            console.error(err);
        }
    });
}

// Recommended Products
async function loadRecommendations() {
    const container = document.getElementById("recommended-products-container");
    try {
        const res = await fetch(`http://localhost:5000/api/recommendations?userId=${currentUser._id}&limit=4`);
        const data = await res.json();
        
        if (data.success && data.products && data.products.length > 0) {
            container.innerHTML = "";
            const recommended = data.products;
                
            recommended.forEach(p => {
                const div = document.createElement("div");
                div.className = "grid-product-card";
                
                let badgeHtml = "";
                if (p.discount > 0) {
                    badgeHtml = `<span class="discount-label">${p.discount}% OFF</span>`;
                }
                
                div.innerHTML = `
                    ${badgeHtml}
                    <img src="${p.image || 'https://via.placeholder.com/150'}" alt="${p.productName}">
                    <h4>${p.productName}</h4>
                    <p>₹${p.price} ${p.discount > 0 ? `<span style="font-size:11px; text-decoration:line-through; color:var(--text-muted); font-weight:normal; margin-left:5px;">₹${Math.round(p.price / (1 - p.discount/100))}</span>` : ""}</p>
                    <a href="product_details.html?id=${p._id}">View Details →</a>
                `;
                container.appendChild(div);
            });
        } else {
            container.innerHTML = `<p style="color:var(--text-muted); font-size:14px;">No recommendations available.</p>`;
        }
    } catch (err) {
        console.error(err);
    }
}
