document.addEventListener("DOMContentLoaded", async () => {
  let currentSchedules = [];
  let isEditing = false;
  let editId = null;
  let activeFilter = "all";

  // --- UTILS ---
  function getScheduleStatus(schedule) {
    const now = new Date();
    const dep = new Date(schedule.departure_time);
    const arr = new Date(schedule.arrival_time);

    if (now >= dep && now < arr) return "running";
    if (now < dep) return "scheduled";
    return "completed";
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleString([], {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  // --- STATS FUNCTIONS ---
  async function fetchStats() {
    try {
      // 1. Total Buses
      const busRes = await fetch(`${API_BASE_URL}/api/buses/`);
      const buses = await busRes.json();
      const totalBuses = buses.length;

      // 2. Schedules
      const schedRes = await fetch(`${API_BASE_URL}/api/schedules/`);
      const schedules = await schedRes.json();

      let runningCount = 0;
      let scheduledCount = 0;
      let maintenanceCount = 0;
      const activeBusIds = new Set();
      const maintenanceBusIds = new Set();

      schedules.forEach((s) => {
        // Use DB status if explicitly set, else fallback
        let status = s.status || getScheduleStatus(s);
        status = status.toLowerCase();

        if (status === "running") {
          runningCount++;
          activeBusIds.add(s.bus_id);
        } else if (status === "scheduled") {
          scheduledCount++;
          activeBusIds.add(s.bus_id);
        } else if (status === "maintenance") {
          maintenanceBusIds.add(s.bus_id);
        }
      });

      maintenanceCount = maintenanceBusIds.size;

      // Update UI
      const statCards = document.querySelectorAll(".stat-value");
      if (statCards.length >= 4) {
        statCards[0].textContent = runningCount;
        statCards[1].textContent = totalBuses;
        statCards[2].textContent = scheduledCount;
        statCards[3].textContent = maintenanceCount;
      }
    } catch (e) {
      console.error("Error fetching stats:", e);
    }
  }

  // --- LOGIN TIME ---
  const lastLoginEl = document.querySelector(
    ".admin-info div:nth-child(1) div:nth-child(2)"
  );
  if (lastLoginEl) {
    const now = new Date();
    lastLoginEl.textContent = `Last login: Today, ${now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  // --- TABLE RENDERING ---
  function renderTable(schedules, bookingCounts = {}) {
    const tbody = document.querySelector(".bus-table tbody");
    tbody.innerHTML = "";

    if (schedules.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="8" style="text-align:center;">No schedules found.</td></tr>';
      return;
    }

    schedules.forEach((schedule) => {
      let status = schedule.status || getScheduleStatus(schedule);

      if (
        activeFilter !== "all" &&
        status.toLowerCase() !== activeFilter.toLowerCase()
      )
        return;

      const tr = document.createElement("tr");

      let statusLabel =
        status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      let statusLower = status.toLowerCase();

      let statusStyle = "";
      if (statusLower === "scheduled") {
        statusStyle = "background:#e3f2fd; color:#0d47a1;";
      } else if (statusLower === "completed") {
        statusStyle = "background:#eee; color:#666;";
      } else if (statusLower === "maintenance") {
        statusStyle = "background:#fff3cd; color:#856404;";
      } else if (statusLower === "cancelled") {
        statusStyle = "background:#f8d7da; color:#721c24;";
      } else {
        // Running
        statusStyle = "background:#e6fffa; color:#2c7a7b;";
      }

      const booked = bookingCounts[schedule.id] || 0;
      const capacity = 40;

      tr.innerHTML = `
                <td><span class="bus-number glow-text">Bus #${
                  schedule.bus_id
                }</span></td>
                <td>${schedule.source} → ${schedule.destination}</td>
                <td>${formatDate(schedule.departure_time)}</td>
                <td>${formatDate(schedule.arrival_time)}</td>
                <td>
                    <span class="status-badge" style="${statusStyle}">
                        ${statusLabel}
                    </span>
                </td>
                <td>₹${schedule.price}</td>
                <td>${booked}/${capacity} Booked</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn btn-edit glow-btn" onclick="openEditModal(${
                          schedule.id
                        })">Edit</button>
                        <button class="action-btn btn-delete glow-btn" onclick="deleteSchedule(${
                          schedule.id
                        })">Delete</button>
                        <button class="action-btn btn-reset glow-btn" onclick="resetSeats(${
                          schedule.id
                        })">Reset</button>
                    </div>
                </td>
            `;
      tbody.appendChild(tr);
    });
  }

  // --- SCHEDULE FETCH ---
  async function fetchSchedules() {
    const tbody = document.querySelector(".bus-table tbody");
    tbody.innerHTML =
      '<tr><td colspan="8" style="text-align:center;">Loading schedules...</td></tr>';

    try {
      const response = await fetch(`${API_BASE_URL}/api/schedules/`);
      if (!response.ok) throw new Error("Failed to fetch schedules");
      currentSchedules = await response.json();

      // Fetch Bookings to calculate booked seats
      let counts = {};
      try {
        const bRes = await fetch(`${API_BASE_URL}/api/bookings/`);
        if (bRes.ok) {
          const bookings = await bRes.json();
          bookings.forEach((b) => {
            counts[b.schedule_id] = (counts[b.schedule_id] || 0) + 1;
          });
        }
      } catch (e) {
        console.warn("Failed to fetch bookings count", e);
      }

      renderTable(currentSchedules, counts);
    } catch (e) {
      console.error(e);
      tbody.innerHTML =
        '<tr><td colspan="8" style="text-align:center; color:red;">Error loading data.</td></tr>';
    }
  }

  // --- FILTERS ---
  const filterBtns = document.querySelectorAll(".filter-btn");
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Remove active class
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const text = btn.textContent.trim().toLowerCase();
      if (text.includes("all")) activeFilter = "all";
      else if (text.includes("running")) activeFilter = "running";
      else if (text.includes("scheduled")) activeFilter = "scheduled";
      else if (text.includes("maintenance"))
        activeFilter = "maintenance"; // Will return 0 results
      else activeFilter = "all";

      renderTable(currentSchedules);
    });
  });

  // --- INIT ---
  fetchStats();
  fetchSchedules();
  fetchBusesForDropdown();

  // --- BUS FUNCTIONS ---
  window.openAddBusModal = function () {
    const modal = document.getElementById("addBusModal");
    modal.style.display = "flex";
    document.getElementById("addBusForm").reset();
  };

  window.closeAddBusModal = function () {
    const modal = document.getElementById("addBusModal");
    modal.style.display = "none";
  };

  const addBusForm = document.getElementById("addBusForm");
  if (addBusForm) {
    addBusForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newBus = {
        bus_number: document.getElementById("newBusNumber").value,
        plate_number: document.getElementById("newPlateNumber").value,
        bus_type: document.getElementById("newBusType").value,
        total_seats: parseInt(document.getElementById("newTotalSeats").value),
        operator_name: document.getElementById("newOperatorName").value,
      };
      try {
        const res = await fetch(`${API_BASE_URL}/api/buses/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newBus),
        });
        if (res.ok) {
          alert("Bus Created Successfully!");
          window.closeAddBusModal();
          fetchBusesForDropdown();
          fetchStats(); // Update bus count
        } else {
          const err = await res.json();
          alert("Error: " + JSON.stringify(err));
        }
      } catch (e) {
        console.error(e);
        alert("Network Error");
      }
    });
  }

  // --- SCHEDULE FUNCTIONS ---
  window.openEditModal = function (id) {
    const schedule = currentSchedules.find((s) => s.id === id);
    if (!schedule) return;

    isEditing = true;
    editId = id;

    const modal = document.getElementById("editModal");
    const header = modal.querySelector(".modal-header");
    header.textContent = "Edit Schedule";

    if (document.getElementById("busSelect")) {
      document.getElementById("busSelect").value = schedule.bus_id;
    }
    document.getElementById("departureLocation").value = schedule.source;
    document.getElementById("arrivalLocation").value = schedule.destination;

    const depTime = new Date(schedule.departure_time)
      .toISOString()
      .slice(0, 16);
    const arrTime = new Date(schedule.arrival_time).toISOString().slice(0, 16);

    document.getElementById("departureTime").value = depTime;
    document.getElementById("arrivalTime").value = arrTime;
    if (document.getElementById("schedulePrice")) {
      document.getElementById("schedulePrice").value = schedule.price;
    }

    // Set Status
    if (document.getElementById("busStatus")) {
      const currentStatus = schedule.status || getScheduleStatus(schedule);
      // Normalize to Title Case for dropdown value matching
      const val =
        currentStatus.charAt(0).toUpperCase() +
        currentStatus.slice(1).toLowerCase();

      let found = false;
      const options = document.getElementById("busStatus").options;
      for (let i = 0; i < options.length; i++) {
        if (options[i].value.toLowerCase() === val.toLowerCase()) {
          document.getElementById("busStatus").value = options[i].value;
          found = true;
          break;
        }
      }
      if (!found) document.getElementById("busStatus").value = "Scheduled";
    }

    modal.style.display = "flex";
  };

  window.deleteSchedule = async function (id) {
    if (!confirm("Are you sure you want to delete this schedule?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/schedules/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("Schedule Deleted!");
        window.location.reload(); // Simple reload implies fetching again
      } else {
        alert("Failed to delete schedule.");
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting schedule.");
    }
  };

  window.resetSeats = async function (scheduleId) {
    if (
      !confirm(
        "⚠️ Are you sure? This will DELETE all bookings for this schedule and make all seats available again."
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/seats/reset/${scheduleId}`, {
        method: "POST",
      });

      if (res.ok) {
        alert("Seats and Bookings have been reset successfully!");
        fetchStats();
        fetchSchedules();
      } else {
        const err = await res.json();
        alert("Error: " + (err.detail || "Failed to reset"));
      }
    } catch (e) {
      console.error(e);
      alert("Network Error. Ensure Backend is running.");
    }
  };

  window.openAddModal = function () {
    isEditing = false;
    editId = null;

    const modal = document.getElementById("editModal");
    const header = modal.querySelector(".modal-header");
    header.textContent = "Add New Schedule";

    const form = document.querySelector("form:not(#addBusForm)");
    if (form) form.reset();

    const now = new Date();
    const toLocalISO = (date) => {
      const offset = date.getTimezoneOffset() * 60000;
      const local = new Date(date.getTime() - offset);
      return local.toISOString().slice(0, 16);
    };
    document.getElementById("departureTime").value = toLocalISO(now);
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
    document.getElementById("arrivalTime").value = toLocalISO(nextHour);
    if (document.getElementById("schedulePrice")) {
      document.getElementById("schedulePrice").value = "500";
    }

    modal.style.display = "flex";
  };

  window.closeModal = function () {
    document.getElementById("editModal").style.display = "none";
  };

  // 3. Modal Logic - Bus Dropdown
  function fetchBusesForDropdown() {
    let select = document.getElementById("busSelect");
    if (!select) {
      const originalInput = document.getElementById("busNumber");
      if (originalInput) {
        if (originalInput.tagName === "SELECT") {
          select = originalInput;
          select.id = "busSelect";
        } else if (originalInput.tagName === "INPUT") {
          select = document.createElement("select");
          select.className = "form-input";
          select.id = "busSelect";
          originalInput.parentNode.replaceChild(select, originalInput);
        }
      }
    }
    if (!select) return;

    select.innerHTML = '<option value="">Loading buses...</option>';
    fetch(`${API_BASE_URL}/api/buses/`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch buses");
        return res.json();
      })
      .then((buses) => {
        select.innerHTML = "";
        if (buses.length === 0) {
          select.innerHTML = '<option value="">No buses available</option>';
          return;
        }
        buses.forEach((bus) => {
          const opt = document.createElement("option");
          opt.value = bus.id;
          opt.textContent = `${bus.bus_number} (${bus.bus_type})`;
          select.appendChild(opt);
        });
      })
      .catch((err) => {
        console.error(err);
        select.innerHTML = '<option value="">Error loading buses</option>';
      });
  }

  // 4. Save Handler for Schedules
  // Add Schedule Button logic if missing
  const headerActions = document.querySelector(".filter-controls");
  if (!document.getElementById("addScheduleBtn")) {
    const addBusBtn = document.createElement("button");
    addBusBtn.id = "addBusBtn";
    addBusBtn.className = "filter-btn glow-btn";
    addBusBtn.style.backgroundColor = "#4CAF50";
    addBusBtn.style.color = "#fff";
    addBusBtn.style.marginRight = "10px";
    addBusBtn.textContent = "+ Add Bus";
    addBusBtn.onclick = window.openAddBusModal;
    headerActions.appendChild(addBusBtn);

    const addScheduleBtn = document.createElement("button");
    addScheduleBtn.id = "addScheduleBtn";
    addScheduleBtn.className = "filter-btn glow-btn";
    addScheduleBtn.style.backgroundColor = "#f7c843";
    addScheduleBtn.style.borderColor = "#f7c843";
    addScheduleBtn.style.color = "#000";
    addScheduleBtn.style.fontWeight = "bold";
    addScheduleBtn.textContent = "+ Add Schedule";
    addScheduleBtn.onclick = window.openAddModal;
    headerActions.appendChild(addScheduleBtn);
  }

  // Save Button Handler
  const saveBtn = document.querySelector(".btn-save:not([type='submit'])");
  if (saveBtn) {
    saveBtn.removeAttribute("onclick");
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

    newSaveBtn.addEventListener("click", async () => {
      const busSelect = document.getElementById("busSelect");
      const busId = busSelect ? busSelect.value : null;

      if (!busId) {
        alert("Please select a bus");
        return;
      }
      const source = document.getElementById("departureLocation").value;
      const destination = document.getElementById("arrivalLocation").value;
      const depTime = document.getElementById("departureTime").value;
      const arrTime = document.getElementById("arrivalTime").value;
      const price = document.getElementById("schedulePrice")
        ? document.getElementById("schedulePrice").value
        : "100";

      const statusInput = document.getElementById("busStatus");
      const status = statusInput ? statusInput.value : "Scheduled";

      if (!depTime || !arrTime) {
        alert("Please select dates");
        return;
      }

      const newSchedule = {
        bus_id: parseInt(busId),
        route_id: "Custom",
        source: source,
        destination: destination,
        departure_time: new Date(depTime).toISOString(),
        arrival_time: new Date(arrTime).toISOString(),
        price: parseFloat(price) || 500.0,
        available_seats: 40,
        status: status,
      };

      try {
        let url = `${API_BASE_URL}/api/schedules/`;
        let method = "POST";
        if (isEditing && editId) {
          url = `${API_BASE_URL}/api/schedules/${editId}`;
          method = "PUT";
        }

        const res = await fetch(url, {
          method: method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSchedule),
        });

        if (res.ok) {
          alert(isEditing ? "Schedule Updated!" : "Schedule Added!");
          document.getElementById("editModal").style.display = "none";
          fetchSchedules(); // Refresh table
          fetchStats(); // Refresh stats
        } else {
          const err = await res.json();
          alert("Error: " + JSON.stringify(err));
        }
      } catch (e) {
        console.error(e);
        alert("Network Error");
      }
    });
  }
});
