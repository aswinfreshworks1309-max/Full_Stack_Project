// Recap: Manages administrator registration and account creation.
document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("adminSignupForm");

  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const fullName = document.getElementById("fullName").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;

      if (password !== confirmPassword) {
        showToast("Passwords do not match!", "error");
        return;
      }

      // Show loading spinner and disable button
      const signupBtn = signupForm.querySelector(".btn");
      const loadingSpinner = document.getElementById("loadingSpinner");
      loadingSpinner.classList.add("show");
      signupBtn.disabled = true;

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
            role: "admin", // Explicitly set role to admin
          }),
        });

        if (response.ok) {
          const data = await response.json();
          showToast(
            "Admin account created successfully! Please login.",
            "success",
          );
          setTimeout(() => {
            window.location.href = "../pages/admin_login.html";
          }, 1500);
        } else {
          const error = await response.json();
          showToast(
            "Signup failed: " + (error.detail || "Unknown error"),
            "error",
          );
          loadingSpinner.classList.remove("show");
          signupBtn.disabled = false;
        }
      } catch (err) {
        console.error(err);
        showToast("Network error. Is the backend running?", "error");
        loadingSpinner.classList.remove("show");
        signupBtn.disabled = false;
      }
    });
  }
});
