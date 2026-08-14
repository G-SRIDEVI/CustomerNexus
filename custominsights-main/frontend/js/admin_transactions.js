// Transaction Management Logic
let allTransactions = [];

const tableBody = document.getElementById("txnTableBody");
const searchInput = document.getElementById("searchTxnInput");
const statusFilter = document.getElementById("statusFilterSelect");

// Load transactions
async function loadTransactions() {
  try {
    const res = await fetch("http://localhost:5000/api/admin/transactions");
    const data = await res.json();

    if (data.success) {
      allTransactions = data.transactions || [];
      renderTransactions(allTransactions);
    } else {
      tableBody.innerHTML = `<tr><td colspan="8" style="color: red; padding: 20px; text-align: center;">Failed to load transactions: ${data.message}</td></tr>`;
    }
  } catch (error) {
    console.error("Error loading transactions:", error);
    tableBody.innerHTML = `<tr><td colspan="8" style="color: red; padding: 20px; text-align: center;">Failed to load transactions due to connection error.</td></tr>`;
  }
}

// Render transactions table
function renderTransactions(txnsToRender) {
  tableBody.innerHTML = "";

  if (txnsToRender.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8" style="padding: 20px; text-align: center; color: #64748b;">No transactions found.</td></tr>`;
    return;
  }

  txnsToRender.forEach(txn => {
    const txnDate = new Date(txn.date || txn.createdAt).toLocaleString();
    const customerName = txn.userId ? `${txn.userId.name || txn.userId.username || 'User'} (${txn.userId.email})` : "Guest/User";
    const status = txn.paymentStatus || "Success";
    const statusClass = `status-${status.toLowerCase()}`;
    const statusBadge = `<span class="status-badge ${statusClass}">${status}</span>`;

    // Only show refund button if payment was successful
    const actionBtn = status === "Success"
      ? `<button class="btn-refund" onclick="refundTransaction('${txn._id}')">💸 Refund</button>`
      : `<span style="color: #94a3b8; font-size: 13px;">N/A</span>`;

    const displayOrderId = txn.orderId ? `#${txn.orderId._id ? txn.orderId._id.substring(18) : txn.orderId.substring(18)}` : "N/A";

    tableBody.innerHTML += `
      <tr>
        <td>${txnDate}</td>
        <td style="font-weight: 600; color: #475569;">${txn.transactionId || 'N/A'}</td>
        <td>${customerName}</td>
        <td>${displayOrderId}</td>
        <td style="font-weight: 600; color: #0f172a;">₹${txn.amount.toLocaleString()}</td>
        <td>${txn.paymentMethod || 'N/A'}</td>
        <td>${statusBadge}</td>
        <td>${actionBtn}</td>
      </tr>
    `;
  });
}

// Filter and search logic
function filterTransactions() {
  const query = searchInput.value.toLowerCase().trim();
  const selectedStatus = statusFilter.value;

  const filtered = allTransactions.filter(txn => {
    const customerName = txn.userId ? (txn.userId.name || txn.userId.username || "").toLowerCase() : "";
    const email = txn.userId ? txn.userId.email.toLowerCase() : "";
    const txnId = (txn.transactionId || "").toLowerCase();
    const orderId = txn.orderId ? (txn.orderId._id || txn.orderId).toLowerCase() : "";
    const status = txn.paymentStatus || "Success";

    const matchesSearch = customerName.includes(query) || email.includes(query) || txnId.includes(query) || orderId.includes(query);
    const matchesStatus = selectedStatus === "All" || status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  renderTransactions(filtered);
}

// Add event listeners for inputs
if (searchInput) searchInput.addEventListener("input", filterTransactions);
if (statusFilter) statusFilter.addEventListener("change", filterTransactions);

// Refund transaction
async function refundTransaction(id) {
  if (confirm("Are you sure you want to issue a refund for this transaction?")) {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/transactions/${id}/refund`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        alert("Transaction refunded successfully!");
        loadTransactions();
      } else {
        alert(data.message || "Failed to process refund");
      }
    } catch (error) {
      console.error("Error refunding transaction:", error);
      alert("Connection error occurred while refunding.");
    }
  }
}

// Initial load
loadTransactions();
