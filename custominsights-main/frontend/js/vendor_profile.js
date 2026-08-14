// frontend/js/vendor_profile.js

const vendor = JSON.parse(localStorage.getItem("vendor"));
if (!vendor) {
  alert("Please login as vendor first");
  window.location.href = "vendor_register.html";
}

// Load vendor profile into form
function loadVendorProfile() {
  document.getElementById("shopName").value = vendor.shopName || "";
  document.getElementById("ownerName").value = vendor.ownerName || "";
  document.getElementById("businessType").value = vendor.businessType || "";
  document.getElementById("email").value = vendor.email || "";
  document.getElementById("phone").value = vendor.phone || "";
}

// Save updated vendor profile
document.getElementById("vendor-profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const updatedData = {
    shopName: document.getElementById("shopName").value,
    ownerName: document.getElementById("ownerName").value,
    businessType: document.getElementById("businessType").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
  };

  try {
    const res = await fetch(`/api/vendors/${vendor._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedData),
    });
    const data = await res.json();
    if (data.success) {
      alert("Profile updated successfully!");
      localStorage.setItem("vendor", JSON.stringify(data.vendor));
    } else {
      alert(data.message || "Failed to update profile");
    }
  } catch (err) {
    console.error("Error updating vendor profile:", err);
  }
});

loadVendorProfile();
