// frontend/js/vendor_products.js

const vendor = JSON.parse(localStorage.getItem("vendor"));
if (!vendor) {
  alert("Please login as vendor first");
  window.location.href = "vendor_register.html";
}

// Load vendor products
async function loadVendorProducts() {
  const res = await fetch(`/api/products/vendor/${vendor._id}`);
  const data = await res.json();
  const container = document.getElementById("products-container");
  container.innerHTML = "";

  if (!data.success || data.products.length === 0) {
    container.innerHTML = "<p>No products found</p>";
    return;
  }

  data.products.forEach(product => {
    const div = document.createElement("div");
    div.className = "vendor-product";
    div.innerHTML = `
      <h3>${product.productName}</h3>
      <p>Category: ${product.category}</p>
      <p>Price: $${product.price}</p>
      <img src="${product.image}" width="100">
      <button onclick="deleteProduct('${product._id}')">Delete</button>
    `;
    container.appendChild(div);
  });
}

// Add new product
document.getElementById("add-product-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const productData = {
    productName: document.getElementById("productName").value,
    category: document.getElementById("category").value,
    price: document.getElementById("price").value,
    image: document.getElementById("image").value,
    vendorId: vendor._id,
  };

  const res = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productData),
  });

  const data = await res.json();
  if (data.success) {
    alert("Product added successfully!");
    loadVendorProducts();
  } else {
    alert(data.message || "Failed to add product");
  }
});

// Delete product
async function deleteProduct(productId) {
  const res = await fetch(`/api/products/${productId}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (data.success) {
    alert("Product deleted successfully!");
    loadVendorProducts();
  } else {
    alert(data.message || "Failed to delete product");
  }
}

loadVendorProducts();
