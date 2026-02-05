// Configuration for the API
const API_BASE_URL =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:8000"
    : "https://project-backend-fcwe.onrender.com";

console.log("Using API URL:", API_BASE_URL);
