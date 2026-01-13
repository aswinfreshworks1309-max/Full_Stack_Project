document.addEventListener("DOMContentLoaded", () => {
  // Signup Form Handling
  const signupForm = document.querySelector("form");
  // Ensure it's the right form by checking inputs or context if needed

  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const inputs = signupForm.querySelectorAll("input");
      const fullName = inputs[0].value;
      const email = inputs[1].value;
      const password = inputs[2].value;
      const confirmPassword = inputs[3].value;

      if (password !== confirmPassword) {
        showToast("Passwords do not match!", "error");
        return;
      }

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
            "error"
          );
        }
      } catch (err) {
        console.error(err);
        showToast("Network error. Is the backend running?", "error");
      }
    });
  }
});
