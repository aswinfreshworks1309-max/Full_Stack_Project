// This script handles the Seat Selection layout, price calculation, and the "Continue to Payment" button.
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Get the Schedule ID from the URL (e.g., ?schedule_id=5)
  const params = new URLSearchParams(window.location.search);
  const scheduleId = params.get("schedule_id");

  if (!scheduleId) {
    showToast("No schedule selected. Please search for a bus first.", "error");
    window.location.href = "../index.html";
    return;
  }

  // 2. Fetch all the data we need from the Backend: Schedule, Bus, and Booked Seats
  const user = JSON.parse(localStorage.getItem("user"));
  const headers = user?.access_token
    ? { Authorization: `Bearer ${user.access_token}` }
    : {};

  try {
    // A. Get Schedule Details (Source, Destination, Time, Price)
    const schedRes = await fetch(`${API_BASE_URL}/schedules/${scheduleId}`, {
      headers,
    });
    const schedule = await schedRes.json();

    // B. Get Bus Details (Name, Type)
    const busRes = await fetch(`${API_BASE_URL}/buses/${schedule.bus_id}`, {
      headers,
    });
    const bus = await busRes.json();
 
    // C. Get All Seats for this bus
    const seatsRes = await fetch(
      `${API_BASE_URL}/seats/?bus_id=${schedule.bus_id}`,
      { headers },
    );
    const seats = await seatsRes.json();

    // D. Get Current Bookings for this schedule (to know which seats are already taken)
    const bookingsRes = await fetch(
      `${API_BASE_URL}/bookings/?schedule_id=${scheduleId}`,
      { headers },
    );
    const bookings = await bookingsRes.json();

    // Create a "Set" of seat IDs that are already booked
    const bookedSeatIds = new Set(bookings.map((b) => b.seat_id));

    // Update the visual info and draw the seats
    updatePageInfo(schedule, bus);
    renderSeats(seats, bookedSeatIds, schedule.price);
  } catch (err) {
    console.error("Error loading seat data:", err);
    showToast("Could not load seat map. Please check your internet.", "error");
  }

  // --- Helper Functions ---

  // Updates the text at the top of the page (Bus name, Route, Time)
  function updatePageInfo(schedule, bus) {
    document.querySelector(".bus-name").textContent =
      bus.bus_number;
    document.querySelector(".bus-type").textContent =
      bus.bus_type || "Luxury Service";

    // Set Origin and Destination
    const routeLabels = document.querySelectorAll(".journey-value");
    if (routeLabels.length >= 3) {
      routeLabels[0].textContent = schedule.source;
      routeLabels[2].textContent = schedule.destination;
    }

    // Set Times
    const timeLabels = document.querySelectorAll(".journey-small");
    if (timeLabels.length >= 2) {
      const dep = new Date(schedule.departure_time);
      const arr = new Date(schedule.arrival_time);
      timeLabels[0].textContent = dep.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      timeLabels[1].textContent = arr.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  // This draws the Seat Map on the screen
  function renderSeats(seats, bookedSet, basePrice) {
    const layoutContainer = document.getElementById("busLayout");
    if (!layoutContainer) return;

    // Clear everything except the driver section
    const driver = layoutContainer.querySelector(".driver-section");
    layoutContainer.innerHTML = "";
    if (driver) layoutContainer.appendChild(driver);

    // Sort seats by their label (e.g., A1, A2, B1...)
    seats.sort((a, b) =>
      a.seat_label.localeCompare(b.seat_label, undefined, { numeric: true }),
    );

    let row = document.createElement("div");
    row.className = "seat-row";

    seats.forEach((seat, index) => {
      // 1. Create the Seat box
      const seatDiv = document.createElement("div");
      const isBooked = bookedSet.has(seat.id);

      seatDiv.className = `seat ${isBooked ? "booked" : "available"}`;
      seatDiv.textContent = seat.seat_label;

      // Save data on the element so we can use it later
      seatDiv.dataset.id = seat.id;
      seatDiv.dataset.label = seat.seat_label;
      seatDiv.dataset.price = basePrice;

      // 2. If it's available, allow the user to click it
      if (!isBooked) {
        seatDiv.addEventListener("click", () => handleSeatClick(seatDiv));
      }

      row.appendChild(seatDiv);

      // 3. Add an "Aisle" (gap) after every 2 seats in a row of 4
      if ((index + 1) % 4 !== 0 && (index + 1) % 2 === 0) {
        const aisle = document.createElement("div");
        aisle.className = "aisle";
        row.appendChild(aisle);
      }

      // 4. Start a new row after every 4 seats
      if ((index + 1) % 4 === 0) {
        layoutContainer.appendChild(row);
        row = document.createElement("div");
        row.className = "seat-row";
      }
    });

    // Add any leftover seats
    if (row.hasChildNodes()) layoutContainer.appendChild(row);
  }

  const selectedSeats = new Set();

  function handleSeatClick(seatDiv) {
    const seatId = seatDiv.dataset.id;
    const price = parseFloat(seatDiv.dataset.price);

    // Toggle logic: If already selected, remove it. If not, add it.
    if (seatDiv.classList.contains("selected")) {
      seatDiv.classList.remove("selected");
      selectedSeats.delete(seatId);
    } else {
      seatDiv.classList.add("selected");
      selectedSeats.add(seatId);
    }

    // Update the price summary at the bottom
    calculateTotal(price);
  }

  function calculateTotal(pricePerSeat) {
    const count = selectedSeats.size;
    const base = count * pricePerSeat;
    const gst = base * 0.05; // 5% TAX
    const total = base + gst;

    // Show labels of selected seats (e.g., "A1, B2")
    const labels = [];
    document
      .querySelectorAll(".seat.selected")
      .forEach((s) => labels.push(s.dataset.label));

    document.getElementById("seatDisplay").textContent =
      count > 0 ? labels.join(", ") : "No seats selected";
    document.getElementById("baseFare").textContent = `₹${base}`;
    document.getElementById("gst").textContent = `₹${gst.toFixed(2)}`;
    document.getElementById("totalAmount").textContent = `₹${total.toFixed(2)}`;
  }

  // --- Continue to Payment ---
  const continueBtn = document.getElementById("continueBtn");
  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      if (selectedSeats.size === 0) {
        showToast("Please select at least one seat.", "error");
        return;
      }

      // Save the booking info in the browser's temporary memory
      const bookingData = {
        schedule_id: parseInt(scheduleId),
        seat_ids: Array.from(selectedSeats).map(Number),
        total_amount: document.getElementById("totalAmount").textContent,
      };

      localStorage.setItem("currentBooking", JSON.stringify(bookingData));

      // Go to the payment page
      window.location.href = "./payment.html";
    });
  }
});
