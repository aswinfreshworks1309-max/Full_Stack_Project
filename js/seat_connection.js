document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const scheduleId = params.get("schedule_id");

  if (!scheduleId) {
    alert("No schedule selected.");
    window.location.href = "../index.html";
    return;
  }

  // 1. Fetch Schedule Details
  let schedule = null;
  let bus = null;
  try {
    const schedRes = await fetch(
      `https://project-backend-rose-nine.vercel.app/api/schedules/${scheduleId}`
    );
    if (!schedRes.ok) throw new Error("Schedule not found");
    schedule = await schedRes.json();

    const busRes = await fetch(
      `https://project-backend-rose-nine.vercel.app/api/buses/${schedule.bus_id}`
    );
    if (busRes.ok) bus = await busRes.json();

    updateSeatPageInfo(schedule, bus);
  } catch (err) {
    console.error(err);
    alert("Failed to load schedule info.");
  }

  // 2. Fetch Seats and Bookings to determine availability
  try {
    // Fetch all seats for this bus
    const seatsRes = await fetch(
      `https://project-backend-rose-nine.vercel.app/api/seats/?bus_id=${schedule.bus_id}`
    );
    const seats = await seatsRes.json();

    // Fetch all bookings for this schedule
    const bookingsRes = await fetch(
      `https://project-backend-rose-nine.vercel.app/api/bookings/?schedule_id=${scheduleId}`
    );
    const bookings = await bookingsRes.json();

    // Setup set of booked seat IDs
    const bookedSeatIds = new Set(bookings.map((b) => b.seat_id));

    renderSeats(seats, bookedSeatIds);
  } catch (err) {
    console.error("Error loading seats:", err);
  }

  // UI Updates
  function updateSeatPageInfo(schedule, bus) {
    if (bus) {
      document.querySelector(".bus-name").textContent =
        bus.name || `Bus #${bus.id}`;
      document.querySelector(".bus-type").textContent =
        bus.type || "Luxury Service";
    }

    document.querySelector(".journey-value").textContent =
      schedule.source || "Origin";
    document.querySelectorAll(".journey-value")[2].textContent =
      schedule.destination || "Destination";

    // Set times
    const dep = new Date(schedule.departure_time);
    const arr = new Date(schedule.arrival_time);
    document.querySelector(".journey-small").textContent =
      dep.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    document.querySelectorAll(".journey-small")[1].textContent =
      arr.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Base fare hidden field or just in memory
    window.currentPrice = schedule.price;
    document.getElementById("baseFare").textContent = "₹0";
  }

  function renderSeats(seats, bookedSet) {
    // Warning: This replaces the hardcoded layout with a dynamic one.
    // If the backend has no seats, the layout will be empty.
    // For 'demo' purposes, if backend has 0 seats, we might want to keep the hardcoded one?
    // But user asked to CONNECT. So we should use real data if possible.
    // Assuming the backend has seats populated.

    if (seats.length === 0) {
      console.warn(
        "No seats found in DB for this bus. Using static layout for visual demo, but they won't be submittable."
      );
      return;
    }

    const layoutContainer = document.getElementById("busLayout");
    // Clear existing rows (keep driver section)
    const driverSection = layoutContainer.querySelector(".driver-section");
    layoutContainer.innerHTML = "";
    layoutContainer.appendChild(driverSection);

    // Group seats by row (simple logic: assuming logic based on seat label or just chunks of 4)
    // Let's just grid them for now or try to parse label like "1A", "1B"

    // Simple 2-2 layout logic
    let currentRow = document.createElement("div");
    currentRow.className = "seat-row";

    // Sort seats by label
    seats.sort((a, b) => a.seat_label.localeCompare(b.seat_label));

    let rowCount = 0;
    seats.forEach((seat, index) => {
      // Create seat div
      const seatDiv = document.createElement("div");
      seatDiv.className = `seat ${
        bookedSet.has(seat.id) ? "booked" : "available"
      }`;
      seatDiv.textContent = seat.seat_label;
      seatDiv.dataset.seat = seat.seat_label;
      seatDiv.dataset.id = seat.id;
      seatDiv.dataset.price = window.currentPrice;

      if (!bookedSet.has(seat.id)) {
        seatDiv.addEventListener("click", () => toggleSeat(seatDiv));
      }

      currentRow.appendChild(seatDiv);

      // Add aisle after 2 seats
      if ((index + 1) % 4 !== 0 && (index + 1) % 2 === 0) {
        const aisle = document.createElement("div");
        aisle.className = "aisle";
        currentRow.appendChild(aisle);
      }

      // New row after 4 seats
      if ((index + 1) % 4 === 0) {
        layoutContainer.appendChild(currentRow);
        currentRow = document.createElement("div");
        currentRow.className = "seat-row";
      }
    });
    if (currentRow.hasChildNodes()) {
      layoutContainer.appendChild(currentRow);
    }
  }

  // Selection Logic
  const selectedSeats = new Set();
  const seatDisplay = document.getElementById("seatDisplay");
  const baseFareEl = document.getElementById("baseFare");
  const gstEl = document.getElementById("gst");
  const totalEl = document.getElementById("totalAmount");

  function toggleSeat(seatDiv) {
    if (seatDiv.classList.contains("booked")) return;

    const seatId = seatDiv.dataset.id;
    const price = parseFloat(seatDiv.dataset.price) || 0;

    if (seatDiv.classList.contains("selected")) {
      seatDiv.classList.remove("selected");
      selectedSeats.delete(seatId);
    } else {
      seatDiv.classList.add("selected");
      selectedSeats.add(seatId);
    }

    updateSummary(price);
  }

  function updateSummary(pricePerSeat) {
    const count = selectedSeats.size;

    // Update list
    if (count === 0) {
      seatDisplay.innerHTML = '<p class="muted">No seats selected</p>';
    } else {
      // Find labels
      const labels = [];
      document
        .querySelectorAll(".seat.selected")
        .forEach((s) => labels.push(s.dataset.seat));
      seatDisplay.textContent = labels.join(", ");
    }

    const base = count * pricePerSeat;
    const gst = base * 0.05;
    const total = base + gst;

    baseFareEl.textContent = `₹${base}`;
    gstEl.textContent = `₹${gst.toFixed(2)}`;
    totalEl.textContent = `₹${total.toFixed(2)}`;
  }

  // Continue to Payment
  const continueBtn = document.getElementById("continueBtn");
  if (continueBtn) {
    continueBtn.removeAttribute("onclick"); // remove inline nav
    continueBtn.addEventListener("click", () => {
      if (selectedSeats.size === 0) {
        alert("Please select at least one seat.");
        return;
      }
      // Save to localStorage
      const bookingData = {
        schedule_id: parseInt(scheduleId),
        seat_ids: Array.from(selectedSeats).map((id) => parseInt(id)),
        total_amount: totalEl.textContent,
        bus_name: document.querySelector(".bus-name").textContent,
        source: schedule.source,
        destination: schedule.destination,
        date: schedule.departure_time,
      };
      console.log("Booking data being saved:", bookingData);
      localStorage.setItem("currentBooking", JSON.stringify(bookingData));
      window.location.href = "./payment.html";
    });
  }
});
