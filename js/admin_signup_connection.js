const signupForm = document.getElementById("adminSignupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    // Helper functions for inline validation
    const showError = (id, msg) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = msg;
        el.classList.add("show");
      }
    };
    const clearErrors = () => {
      document.querySelectorAll(".error-msg").forEach((el) => {
        el.textContent = "";
        el.classList.remove("show");
      });
    };

    // 1. Prevent the page from refreshing
    e.preventDefault();
    clearErrors();

    // 2. Collect the details entered by the Admin
    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    let hasError = false;

    // 3. Validation Logic
    // Full Name: Only characters and spaces
    const nameValidation = /^[A-Za-z\s]+$/;
    if (!fullName) {
      showError("nameError", "Admin Name is required");
      hasError = true;
    } else if (!nameValidation.test(fullName)) {
      showError("nameError", "Only letters and spaces allowed");
      hasError = true;
    }

    // Email validation (basic)
    if (!email) {
      showError("emailError", "Admin Email is required");
      hasError = true;
    }

    // Password: Min 8 chars and at least one special character
    const passwordValidation = /^(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!password) {
      showError("passwordError", "Password is required");
      hasError = true;
    } else if (!passwordValidation.test(password)) {
      showError(
        "passwordError",
        "Min 8 chars with 1 special character required",
      );
      hasError = true;
    }

    if (!confirmPassword) {
      showError("confirmPasswordError", "Please confirm your password");
      hasError = true;
    } else if (password !== confirmPassword) {
      showError("confirmPasswordError", "Passwords do not match");
      hasError = true;
    }

    if (hasError) return;

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
          name: email.split("@")[0], // Derive username from email
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
