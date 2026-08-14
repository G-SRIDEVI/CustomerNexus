// Product Management Logic
let allProducts = [];

const tableBody = document.getElementById("productTableBody");
const searchInput = document.getElementById("searchProductInput");

// Load products
async function loadProducts() {
  try {
    const res = await fetch("http://localhost:5000/api/admin/products");
    const data = await res.json();

    if (data.success) {
      allProducts = data.products || [];
      renderProducts(allProducts);
    } else {
      tableBody.innerHTML = `<tr><td colspan="7" style="color: red; padding: 20px;">Failed to load products: ${data.message}</td></tr>`;
    }
  } catch (error) {
    console.error("Error loading products:", error);
    tableBody.innerHTML = `<tr><td colspan="7" style="color: red; padding: 20px;">Failed to load products due to a connection error.</td></tr>`;
  }
}

// Render product list
function renderProducts(productsToRender) {
  tableBody.innerHTML = "";

  if (productsToRender.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="padding: 20px; color: #64748b;">No products found.</td></tr>`;
    return;
  }

  productsToRender.forEach(product => {
    const shopName = product.vendorId ? product.vendorId.shopName : "N/A";
    const imgUrl = product.image ? product.image : "https://via.placeholder.com/50";
    tableBody.innerHTML += `
      <tr>
        <td><img src="${imgUrl}" class="product-img" alt="${product.productName}"></td>
        <td style="font-weight: 600; color: #334155;">${product.productName}</td>
        <td>${product.category}</td>
        <td>₹${product.price}</td>
        <td>${product.quantity}</td>
        <td>${shopName}</td>
        <td>
          <button class="delete" onclick="deleteProduct('${product._id}')">Delete</button>
        </td>
      </tr>
    `;
  });
}

// Filter products
if (searchInput) {
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase().trim();
    const filtered = allProducts.filter(product => 
      product.productName.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query)
    );
    renderProducts(filtered);
  });
}

// Delete product
async function deleteProduct(productId) {
  if (confirm("Are you sure you want to delete this product?")) {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/products/${productId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        alert("Product deleted successfully!");
        loadProducts();
      } else {
        alert(data.message || "Failed to delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product due to a connection error.");
    }
  }
}

// Initial load
loadProducts();
