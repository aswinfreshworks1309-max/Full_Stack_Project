// This script checks if a user is logged in before allowing them to see certain pages.
// It runs automatically on every page.

(function () {
  // 1. Get the logged-in user's information from the browser's memory
  const userJson = localStorage.getItem("user");
  const user = userJson ? JSON.parse(userJson) : null;

  // 2. Figure out which page we are currently looking at
  const path = window.location.pathname;
  const segments = path.split("/");
  const page = segments.pop() || "index.html";
  const isRoot = !path.includes("/pages/");

  // 3. Define which pages anyone can see (Public) and which only Admins can see
  const publicPages = [
    "login.html",
    "signup.html",
    "forgot.html",
    "admin_login.html",
    "admin_signup.html",
    "index.html",
  ];

  const adminPages = ["admin.html"];

  // Helper function to find the correct path to redirect the user
  const getPath = (targetPage) => {
    if (targetPage === "index.html") {
      return isRoot ? "index.html" : "../index.html";
    }
    return isRoot ? `pages/${targetPage}` : targetPage;
  };

  // 4. LOGIC: If user is ALREADY logged in and tries to go to Login or Signup pages
  if (user && publicPages.includes(page)) {
    // If they are an Admin, send them to the Admin dashboard
    if (user.role === "admin") {
      window.location.href = getPath("admin.html");
    } else {
      // If they are a regular User, send them to the Home page
      window.location.href = getPath("home.html");
    }
    return;
  }

  // 5. LOGIC: If user is NOT logged in and tries to see a private page (like Home or Payment)
  if (!user && !publicPages.includes(page)) {
    // If they were trying to see an Admin page, send them to Admin Login
    if (adminPages.includes(page)) {
      window.location.href = getPath("admin_login.html");
    } else {
      // Otherwise, send them to the regular Login
      window.location.href = getPath("login.html");
    }
    return;
  }

  // 6. LOGIC: If a regular User tries to sneak into an Admin page
  if (user && adminPages.includes(page) && user.role !== "admin") {
    window.location.href = getPath("admin_login.html");
    return;
  }
})();
