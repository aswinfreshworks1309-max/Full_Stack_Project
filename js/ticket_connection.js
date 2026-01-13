document.addEventListener("DOMContentLoaded", async () => {
  // 1. Get Params
  const params = new URLSearchParams(window.location.search);
  const bookingIdsStr = params.get("booking_ids");
  if (!bookingIdsStr) {
    console.error("No booking_ids param found in URL");
    showToast("No ticket found. Referencing URL debug info.", "error");
    return;
  }
  const bookingIds = bookingIdsStr.split(",");
  if (bookingIds.length === 0) return;

  const getAuthHeaders = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.access_token) {
      window.location.href = "login.html";
      return {};
    }
    return { Authorization: `Bearer ${user.access_token}` };
  };

  const handleAuthError = (res) => {
    if (res.status === 401) {
      localStorage.removeItem("user");
      showToast("Session expired. Please login again.", "error");
      window.location.href = "login.html";
      return true;
    }
    return false;
  };

  // 2. Fetch Data
  try {
    const headers = getAuthHeaders();

    // Fetch first booking to get context
    const mainRes = await fetch(`${API_BASE_URL}/bookings/${bookingIds[0]}`, {
      headers,
    });
    if (handleAuthError(mainRes)) return;
    if (!mainRes.ok) throw new Error("Booking not found");
    const mainBooking = await mainRes.json();

    // Fetch Schedule
    const schedRes = await fetch(
      `${API_BASE_URL}/schedules/${mainBooking.schedule_id}`,
      { headers }
    );
    if (handleAuthError(schedRes)) return;
    const schedule = await schedRes.json();

    // Fetch All Seats once (for labels)
    const seatsRes = await fetch(`${API_BASE_URL}/seats/`, { headers });
    if (handleAuthError(seatsRes)) return;
    const allSeats = await seatsRes.json();

    // 3. Update UI
    const user = JSON.parse(localStorage.getItem("user"));
    const refId = `LOCO${new Date().getFullYear()}${String(Date.now()).slice(
      -6
    )}`;
    document.querySelector(".booking-id").textContent = `Booking ID: ${refId}`;

    const dep = new Date(schedule.departure_time);
    const arr = new Date(schedule.arrival_time);

    // Update Journey
    const points = document.querySelectorAll(".journey-point");
    if (points.length >= 2) {
      points[0].querySelector(".journey-city").textContent = schedule.source;
      points[0].querySelector(".journey-time").textContent =
        dep.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      points[0].querySelector(".journey-date").textContent =
        dep.toLocaleDateString();

      points[1].querySelector(".journey-city").textContent =
        schedule.destination;
      points[1].querySelector(".journey-time").textContent =
        arr.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      points[1].querySelector(".journey-date").textContent =
        arr.toLocaleDateString();
    }

    // Info Grid
    const infoValues = document.querySelectorAll(".info-value");
    if (infoValues.length >= 2) {
      infoValues[0].textContent = `${
        schedule.source
      } - ${dep.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
      infoValues[1].textContent = `${
        schedule.destination
      } - ${arr.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }

    // Price Breakdown
    const count = bookingIds.length;
    const totalBase = count * schedule.price;
    const gst = totalBase * 0.05;
    const total = totalBase + gst;

    const priceRows = document.querySelectorAll(".price-row");
    if (priceRows[0])
      priceRows[0].innerHTML = `<span>Base Fare (${count} × ₹${schedule.price})</span><span>₹${totalBase}</span>`;
    if (priceRows[1])
      priceRows[1].innerHTML = `<span>GST (5%)</span><span>₹${gst.toFixed(
        2
      )}</span>`;

    const totalRow = document.querySelector(".price-row.total");
    if (totalRow)
      totalRow.innerHTML = `<span>Total Paid</span><span>₹${total.toFixed(
        2
      )}</span>`;

    // Passenger Info
    const ticketBody = document.querySelector(".ticket-body");
    const passengerDiv = document.createElement("div");
    passengerDiv.className = "info-grid";
    passengerDiv.style.marginTop = "1rem";
    passengerDiv.innerHTML = `
            <div class="info-item">
               <div class="info-label">Passenger</div>
               <div class="info-value">${user ? user.full_name : "Guest"}</div>
            </div>
            <div class="info-item">
               <div class="info-label">Seats</div>
               <div class="info-value" id="seatLabels">Loading...</div>
            </div>
        `;
    ticketBody.appendChild(passengerDiv);

    // Map Booking IDs to Seat Labels
    const labels = [];
    for (const bId of bookingIds) {
      const bRes = await fetch(`${API_BASE_URL}/bookings/${bId}`, { headers });
      if (bRes.ok) {
        const bData = await bRes.json();
        const seat = allSeats.find((s) => s.id === bData.seat_id);
        if (seat) labels.push(seat.seat_label);
      }
    }
    document.getElementById("seatLabels").textContent =
      labels.join(", ") || "N/A";
  } catch (e) {
    console.error(e);
    showToast("Error loading ticket details: " + e.message, "error");
  }
});
