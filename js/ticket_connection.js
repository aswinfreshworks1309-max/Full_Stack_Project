document.addEventListener("DOMContentLoaded", async () => {
  // 1. Get Params
  const params = new URLSearchParams(window.location.search);
  const bookingIdsStr = params.get("booking_ids");
  if (!bookingIdsStr) {
    console.error("No booking_ids param found in URL");
    alert("No ticket found. URL Debug: " + window.location.href);
    return;
  }
  const bookingIds = bookingIdsStr.split(",");

  if (bookingIds.length === 0) return;

  // 2. Fetch Data using the first booking ID to get Schedule info
  // (Ideally we define an endpoint to get multiple bookings or just loop)
  try {
    // Fetch first booking to get context
    const mainRes = await fetch(
      `${API_BASE_URL}/api/bookings/${bookingIds[0]}`
    );
    if (!mainRes.ok) throw new Error("Booking not found");
    const mainBooking = await mainRes.json();

    // Fetch Schedule & Bus
    const schedRes = await fetch(
      `${API_BASE_URL}/api/schedules/${mainBooking.schedule_id}`
    );
    const schedule = await schedRes.json();

    // Fetch User (if needed) - we have local user
    const user = JSON.parse(localStorage.getItem("user"));

    // 3. Update UI

    // Random Booking Ref ID for visual flair
    const refId = `LOCO${new Date().getFullYear()}${String(Date.now()).slice(
      -6
    )}`;
    document.querySelector(".booking-id").textContent = `Booking ID: ${refId}`;

    // Dates
    const dep = new Date(schedule.departure_time);
    const arr = new Date(schedule.arrival_time);

    // Update Journey
    const points = document.querySelectorAll(".journey-point");
    if (points.length >= 2) {
      // Source
      points[0].querySelector(".journey-city").textContent = schedule.source;
      points[0].querySelector(".journey-time").textContent =
        dep.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      points[0].querySelector(".journey-date").textContent =
        dep.toLocaleDateString();

      // Dest
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
    // We know the count and price
    const count = bookingIds.length;
    const totalBase = count * schedule.price;
    const gst = totalBase * 0.05;
    const total = totalBase + gst;

    const priceRows = document.querySelectorAll(".price-row");
    // Base
    if (priceRows[0]) {
      priceRows[0].innerHTML = `<span>Base Fare (${count} × ₹${schedule.price})</span><span>₹${totalBase}</span>`;
    }
    // GST
    if (priceRows[1]) {
      priceRows[1].innerHTML = `<span>GST (5%)</span><span>₹${gst.toFixed(
        2
      )}</span>`;
    }
    // Total
    const totalRow = document.querySelector(".price-row.total");
    if (totalRow) {
      totalRow.innerHTML = `<span>Total Paid</span><span>₹${total.toFixed(
        2
      )}</span>`;
    }

    // Add Passenger Name if possible
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

    // Fetch Seats for labels
    const seatPromises = bookingIds.map((id) =>
      fetch(`${API_BASE_URL}/api/bookings/${id}`)
        .then((r) => r.json())
        .then((booking) =>
          fetch(`${API_BASE_URL}/api/seats/`)
            .then((r) => r.json())
            .then((seats) => seats.find((s) => s.id === booking.seat_id))
        )
    );

    const seatObjects = await Promise.all(seatPromises);
    const labels = seatObjects.map((s) => (s ? s.seat_label : "?")).join(", ");
    document.getElementById("seatLabels").textContent = labels;
  } catch (e) {
    console.error(e);
    alert("Error loading ticket details.");
  }
});
