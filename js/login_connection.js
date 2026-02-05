//   Manages user authentication and session storage.
document.addEventListener("DOMContentLoaded", () => {
  // Login Form Handling
  const loginForm = document.querySelector("form");
  const loginBtn = document.querySelector(".login-btn");

  // Remove default onclick from HTML if present to prevent early redirect
  if (loginBtn) {
    loginBtn.removeAttribute("onclick");
  }

  //   Submits user credentials for authentication and handles redirection.
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      // Show loading spinner and disable button
      const loadingSpinner = document.getElementById("loadingSpinner");
      loadingSpinner.classList.add("show");
      loginBtn.disabled = true;

      try {
        // Using the specific login endpoint we just added
        const response = await fetch(`${API_BASE_URL}/users/login`, {
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
        });

        if (response.ok) {
          const user = await response.json();
          // valid login
          localStorage.setItem("user", JSON.stringify(user));
          showToast(`Welcome back, ${user.full_name}!`, "success");
          setTimeout(() => {
            if (user.role === "admin") {
              window.location.href = "../pages/admin.html";
            } else {
              window.location.href = "../pages/home.html";
            }
          }, 1000); // Give time for toast to show
        } else {
          showToast("Invalid email or password.", "error");
          // Hide loading spinner and re-enable button
          loadingSpinner.classList.remove("show");
          loginBtn.disabled = false;
        }
      } catch (err) {
        console.error(err);
        showToast(
          "Connection failed. The server might be waking up, please wait a few seconds and try again.",
          "error",
        );
        // Hide loading spinner and re-enable button
        loadingSpinner.classList.remove("show");
        loginBtn.disabled = false;
      }
    });
  }
});
