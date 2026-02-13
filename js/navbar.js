// This script controls the Navigation Bar (like the mobile menu)
document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.querySelector(".nav-links");

  // Check if the hamburger menu exists on this page
  if (hamburger && navLinks) {
    // When the hamburger button is clicked
    hamburger.addEventListener("click", () => {
      // 1. Show or hide the menu
      navLinks.classList.toggle("active");

      // 2. Change the icon between "Bars" (☰) and "X" (✕)
      const icon = hamburger.querySelector("i");
      if (icon.classList.contains("fa-bars")) {
        icon.classList.replace("fa-bars", "fa-xmark");
      } else {
        icon.classList.replace("fa-xmark", "fa-bars");
      }
    });

    // Close the menu automatically when a link is clicked
    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("active");
        const icon = hamburger.querySelector("i");
        if (icon) {
          icon.classList.replace("fa-xmark", "fa-bars");
        }
      });
    });

    // Close the menu if the user clicks anywhere else on the page
    document.addEventListener("click", (e) => {
      if (!navLinks.contains(e.target) && !hamburger.contains(e.target)) {
        navLinks.classList.remove("active");
        const icon = hamburger.querySelector("i");
        if (icon) {
          icon.classList.replace("fa-xmark", "fa-bars");
        }
      }
    });
  }
});
