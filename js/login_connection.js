document.addEventListener("DOMContentLoaded", () => {
  // Login Form Handling
  const loginForm = document.querySelector("form");
  const loginBtn = document.querySelector(".login-btn");

  // Remove default onclick from HTML if present to prevent early redirect
  if (loginBtn) {
    loginBtn.removeAttribute("onclick");
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      try {
        // Using the specific login endpoint we just added
        const response = await fetch(
          "https://project-backend-rose-nine.vercel.app/api/users/login",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: "ignored", // Schema requires it but logic uses email
              email: email,
              password: password,
              full_name: "ignored",
              role: "ignored",
            }),
          }
        );

        if (response.ok) {
          const user = await response.json();
          // valid login
          localStorage.setItem("user", JSON.stringify(user));
          alert(`Welcome back, ${user.full_name}!`);
          window.location.href = "./pages/home.html";
        } else {
          alert("Invalid email or password.");
        }
      } catch (err) {
        console.error(err);
        alert("Login failed. Is the backend running?");
      }
    });
  }
});
