// Recap: Fetches and displays booking details and seat information for the ticket page.
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

  // Recap: Retrieves authentication headers from local storage.
  const getAuthHeaders = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.access_token) {
      window.location.href = "login.html";
      return {};
    }
    return { Authorization: `Bearer ${user.access_token}` };
  };

  // Recap: Handles 401 Unauthorized errors by redirecting to login.
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
      { headers },
    );
    if (handleAuthError(schedRes)) return;
    const schedule = await schedRes.json();

    // Fetch Bus
    const busRes = await fetch(`${API_BASE_URL}/buses/${schedule.bus_id}`, {
      headers,
    });
    if (handleAuthError(busRes)) return;
    const bus = await busRes.json();

    // Fetch All Seats once (for labels)
    const seatsRes = await fetch(`${API_BASE_URL}/seats/`, { headers });
    if (handleAuthError(seatsRes)) return;
    const allSeats = await seatsRes.json();

    // 3. Update UI
    const user = JSON.parse(localStorage.getItem("user"));

    // Update Bus Info
    const busNumEl = document.getElementById("busNumber");
    const plateNumEl = document.getElementById("plateNumber");
    if (busNumEl)
      busNumEl.textContent = bus.bus_number || `LocoTranz #${bus.id}`;
    if (plateNumEl) plateNumEl.textContent = bus.plate_number || "N/A";

    const dep = new Date(schedule.departure_time);
    const arr = new Date(schedule.arrival_time);

    // Update Journey
    const points = document.querySelectorAll(".journey-point");
    if (points.length >= 2) {
      const dateOptions = { day: "numeric", month: "short", year: "numeric" };
      const timeOptions = { hour: "2-digit", minute: "2-digit" };

      points[0].querySelector(".journey-city").textContent = schedule.source;
      points[0].querySelector(".journey-time").textContent =
        dep.toLocaleTimeString([], timeOptions);
      points[0].querySelector(".journey-date").textContent =
        dep.toLocaleDateString("en-GB", dateOptions);

      points[1].querySelector(".journey-city").textContent =
        schedule.destination;
      points[1].querySelector(".journey-time").textContent =
        arr.toLocaleTimeString([], timeOptions);
      points[1].querySelector(".journey-date").textContent =
        arr.toLocaleDateString("en-GB", dateOptions);

      // Calculate and display duration
      const durationMs = arr - dep;
      const hours = Math.floor(durationMs / 3600000);
      const mins = Math.floor((durationMs % 3600000) / 60000);
      const durationEl = document.querySelector(".journey-duration");
      if (durationEl) durationEl.textContent = `${hours}h ${mins}m`;
    }

    // Info Grid
    const boardingEl = document.getElementById("boardingPoint");
    const droppingEl = document.getElementById("droppingPoint");
    const bookingDateEl = document.getElementById("bookingDate");
    const bookingTimeEl = document.getElementById("bookingTime");
    const board = document.querySelector(".board");
    const desty = document.querySelector(".disty");
    // Guard against missing elements to avoid "Cannot read properties of null"
    if (board && boardingEl) {
      board.addEventListener("click", () => {
        const q = encodeURIComponent(
          (boardingEl.textContent || boardingEl.value || "").trim(),
        );
        if (q)
          window.open(`https://www.google.com/maps/search/?api=1&query=${q}`,"_blank");
   
      });
    }
    if (desty && droppingEl) {
      desty.addEventListener("click", () => {
        const q = encodeURIComponent(
          (droppingEl.textContent || droppingEl.value || "").trim(),
        );
        if (q)
          window.open(`https://www.google.com/maps/search/?api=1&query=${q}`,"_blank");
      });
    }

    if (boardingEl) {
      boardingEl.textContent = `${schedule.source}`;
    }
    if (droppingEl) {
      droppingEl.textContent = `${schedule.destination}`;
    }

    const bDate = mainBooking.booking_date
      ? new Date(mainBooking.booking_date)
      : new Date();

    if (bookingDateEl) {
      bookingDateEl.textContent = bDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
    if (bookingTimeEl) {
      bookingTimeEl.textContent = bDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    // Update Booking ID to be slightly more "real" based on booking date
    const year = bDate.getFullYear();
    const month = String(bDate.getMonth() + 1).padStart(2, "0");
    const day = String(bDate.getDate()).padStart(2, "0");
    const refId = `LOCO${year}${month}${day}${String(mainBooking.id).padStart(
      4,
      "0",
    )}`;
    const bookingIdEl = document.querySelector(".booking-id");
    if (bookingIdEl) bookingIdEl.textContent = `Booking ID: ${refId}`;

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
        2,
      )}</span>`;

    const totalRow = document.querySelector(".price-row.total");
    if (totalRow)
      totalRow.innerHTML = `<span>Total Paid</span><span>₹${total.toFixed(
        2,
      )}</span>`;

    // Passenger and Seat Labels
    const passengerNameEl = document.getElementById("passengerName");
    const seatLabelsEl = document.getElementById("seatLabels");

    if (passengerNameEl)
      passengerNameEl.textContent = user ? user.full_name : "Traveler";

    // Map Booking IDs to Seat Labels
    const seatLabels = [];
    try {
      const busSeatsRes = await fetch(
        `${API_BASE_URL}/seats/?bus_id=${schedule.bus_id}`,
        { headers },
      );
      if (busSeatsRes.ok) {
        const busSeats = await busSeatsRes.json();

        await Promise.all(
          bookingIds.map(async (bId) => {
            const bRes = await fetch(`${API_BASE_URL}/bookings/${bId}`, {
              headers,
            });
            if (bRes.ok) {
              const bData = await bRes.json();
              const seat = busSeats.find((s) => s.id === bData.seat_id);
              if (seat) seatLabels.push(seat.seat_label);
            }
          }),
        );
      }
    } catch (err) {
      console.error("Error fetching seat labels:", err);
    }

    if (seatLabelsEl)
      seatLabelsEl.textContent = seatLabels.sort().join(", ") || "N/A";
  } catch (e) {
    console.error(e);
    showToast("Error loading ticket details: " + e.message, "error");
  }
});
