function showToast(message, type = "success") {
  // Create container if it doesn't exist
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  // Set message
  toast.innerHTML = `
        <span class="toast-message">${message}</span>
    `;

  // Add to container
  container.appendChild(toast);

  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.classList.add("hiding");
    setTimeout(() => {
      if (toast.parentNode === container) {
        container.removeChild(toast);
      }
    }, 300);
  }, 4000);
}

// Optional: Override window.alert if needed, but it's better to explicitly call showToast
// window.alert = (msg) => showToast(msg, 'info');
