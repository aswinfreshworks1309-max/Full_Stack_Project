(function () {
  const userJson = localStorage.getItem("user");
  const user = userJson ? JSON.parse(userJson) : null;
  const path = window.location.pathname;
  const segments = path.split("/");
  const page = segments.pop() || "index.html";
  const isRoot = !path.includes("/pages/");

  // Pages that don't require authentication
  const publicPages = [
    "login.html",
    "signup.html",
    "forgot.html",
    "admin_login.html",
    "index.html",
  ];

  // Pages specifically for admin
  const adminPages = ["admin.html"];

  // Helper to get correct path to a page
  const getPath = (targetPage) => {
    if (targetPage === "index.html") {
      return isRoot ? "index.html" : "../index.html";
    }
    return isRoot ? `pages/${targetPage}` : targetPage;
  };

  // 1. If user is logged in and trying to access login/signup pages, redirect them out
  if (user && publicPages.includes(page)) {
    // If they are on index.html, we let them stay or redirect to home?
    // usually if logged in, index.html should redirect to home.html
    if (
      page === "admin_login.html" ||
      (page === "login.html" && user.role === "admin")
    ) {
      if (user.role === "admin") {
        window.location.href = getPath("admin.html");
        return;
      }
    }

    if (
      page === "login.html" ||
      page === "signup.html" ||
      page === "index.html" ||
      page === "admin_login.html"
    ) {
      if (user.role === "admin") {
        window.location.href = getPath("admin.html");
      } else {
        window.location.href = getPath("home.html");
      }
      return;
    }
  }

  // 2. If user is NOT logged in and trying to access a protected page
  if (!user && !publicPages.includes(page)) {
    // If it's an admin page, redirect to admin_login.html, else to login.html
    if (adminPages.includes(page)) {
      window.location.href = getPath("admin_login.html");
    } else {
      window.location.href = getPath("login.html");
    }
    return;
  }

  // 3. If user is logged in but NOT an admin and trying to access admin pages
  if (user && adminPages.includes(page) && user.role !== "admin") {
    window.location.href = getPath("admin_login.html");
    return;
  }

  // 4. Special case: if user is logged in as admin but tries to access user pages like payment.html?
  // For now we allow admins to see user pages if they want, or we could restrict it.
  // The user said "do authentication for all the page include admin page",
  // which implies strict checks everywhere.
})();
