// Recap: Handlers the final payment step and creates booking records.
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Check Auth (Simple check)
  const userJson = localStorage.getItem("user");
  if (!userJson) {
    showToast("Please login to complete booking.", "error");
    window.location.href = "./login.html";
    return;
  }
  const user = JSON.parse(userJson);

  // 2. Load Booking Data
  const bookingDataJson = localStorage.getItem("currentBooking");
  if (!bookingDataJson) {
    showToast("No booking in progress.", "error");
    window.location.href = "../index.html";
    return;
  }
  const bookingData = JSON.parse(bookingDataJson);

  // 3. Render Summary
  const summaryBtn =
    document.querySelector(".pay-btn") ||
    document.querySelector('button[type="submit"]');
  if (summaryBtn) {
    summaryBtn.textContent = `Pay ${bookingData.total_amount}`;
  }

  // 4. Handle Payment Submission
  const oldPayBtn = document.getElementById("pay-btn");
  let qr = null;

  // Recap: Generates a UPI QR code based on the current booking amount.
  function generateUPIQR() {
    const qrContainer = document.getElementById("qrcode");
    if (!qrContainer) return;

    // Clear previous QR
    qrContainer.innerHTML = "";

    // Amount cleaning (remove ₹, commas, and any non-numeric chars except .)
    let rawAmount = bookingData.total_amount || "0";
    let amount = rawAmount.toString().replace(/[^0-9.]/g, "");

    // If amount still looks empty or invalid, try to parse what's there
    if (!amount || isNaN(parseFloat(amount))) {
      // Fallback: check if it has numbers at all
      const match = rawAmount.toString().match(/\d+(\.\d+)?/);
      amount = match ? match[0] : "0";
    }

    const upiId = "aswinvivo1309@okhdfcbank";
    const payeeName = "LocoTranz";
    const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
      payeeName,
    )}&am=${amount}&cu=INR`;

    console.log("Generating QR for:", upiLink);

    // Create new instance every time to ensure it renders in the cleared container
    setTimeout(() => {
      try {
        new QRCode(qrContainer, {
          text: upiLink,
          width: 220,
          height: 220,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M,
        });
        document.getElementById("qr-overlay").style.display = "flex";
      } catch (e) {
        console.error("QRCode Error:", e);
        showToast("QR generation failed. Please try again.", "error");
      }
    }, 50);
  }

  // Handle Close QR
  const closeQrBtn = document.getElementById("close-qr");
  if (closeQrBtn) {
    closeQrBtn.addEventListener("click", () => {
      document.getElementById("qr-overlay").style.display = "none";
    });
  }

  // Close when clicking outside the box
  const qrOverlay = document.getElementById("qr-overlay");
  if (qrOverlay) {
    qrOverlay.addEventListener("click", (e) => {
      if (e.target.id === "qr-overlay") {
        qrOverlay.style.display = "none";
      }
    });
  }

  // Handle UPI app selection
  const appButtons = ["gpay-btn", "phonepe-btn", "paytm-btn"];
  appButtons.forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", () => {
        // Remove active class from others
        appButtons.forEach((otherId) => {
          document.getElementById(otherId).classList.remove("active");
        });
        btn.classList.add("active");
        generateUPIQR();
      });
    }
  });

  if (oldPayBtn) {
    // Robustly replace button to strip any cached inline listeners
    const newPayBtn = oldPayBtn.cloneNode(true);
    newPayBtn.removeAttribute("onclick");
    newPayBtn.onclick = null;
    oldPayBtn.parentNode.replaceChild(newPayBtn, oldPayBtn);

    // Recap: Sends booking requests to the server and handles the response.
    newPayBtn.addEventListener("click", async (e) => {
      e.preventDefault(); // Stop any default behavior

      // Disable button to prevent double billing
      newPayBtn.disabled = true;
      newPayBtn.textContent = "Processing...";

      try {
        console.log("Starting Booking Process...", bookingData);

        // Validate Data
        if (!bookingData.seat_ids || bookingData.seat_ids.length === 0) {
          throw new Error("Invalid booking data: No seats selected.");
        }

        // Log each booking attempt
        console.log(`Creating ${bookingData.seat_ids.length} booking(s)...`);

        const promises = bookingData.seat_ids.map((seatId) => {
          const payload = {
            user_id: user.id,
            schedule_id: parseInt(bookingData.schedule_id),
            seat_id: parseInt(seatId),
            status: "confirmed",
          };
          console.log("Sending booking request with payload:", payload);

          return fetch(`${API_BASE_URL}/bookings/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user.access_token}`,
            },
            body: JSON.stringify(payload),
          });
        });

        const results = await Promise.all(promises);

        // Log all responses
        console.log(
          "Received responses:",
          results.map((r) => ({ ok: r.ok, status: r.status })),
        );

        const allOk = results.every((r) => r.ok);

        if (allOk) {
          const createdBookings = await Promise.all(
            results.map((r) => r.json()),
          );

          console.log("Created bookings:", createdBookings);

          const validIds = createdBookings.map((b) => b.id).filter((id) => id);
          console.log("Created Booking IDs:", validIds);

          if (validIds.length === 0) {
            showToast(
              "Booking processed, but Logic Error: No Ticket IDs received. Please contact support.",
              "error",
            );
            newPayBtn.disabled = false;
            newPayBtn.textContent = "Retry";
            return;
          }

          const bookingIds = validIds.join(",");

          showToast(`Booking Success! Redirecting to ticket...`, "success");
          localStorage.removeItem("currentBooking");
          setTimeout(() => {
            window.location.replace(`./ticket.html?booking_ids=${bookingIds}`);
          }, 1500);
        } else {
          // Try to read error messages
          try {
            const errorRes = results.find((r) => !r.ok);
            const errorData = await errorRes.json();
            console.error("Backend error:", errorData);
            showToast("Booking Failed: " + JSON.stringify(errorData), "error");
          } catch (e) {
            console.error("Error parsing error response:", e);
            showToast("Server returned an error. Please try again.", "error");
          }
          newPayBtn.disabled = false;
          newPayBtn.textContent = "Retry Payment";
        }
      } catch (err) {
        console.error("Payment error:", err);
        showToast("Payment Logic Error: " + err.message, "error");
        newPayBtn.disabled = false;
        newPayBtn.textContent = "Retry Payment";
      }
    });
  }
});
