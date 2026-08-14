// login user
async function loginUser() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Please fill in all fields");
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success) {
      // Store user
      const userObj = {
        ...data.user,
        name: data.user.username || data.user.name || "Customer" // alias for frontend user.name
      };
      localStorage.setItem("user", JSON.stringify(userObj));
      localStorage.setItem("role", "user");
      localStorage.setItem("isLoggedIn", "true");
      alert("Login successful!");
      window.location.href = "user_dashboard.html";
    } else {
      alert(data.message || "Login failed");
    }
  } catch (err) {
    console.error(err);
    alert("An error occurred during login");
  }
}

// register user
async function registerUser() {
  const username = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !email || !phone || !password) {
    alert("Please fill in all fields");
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, phone, password })
    });
    const data = await res.json();
    if (data.success) {
      alert("Registration successful! Please login.");
      window.location.href = "user_login.html";
    } else {
      alert(data.message || "Registration failed");
    }
  } catch (err) {
    console.error(err);
    alert("An error occurred during registration");
  }
}

// logout user
function logoutUser() {
  localStorage.removeItem("user");
  window.location.href = "user_login.html";
}

// load profile on dashboard
function loadUserProfile() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    window.location.href = "user_login.html";
    return;
  }
  const usernameSpan = document.getElementById("username");
  if (usernameSpan) {
    usernameSpan.textContent = user.username || user.name || "User";
  }
}
