// Vendor login/register handlers
const messageToast = document.getElementById("messageToast");

function switchTab(tab) {
  // Clear messages
  messageToast.className = "msg-toast";
  messageToast.innerText = "";

  const loginTabBtn = document.getElementById("loginTabBtn");
  const registerTabBtn = document.getElementById("registerTabBtn");
  const loginFormBox = document.getElementById("loginFormBox");
  const registerFormBox = document.getElementById("registerFormBox");

  if (tab === "login") {
    loginTabBtn.classList.add("active");
    registerTabBtn.classList.remove("active");
    loginFormBox.classList.add("active");
    registerFormBox.classList.remove("active");
  } else {
    loginTabBtn.classList.remove("active");
    registerTabBtn.classList.add("active");
    loginFormBox.classList.remove("active");
    registerFormBox.classList.add("active");
  }
}

// Show message feedback helper
function showFeedback(message, type) {
  messageToast.className = `msg-toast ${type}`;
  messageToast.innerText = message;
}

// Login Submit Handler
document.getElementById("vendorLoginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const submitBtn = e.target.querySelector(".submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Logging in...";

  try {
    const res = await fetch("http://localhost:5000/api/vendors/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok || data.success) {
      showFeedback("Login successful! Redirecting...", "success");
      // Store session
      localStorage.setItem("vendor", JSON.stringify(data.vendor));
      localStorage.setItem("vendorToken", data.token);
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("role", "vendor");

      setTimeout(() => {
        window.location.href = "vendor_dashboard.html";
      }, 1000);
    } else {
      showFeedback(data.message || "Invalid email or password.", "error");
    }
  } catch (err) {
    console.error(err);
    showFeedback("Cannot connect to server. Ensure backend is running.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Login to Shop";
  }
});

// Registration Submit Handler
document.getElementById("vendorRegisterForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const shopName = document.getElementById("regShopName").value.trim();
  const ownerName = document.getElementById("regOwnerName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const phone = document.getElementById("regPhone").value.trim();
  const businessType = document.getElementById("regBusinessType").value;
  const password = document.getElementById("regPassword").value;

  if (password.length < 6) {
    showFeedback("Password must be at least 6 characters.", "error");
    return;
  }

  const submitBtn = e.target.querySelector(".submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Registering shop...";

  try {
    const res = await fetch("http://localhost:5000/api/vendors/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopName, ownerName, email, phone, businessType, password })
    });

    const data = await res.json();

    if (res.ok || data.success) {
      showFeedback("Registration successful! Switching to Sign In...", "success");
      setTimeout(() => {
        // Fill login details automatically
        document.getElementById("loginEmail").value = email;
        document.getElementById("loginPassword").value = password;
        switchTab("login");
      }, 1500);
    } else {
      showFeedback(data.message || "Failed to register shop.", "error");
    }
  } catch (err) {
    console.error(err);
    showFeedback("Cannot connect to server. Ensure backend is running.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Register Shop";
  }
});