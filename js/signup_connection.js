// This script handles the signup process when the user submits the form
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    // 1. Prevent the page from refreshing
    e.preventDefault();

    // 2. Collect the information entered by the user
    const fullName = document.getElementById("fullName").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // 3. Simple validation: Check if passwords match
    if (password !== confirmPassword) {
      showToast("Passwords do not match!", "error");
      return;
    }

    // 4. Show a loading spinner and disable the button
    const signupBtn = signupForm.querySelector(".btn");
    const loadingSpinner = document.getElementById("loadingSpinner");
    loadingSpinner.classList.add("show");
    signupBtn.disabled = true;

    try {
      // 5. Send the data to our Python Backend
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
          role: "user",
        }),
      });

      // 6. Handle the response from the server
      if (response.ok) {
        // Success!
        showToast(
          "Account created successfully! Redirecting to login...",
          "success",
        );
        setTimeout(() => {
          window.location.href = "../pages/login.html";
        }, 1500);
      } else {
        // If the server returns an error (like "Email already exists")
        const errorData = await response.json();
        showToast("Signup failed: " + (errorData.detail || "Error"), "error");

        // Hide spinner and re-enable button so user can try again
        loadingSpinner.classList.remove("show");
        signupBtn.disabled = false;
      }
    } catch (err) {
      // If there's a network problem (like backend is not running)
      console.error("Network error:", err);
      showToast(
        "Network error. Please check if the server is running.",
        "error",
      );

      loadingSpinner.classList.remove("show");
      signupBtn.disabled = false;
    }
  });
}
