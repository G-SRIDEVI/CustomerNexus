const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {

        const response = await fetch("http://localhost:5000/api/auth/login", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email,
                password
            })

        });

        const data = await response.json();

        if (data.success) {

            // Save login status
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("role", data.role);

            // Only admins can access dashboard
            if (data.role === "admin") {

                window.location.href = "admin_dashboard.html";

            } else {

                document.getElementById("message").innerHTML =
                    "You are not an Admin.";

            }

        }

        else {

            document.getElementById("message").innerHTML =
                data.message;

        }

    }

    catch (error) {

        console.log(error);

        document.getElementById("message").innerHTML =
            "Server Error";

    }

});