// This function displays a temporary "Toast" message (success or error) on the screen
function showToast(message, type = "success") {
  // 1. Find or create the container where all toasts will show up
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  // 2. Create a new Toast box
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`; // This adds a class like 'toast-success' or 'toast-error'

  // 3. Put the message inside the box
  toast.innerHTML = `<span class="toast-message">${message}</span>`;

  // 4. Add the Toast to the screen
  container.appendChild(toast);

  // 5. Automatically remove the message after 4 seconds
  setTimeout(() => {
    // Start the "hiding" animation
    toast.classList.add("hiding");

    // After the animation finishes (0.3s), remove the element from the page
    setTimeout(() => {
      if (toast.parentNode === container) {
        container.removeChild(toast);
      }
    }, 300);
  }, 4000);
}
