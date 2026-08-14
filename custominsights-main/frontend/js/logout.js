function logout() {

    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("role");

    window.location.href = "admin_login.html";

}