document.addEventListener("DOMContentLoaded", async () => {
  let currentSchedules = [];
  let isEditing = false;
  let editId = null;
  let activeFilter = "all";

  // Recap: Retrieves authentication headers from local storage.
  const getAuthHeaders = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.access_token) {
      return {};
    }
    return { Authorization: `Bearer ${user.access_token}` };
  };

  // Recap: Handles 401 Unauthorized errors by redirecting to login.
  const handleAuthError = (res) => {
    if (res.status === 401) {
      localStorage.removeItem("user");
      showToast("Session expired. Please login again.", "error");
      window.location.href = "admin_login.html";
      return true;
    }
    return false;
  };

  // --- UTILS ---
  // Recap: Determines bus status (running, scheduled, completed) based on time.
  function getScheduleStatus(schedule) {
    const now = new Date();
    const dep = new Date(schedule.departure_time);
    const arr = new Date(schedule.arrival_time);

    if (now >= dep && now < arr) return "running";
    if (now < dep) return "scheduled";
    return "completed";
  }

  // Recap: Formats a date string into a localized readable format.
  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleString([], {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  // --- STATS FUNCTIONS ---
  // Recap: Fetches and updates dashboard statistics for buses and schedules.
  async function fetchStats() {
    try {
      // 1. Total Buses
      const busRes = await fetch(`${API_BASE_URL}/buses/`);
      if (busRes.status === 401) {
        console.warn("Buses locked");
      }
      const buses = await busRes.json();
      const totalBuses = Array.isArray(buses) ? buses.length : 0;

      // 2. Schedules
      const schedRes = await fetch(`${API_BASE_URL}/schedules/`);
      if (schedRes.status === 401) {
        console.warn("Schedules locked");
      }
      const schedules = await schedRes.json();

      let runningCount = 0;
      let scheduledCount = 0;
      let maintenanceCount = 0;
      const activeBusIds = new Set();
      const maintenanceBusIds = new Set();

      if (Array.isArray(schedules)) {
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
      }

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
    ".admin-info div:nth-child(1) div:nth-child(2)",
  );
  if (lastLoginEl) {
    const now = new Date();
    lastLoginEl.textContent = `Last login: Today, ${now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  // --- TABLE RENDERING ---
  // Recap: Dynamically renders the schedule table based on provided data.
  function renderTable(schedules, bookingCounts = {}) {
    const tbody = document.querySelector(".bus-table tbody");
    tbody.innerHTML = "";

    if (!Array.isArray(schedules) || schedules.length === 0) {
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
  // Recap: Fetches all schedules and associated booking counts from the API.
  async function fetchSchedules() {
    const tbody = document.querySelector(".bus-table tbody");
    tbody.innerHTML =
      '<tr><td colspan="8" style="text-align:center;">Loading schedules...</td></tr>';

    try {
      console.log("Fetching schedules from:", `${API_BASE_URL}/schedules/`);
      const response = await fetch(`${API_BASE_URL}/schedules/`);
      console.log("Schedules response status:", response.status);

      if (!response.ok) {
        const errText = await response.text();
        console.error("Schedule fetch error detail:", errText);
        throw new Error("Failed to fetch schedules");
      }

      currentSchedules = await response.json();
      console.log("Current Schedules:", currentSchedules);

      // Fetch Bookings to calculate booked seats
      let counts = {};
      try {
        const bRes = await fetch(`${API_BASE_URL}/bookings/`);
        if (bRes.ok) {
          const bookings = await bRes.json();
          console.log("Bookings refetched:", bookings.length);
          if (Array.isArray(bookings)) {
            bookings.forEach((b) => {
              counts[b.schedule_id] = (counts[b.schedule_id] || 0) + 1;
            });
          }
        }
      } catch (e) {
        console.warn("Failed to fetch bookings count", e);
      }

      renderTable(currentSchedules, counts);
    } catch (e) {
      console.error("Dashboard Error:", e);
      tbody.innerHTML =
        '<tr><td colspan="8" style="text-align:center; color:red;">Error loading data. Check console.</td></tr>';
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
  // Recap: Opens the modal to add a new bus.
  window.openAddBusModal = function () {
    const modal = document.getElementById("addBusModal");
    modal.style.display = "flex";
    document.getElementById("addBusForm").reset();
  };

  // Recap: Closes the add bus modal.
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
        const res = await fetch(`${API_BASE_URL}/buses/`, {
          method: "POST",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(newBus),
        });
        if (res.ok) {
          showToast("Bus Created Successfully!", "success");
          window.closeAddBusModal();
          fetchBusesForDropdown();
          fetchStats(); // Update bus count
        } else {
          const err = await res.json();
          showToast("Error: " + JSON.stringify(err), "error");
        }
      } catch (e) {
        console.error(e);
        showToast("Network Error", "error");
      }
    });
  }

  // --- SCHEDULE FUNCTIONS ---
  // Recap: Opens the edit modal and populates it with existing schedule data.
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

  // Recap: Deletes a specific schedule after confirmation.
  window.deleteSchedule = async function (id) {
    if (!confirm("Are you sure you want to delete this schedule?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/schedules/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        showToast("Schedule Deleted!", "success");
        window.location.reload(); // Simple reload implies fetching again
      } else {
        showToast("Failed to delete schedule.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Error deleting schedule.", "error");
    }
  };

  // Recap: Resets all seats and deletes bookings for a specific schedule.
  window.resetSeats = async function (scheduleId) {
    if (
      !confirm(
        "⚠️ Are you sure? This will DELETE all bookings for this schedule and make all seats available again.",
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/seats/reset/${scheduleId}`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        showToast(
          "Seats and Bookings have been reset successfully!",
          "success",
        );
        fetchStats();
        fetchSchedules();
      } else {
        const err = await res.json();
        showToast("Error: " + (err.detail || "Failed to reset"), "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Network Error. Ensure Backend is running.", "error");
    }
  };

  // Recap: Opens the modal to add a new travel schedule.
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

  // Recap: Closes the schedule edit/add modal.
  window.closeModal = function () {
    document.getElementById("editModal").style.display = "none";
  };

  // 3. Modal Logic - Bus Dropdown
  // Recap: Fetches the list of buses to populate the dropdown menu.
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
    fetch(`${API_BASE_URL}/buses/`, {
      headers: getAuthHeaders(),
    })
      .then((res) => {
        if (handleAuthError(res)) return;
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

  // Add Bus Button logic if missing
  const headerActions = document.querySelector(".filter-controls");
  if (!document.getElementById("addBusBtn")) {
    const addBusBtn = document.createElement("button");
    addBusBtn.id = "addBusBtn";
    addBusBtn.className = "filter-btn glow-btn";
    addBusBtn.style.backgroundColor = "#4CAF50";
    addBusBtn.style.color = "#fff";
    addBusBtn.style.marginRight = "10px";
    addBusBtn.textContent = "+ Add Bus";
    addBusBtn.onclick = window.openAddBusModal;
    headerActions.appendChild(addBusBtn);
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
        showToast("Please select a bus", "error");
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
        showToast("Please select dates", "error");
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
        let url = `${API_BASE_URL}/schedules/`;
        let method = "POST";
        if (isEditing && editId) {
          url = `${API_BASE_URL}/schedules/${editId}`;
          method = "PUT";
        }

        const res = await fetch(url, {
          method: method,
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(newSchedule),
        });

        if (res.ok) {
          showToast(
            isEditing ? "Schedule Updated!" : "Schedule Added!",
            "success",
          );
          document.getElementById("editModal").style.display = "none";
          fetchSchedules(); // Refresh table
          fetchStats(); // Refresh stats
        } else {
          const err = await res.json();
          showToast("Error: " + JSON.stringify(err), "error");
        }
      } catch (e) {
        console.error(e);
        showToast("Network Error", "error");
      }
    });
  }
});
