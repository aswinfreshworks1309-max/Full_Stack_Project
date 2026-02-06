// Recap: Manages user registration and account creation.
document.addEventListener("DOMContentLoaded", () => {
  // Signup Form Handling
  const signupForm =
    document.getElementById("signupForm") || document.querySelector("form");

  // Recap: Collects user data and sends a registration request to the server.
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const fullNameInput =
        document.getElementById("fullName") ||
        signupForm.querySelectorAll("input")[0];
      const emailInput =
        document.getElementById("email") ||
        signupForm.querySelectorAll("input")[1];
      const passwordInput =
        document.getElementById("password") ||
        signupForm.querySelectorAll("input")[2];
      const confirmPasswordInput =
        document.getElementById("confirmPassword") ||
        signupForm.querySelectorAll("input")[3];

      const fullName = fullNameInput.value;
      const email = emailInput.value;
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      if (password !== confirmPassword) {
        showToast("Passwords do not match!", "error");
        return;
      }

      // Show loading spinner and disable button
      const signupBtn = signupForm.querySelector(".btn");
      const loadingSpinner = document.getElementById("loadingSpinner");
      if (loadingSpinner) loadingSpinner.classList.add("show");
      if (signupBtn) signupBtn.disabled = true;

      try {
        const response = await fetch(`${API_BASE_URL}/users/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: email.split("@")[0], // Generate username from email
            email: email,
            password: password,
            full_name: fullName,
            role: "user",
          }),
        });

        if (response.ok) {
          const data = await response.json();
          showToast("Account created successfully! Please login.", "success");
          setTimeout(() => {
            window.location.href = "../pages/login.html";
          }, 1500);
        } else {
          const error = await response.json();
          showToast(
            "Signup failed: " + (error.detail || "Unknown error"),
            "error",
          );
          // Hide loading spinner and re-enable button
          if (loadingSpinner) loadingSpinner.classList.remove("show");
          if (signupBtn) signupBtn.disabled = false;
        }
      } catch (err) {
        console.error(err);
        showToast("Network error. Is the backend running?", "error");
        // Hide loading spinner and re-enable button
        if (loadingSpinner) loadingSpinner.classList.remove("show");
        if (signupBtn) signupBtn.disabled = false;
      }
    });
  }
});
