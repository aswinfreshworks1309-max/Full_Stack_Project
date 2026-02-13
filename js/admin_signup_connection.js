// This script handles the Administrator registration process
document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("adminSignupForm");

  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      // 1. Prevent the page from refreshing
      e.preventDefault();

      // 2. Collect the details entered by the Admin
      const fullName = document.getElementById("fullName").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;

      // 3. Simple validation: Check if passwords match
      if (password !== confirmPassword) {
        showToast("Passwords do not match!", "error");
        return;
      }

      // 4. Show a loading spinner and disable the button while we wait
      const signupBtn = signupForm.querySelector(".btn");
      const loadingSpinner = document.getElementById("loadingSpinner");
      loadingSpinner.classList.add("show");
      signupBtn.disabled = true;

      try {
        // 5. Send the Admin data to our Python Backend
        const response = await fetch(`${API_BASE_URL}/users/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: email.split("@")[0], // Use part of email as a username
            email: email,
            password: password,
            full_name: fullName,
            role: "admin", // IMPORTANT: This creates an Admin account
          }),
        });

        // 6. Handle the response from the server
        if (response.ok) {
          showToast(
            "Admin account created successfully! Redirecting...",
            "success",
          );
          setTimeout(() => {
            window.location.href = "admin_login.html";
          }, 1500);
        } else {
          // If the server returns an error
          const errorData = await response.json();
          showToast("Signup failed: " + (errorData.detail || "Error"), "error");

          loadingSpinner.classList.remove("show");
          signupBtn.disabled = false;
        }
      } catch (err) {
        // If there's a network problem
        console.error("Admin Signup Error:", err);
        showToast("Network error. Is the server running?", "error");

        loadingSpinner.classList.remove("show");
        signupBtn.disabled = false;
      }
    });
  }
});
