// User Management Logic
let allUsers = [];

const tableBody = document.getElementById("userTableBody");
const searchInput = document.getElementById("searchUserInput");

// Edit Modal Elements
const editUserModal = document.getElementById("editUserModal");
const closeEditModalBtn = document.getElementById("closeEditModalBtn");
const editUserForm = document.getElementById("editUserForm");

// History Modal Elements
const historyModal = document.getElementById("historyModal");
const closeHistoryModalBtn = document.getElementById("closeHistoryModalBtn");
const historyTableBody = document.getElementById("historyTableBody");
const historyUserTitle = document.getElementById("historyUserTitle");

// Modal Controls
closeEditModalBtn.addEventListener("click", () => editUserModal.classList.remove("show"));
closeHistoryModalBtn.addEventListener("click", () => historyModal.classList.remove("show"));

window.addEventListener("click", (e) => {
  if (e.target === editUserModal) editUserModal.classList.remove("show");
  if (e.target === historyModal) historyModal.classList.remove("show");
});

// Load all users
async function loadUsers() {
  try {
    const res = await fetch("http://localhost:5000/api/admin/users");
    const data = await res.json();

    if (data.success) {
      allUsers = data.users || [];
      renderUsers(allUsers);
    } else {
      tableBody.innerHTML = `<tr><td colspan="8" style="color: red; padding: 20px;">Failed to load users: ${data.message}</td></tr>`;
    }
  } catch (error) {
    console.error("Error loading users:", error);
    tableBody.innerHTML = `<tr><td colspan="8" style="color: red; padding: 20px;">Failed to load users due to a connection error.</td></tr>`;
  }
}

// Render user list
function renderUsers(usersToRender) {
  tableBody.innerHTML = "";

  if (usersToRender.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8" style="padding: 20px; color: #64748b;">No users found.</td></tr>`;
    return;
  }

  usersToRender.forEach(user => {
    const displayName = user.name || user.username || "User";
    const statusBadge = user.isBlocked 
      ? `<span class="status-badge status-blocked">Blocked</span>` 
      : `<span class="status-badge status-active">Active</span>`;
    
    const blockBtnText = user.isBlocked ? "🔓 Unblock" : "🚫 Block";
    const lastLoginText = user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never";
    const spendingText = `₹${(user.totalSpending || 0).toLocaleString()}`;

    tableBody.innerHTML += `
      <tr>
        <td style="font-weight: 600; color: #334155;">${displayName}</td>
        <td>${user.email}</td>
        <td>${user.phone || 'N/A'}</td>
        <td>${new Date(user.createdAt).toLocaleDateString()}</td>
        <td>${lastLoginText}</td>
        <td style="font-weight: 600; color: #1e293b;">${spendingText}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn-action btn-edit" onclick="openEditModal('${user._id}', '${displayName}', '${user.email}', '${user.phone || ''}')">✏️ Edit</button>
          <button class="btn-action btn-block" onclick="toggleBlockStatus('${user._id}', ${user.isBlocked})">${blockBtnText}</button>
          <button class="btn-action btn-history" onclick="viewPurchaseHistory('${user._id}', '${displayName}')">📜 History</button>
          <button class="btn-action btn-delete" onclick="deleteUser('${user._id}')">🗑️ Delete</button>
        </td>
      </tr>
    `;
  });
}

// Filter users
if (searchInput) {
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase().trim();
    const filtered = allUsers.filter(user => {
      const name = (user.name || user.username || "").toLowerCase();
      const email = (user.email || "").toLowerCase();
      const phone = user.phone || "";
      return name.includes(query) || email.includes(query) || phone.includes(query);
    });
    renderUsers(filtered);
  });
}

// Open Edit Modal
function openEditModal(id, name, email, phone) {
  document.getElementById("editUserId").value = id;
  document.getElementById("editName").value = name;
  document.getElementById("editEmail").value = email;
  document.getElementById("editPhone").value = phone;
  editUserModal.classList.add("show");
}

// Edit Form Submit
editUserForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("editUserId").value;
  const name = document.getElementById("editName").value.trim();
  const email = document.getElementById("editEmail").value.trim();
  const phone = document.getElementById("editPhone").value.trim();

  const submitBtn = editUserForm.querySelector(".submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving...";

  try {
    const res = await fetch(`http://localhost:5000/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone })
    });
    const data = await res.json();
    if (data.success) {
      alert("User updated successfully!");
      editUserModal.classList.remove("show");
      loadUsers();
    } else {
      alert(data.message || "Failed to update user");
    }
  } catch (error) {
    console.error("Error editing user:", error);
    alert("Connection error occurred while saving.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Save Changes";
  }
});

// Toggle Block Status
async function toggleBlockStatus(userId, isCurrentlyBlocked) {
  const nextBlockedState = !isCurrentlyBlocked;
  const confirmMsg = nextBlockedState 
    ? "Are you sure you want to block this user? They will not be allowed to log in."
    : "Are you sure you want to unblock this user?";
    
  if (confirm(confirmMsg)) {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/block`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: nextBlockedState })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        loadUsers();
      } else {
        alert(data.message || "Action failed");
      }
    } catch (error) {
      console.error("Error toggling block status:", error);
      alert("Connection error occurred.");
    }
  }
}

// View Purchase History
async function viewPurchaseHistory(userId, displayName) {
  historyUserTitle.innerText = `Purchase History for ${displayName}`;
  historyTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 12px;">Fetching history...</td></tr>`;
  historyModal.classList.add("show");

  try {
    const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/orders`);
    const data = await res.json();

    if (data.success && data.orders && data.orders.length > 0) {
      historyTableBody.innerHTML = "";
      data.orders.forEach(order => {
        const productList = order.products.map(p => {
          const pName = p.productId ? p.productId.productName : (p.productName || "Product");
          return `${pName} (x${p.quantity})`;
        }).join(", ");

        historyTableBody.innerHTML += `
          <tr>
            <td style="font-weight: 600; color: #475569;">#${order._id.substring(18)}</td>
            <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${productList}">${productList}</td>
            <td style="font-weight: 600;">₹${order.totalAmount.toLocaleString()}</td>
            <td><span class="status-badge" style="
              background: ${order.orderStatus === 'Delivered' ? '#dcfce7' : '#fef9c3'};
              color: ${order.orderStatus === 'Delivered' ? '#15803d' : '#854d0e'};
            ">${order.orderStatus}</span></td>
            <td>${new Date(order.orderDate || order.createdAt).toLocaleDateString()}</td>
          </tr>
        `;
      });
    } else {
      historyTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 20px;">No purchase history found for this user.</td></tr>`;
    }
  } catch (error) {
    console.error("Error fetching user history:", error);
    historyTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red; padding: 20px;">Failed to load history.</td></tr>`;
  }
}

// Delete User
async function deleteUser(userId) {
  if (confirm("Are you sure you want to delete this user? This action is permanent and cannot be undone.")) {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        alert("User deleted successfully!");
        loadUsers();
      } else {
        alert(data.message || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user due to a connection error.");
    }
  }
}

// Initial load
loadUsers();
