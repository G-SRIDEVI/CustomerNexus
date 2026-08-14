// Vendor Management Logic
let allVendors = [];

const tableBody = document.getElementById("vendorTableBody");
const searchInput = document.getElementById("searchVendorInput");

// Modals
const vendorModal = document.getElementById("vendorModal");
const addVendorBtn = document.getElementById("addVendorBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const addVendorForm = document.getElementById("addVendorForm");

// Modal Controls
addVendorBtn.addEventListener("click", () => vendorModal.classList.add("show"));
closeModalBtn.addEventListener("click", () => vendorModal.classList.remove("show"));

window.addEventListener("click", (e) => {
  if (e.target === vendorModal) vendorModal.classList.remove("show");
});

// Load vendors
async function loadVendors() {
  try {
    const res = await fetch("http://localhost:5000/api/admin/vendors");
    const data = await res.json();

    if (data.success) {
      allVendors = data.vendors || [];
      renderVendors(allVendors);
    } else {
      tableBody.innerHTML = `<tr><td colspan="6" style="color: red; padding: 20px;">Failed to load vendors: ${data.message}</td></tr>`;
    }
  } catch (error) {
    console.error("Error loading vendors:", error);
    tableBody.innerHTML = `<tr><td colspan="6" style="color: red; padding: 20px;">Failed to load vendors due to connection error.</td></tr>`;
  }
}

// Render vendor list
function renderVendors(vendorsToRender) {
  tableBody.innerHTML = "";

  if (vendorsToRender.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="padding: 20px; color: #64748b;">No vendors found.</td></tr>`;
    return;
  }

  vendorsToRender.forEach(vendor => {
    tableBody.innerHTML += `
      <tr>
        <td style="font-weight: 600; color: #334155;">${vendor.shopName}</td>
        <td>${vendor.ownerName}</td>
        <td>${vendor.email}</td>
        <td>${vendor.phone}</td>
        <td>${vendor.businessType}</td>
        <td>
          <button class="btn-action btn-delete" onclick="deleteVendor('${vendor._id}')">🗑️ Delete</button>
        </td>
      </tr>
    `;
  });
}

// Filter vendors
if (searchInput) {
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase().trim();
    const filtered = allVendors.filter(vendor => 
      vendor.shopName.toLowerCase().includes(query) ||
      vendor.ownerName.toLowerCase().includes(query) ||
      vendor.email.toLowerCase().includes(query) ||
      vendor.phone.includes(query) ||
      vendor.businessType.toLowerCase().includes(query)
    );
    renderVendors(filtered);
  });
}

// Handle Add Vendor Form Submit (Status defaults to 'Approved')
addVendorForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const shopName = document.getElementById("shopName").value.trim();
  const ownerName = document.getElementById("ownerName").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const businessType = document.getElementById("businessType").value;
  const password = document.getElementById("password").value;

  const submitBtn = addVendorForm.querySelector(".submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Registering...";

  try {
    const response = await fetch("http://localhost:5000/api/vendors/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopName, ownerName, email, phone, businessType, password })
    });

    const data = await response.json();

    if (data.success) {
      alert("Vendor registered successfully!");
      addVendorForm.reset();
      vendorModal.classList.remove("show");
      loadVendors();
    } else {
      alert("Error: " + (data.message || "Could not register vendor."));
    }
  } catch (error) {
    console.error("Error registering vendor:", error);
    alert("Failed to connect to the backend server.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Register Vendor";
  }
});

// Delete vendor
async function deleteVendor(vendorId) {
  if (confirm("Are you sure you want to delete this vendor? This will also delete all products associated with them.")) {
    try {
      const res = await fetch("http://localhost:5000/api/admin/vendors/${vendorId}", {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        alert("Vendor deleted successfully!");
        loadVendors();
      } else {
        alert(data.message || "Failed to delete vendor");
      }
    } catch (error) {
      console.error("Error deleting vendor:", error);
      alert("Failed to delete vendor due to a connection error.");
    }
  }
}

// Initial load
loadVendors();
