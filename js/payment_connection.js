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
  if (oldPayBtn) {
    // Robustly replace button to strip any cached inline listeners
    const newPayBtn = oldPayBtn.cloneNode(true);

    // Nuke inline handlers
    newPayBtn.removeAttribute("onclick");
    newPayBtn.onclick = null;

    oldPayBtn.parentNode.replaceChild(newPayBtn, oldPayBtn);

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
          results.map((r) => ({ ok: r.ok, status: r.status }))
        );

        const allOk = results.every((r) => r.ok);

        if (allOk) {
          const createdBookings = await Promise.all(
            results.map((r) => r.json())
          );

          console.log("Created bookings:", createdBookings);

          const validIds = createdBookings.map((b) => b.id).filter((id) => id);
          console.log("Created Booking IDs:", validIds);

          if (validIds.length === 0) {
            showToast(
              "Booking processed, but Logic Error: No Ticket IDs received. Please contact support.",
              "error"
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
