// This script handles the login process
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector("form");
  const loginBtn = document.querySelector(".login-btn");

  // Remove any old click handlers that might interfere
  if (loginBtn) {
    loginBtn.removeAttribute("onclick");
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      // 1. Prevent the page from refreshing
      e.preventDefault();

      // 2. Get the email and password from the form
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      // 3. Show a loading spinner and disable the button while we wait
      const loadingSpinner = document.getElementById("loadingSpinner");
      loadingSpinner.classList.add("show");
      loginBtn.disabled = true;

      try {
        // 4. Send the credentials to the backend login endpoint
        const response = await fetch(`${API_BASE_URL}/users/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "unused", // These fields are required by the schema but not used for login
            email: email,
            password: password,
            full_name: "unused",
            role: "unused",
          }),
        });

        // 5. Check if the login was successful
        if (response.ok) {
          const user = await response.json();

          // Save the user info (including the token) in the browser's memory
          // This "local storage" stays even if you refresh the page
          localStorage.setItem("user", JSON.stringify(user));

          showToast(`Welcome back, ${user.full_name}!`, "success");

          // Wait a second then redirect based on whether they are an Admin or a User
          setTimeout(() => {
            if (user.role === "admin") {
              window.location.href = "../pages/admin.html";
            } else {
              window.location.href = "../pages/home.html";
            }
          }, 1000);
        } else {
          // If login failed (e.g. wrong password)
          showToast("Invalid email or password. Please try again.", "error");

          // Hide spinner and re-enable button so user can try again
          loadingSpinner.classList.remove("show");
          loginBtn.disabled = false;
        }
      } catch (err) {
        // If there is a network error
        console.error("Login Error:", err);
        showToast("Cannot connect to server. Is the backend running?", "error");

        loadingSpinner.classList.remove("show");
        loginBtn.disabled = false;
      }
    });
  }
});
