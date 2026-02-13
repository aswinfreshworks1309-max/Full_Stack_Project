// This script handles the Home page: Profile popup and Booking History (My Tickets)
document.addEventListener("DOMContentLoaded", () => {
  const myTicketsBtn = document.getElementById("myTicketsBtn");
  const modal = document.getElementById("ticketsModal");
  const closeModal = document.querySelector(".close-modal");
  const container = document.getElementById("ticketsContainer");
  const profileIcon = document.getElementById("profile");

  let cachedTotalJourneys = null;

  // --- SECTION 1: Profile Popup Logic ---
  if (profileIcon) {
    profileIcon.addEventListener("click", () => {
      const userJson = localStorage.getItem("user");
      if (!userJson) {
        showToast("Please login to see profile.", "info");
        return;
      }
      const user = JSON.parse(userJson);

      const oldOverlay = document.getElementById("profilePopupOverlay");
      if (oldOverlay) oldOverlay.remove();

      const overlay = document.createElement("div");
      overlay.id = "profilePopupOverlay";
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
        z-index: 2000; display: flex; justify-content: center; align-items: center;
        animation: fadeIn 0.4s ease-out;
      `;

      overlay.innerHTML = `
        <style>
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          .profile-card {
            background: linear-gradient(145deg, #1a1a1a, #0d0d0d);
            border: 1px solid rgba(255, 204, 0, 0.3);
            border-radius: 24px;
            padding: 40px; width: 400px; text-align: center;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
            animation: slideUp 0.5s ease-out; color: white; position: relative;
          }
          .profile-avatar {
            width: 100px; height: 100px;
            background: linear-gradient(45deg, #ffcc00, #ff9900);
            border-radius: 50%; margin: 0 auto 20px;
            display: flex; justify-content: center; align-items: center;
            font-size: 45px; color: black; font-weight: 800;
            box-shadow: 0 0 25px rgba(255, 204, 0, 0.4); border: 4px solid #000;
          }
          .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0; }
          .stat-box { background: rgba(255, 255, 255, 0.03); padding: 15px; border-radius: 15px; border: 1px solid rgba(255, 255, 255, 0.05); }
          .stat-value { color: #ffcc00; font-size: 20px; font-weight: 700; }
          .stat-label { color: #888; font-size: 12px; text-transform: uppercase; margin-top: 5px; }
          .dot-flashing { position: relative; width: 10px; height: 10px; border-radius: 5px; background-color: #ffcc00; animation: dot-flashing 1s infinite linear alternate; margin: 0 auto; }
          @keyframes dot-flashing { 0% { background-color: #ffcc00; } 50%, 100% { background-color: rgba(255, 204, 0, 0.2); } }
        </style>
        <div class="profile-card">
          <button id="closeProfileX" style="position: absolute; top: 20px; right: 25px; background: none; border: none; color: #ffcc00; font-size: 32px; cursor: pointer;">&times;</button>
          
          <div class="profile-avatar">
            ${user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
          </div>

          <h2 style="color: #ffcc00; margin-bottom: 5px; font-size: 28px;">${user.full_name}</h2>
          <p style="color: #aaa; margin-bottom: 30px; letter-spacing: 1px;">${user.role.toUpperCase()}</p>

          <div style="text-align: left; background: rgba(255,255,255,0.03); padding: 20px; border-radius: 18px; margin-bottom: 25px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="margin-bottom: 15px;">
              <span style="color: #444; font-size: 11px; font-weight: 700; display: block; margin-bottom: 4px; text-transform: uppercase;">Email Address</span>
              <span style="color: #eee; font-size: 15px;">${user.email}</span>
            </div>
            <div>
              <span style="color: #444; font-size: 11px; font-weight: 700; display: block; margin-bottom: 4px; text-transform: uppercase;">Role</span>
              <span style="color: #ffcc00; font-size: 15px; font-weight: 600;">${user.role}</span>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-box">
               <div class="stat-value" id="totalJourneysCount"><div class="dot-flashing"></div></div>
               <div class="stat-label">Total Rides</div>
            </div>
            <div class="stat-box">
               <div class="stat-value" style="color: #4CAF50;">Active</div>
               <div class="stat-label">Status</div>
            </div>
          </div>

          <div style="display: flex; gap: 15px;">
            <button id="logoutBtn" style="flex: 1; padding: 14px; background: #cc0000; color: white; border: none; border-radius: 14px; cursor: pointer; font-weight: 700;">Log out</button>
            <button id="viewHistBtn" style="flex: 1.5; padding: 14px; background: #ffcc00; color: black; border: none; border-radius: 14px; cursor: pointer; font-weight: 700;">My Journeys</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      // Fetch journey count in background
      (async () => {
        if (cachedTotalJourneys !== null) {
          const el = document.getElementById("totalJourneysCount");
          if (el) el.innerText = cachedTotalJourneys;
          return;
        }
        try {
          const res = await fetch(
            `${API_BASE_URL}/bookings/?user_id=${user.id}`,
            {
              headers: { Authorization: `Bearer ${user.access_token}` },
            },
          );
          const bookings = await res.json();
          const groups = bookings.reduce((acc, b) => {
            const time = b.booking_date ? b.booking_date.substring(0, 16) : "0";
            acc[`${b.schedule_id}_${time}`] = true;
            return acc;
          }, {});
          cachedTotalJourneys = Object.keys(groups).length;
          const el = document.getElementById("totalJourneysCount");
          if (el) el.innerText = cachedTotalJourneys;
        } catch (e) {
          const el = document.getElementById("totalJourneysCount");
          if (el) el.innerText = "0";
        }
      })();

      const closePopup = () => overlay.remove();
      document.getElementById("closeProfileX").onclick = closePopup;
      overlay.onclick = (e) => {
        if (e.target === overlay) closePopup();
      };
      document.getElementById("viewHistBtn").onclick = () => {
        closePopup();
        myTicketsBtn.click();
      };
      document.getElementById("logoutBtn").onclick = () => {
        localStorage.removeItem("user");
        showToast("Logged out successfully!", "success");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 1000);
      };
    });
  }

  // --- SECTION 2: Modal Logic ---
  if (closeModal)
    closeModal.onclick = () => {
      modal.style.display = "none";
    };
  window.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };

  // --- SECTION 3: Detailed Ticket Cards ---
  if (myTicketsBtn) {
    myTicketsBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const userJson = localStorage.getItem("user");
      if (!userJson) {
        showToast("Please login.", "error");
        return;
      }
      const user = JSON.parse(userJson);

      modal.style.display = "flex";
      container.innerHTML =
        '<div class="loading">Fetching your tickets...</div>';

      try {
        const headers = { Authorization: `Bearer ${user.access_token}` };
        const res = await fetch(
          `${API_BASE_URL}/bookings/?user_id=${user.id}`,
          { headers },
        );
        const bookings = await res.json();

        if (bookings.length === 0) {
          container.innerHTML = '<div class="loading">No tickets found.</div>';
          return;
        }

        // Group bookings to show multi-seat journeys as one ticket
        const grouped = bookings.reduce((acc, b) => {
          const time = b.booking_date ? b.booking_date.substring(0, 16) : "0";
          const key = `${b.schedule_id}_${time}`;
          if (!acc[key])
            acc[key] = { ...b, booking_ids: [b.id], seat_ids: [b.seat_id] };
          else {
            acc[key].booking_ids.push(b.id);
            acc[key].seat_ids.push(b.seat_id);
          }
          return acc;
        }, {});

        const ticketsHtml = await Promise.all(
          Object.values(grouped).map(async (group) => {
            try {
              const schedRes = await fetch(
                `${API_BASE_URL}/schedules/${group.schedule_id}`,
                { headers },
              );
              const schedule = await schedRes.json();

              // Fetch seat labels for this bus
              const seatsRes = await fetch(
                `${API_BASE_URL}/seats/?bus_id=${schedule.bus_id}`,
                { headers },
              );
              const allSeats = await seatsRes.json();
              const seatLabels = group.seat_ids
                .map((sid) => {
                  const s = allSeats.find((seat) => seat.id === sid);
                  return s ? s.seat_label : sid;
                })
                .sort()
                .join(", ");

              return `
              <div class="ticket-card">
                  <div class="ticket-info">
                      <label>Route</label>
                      <div>${schedule.source} → ${schedule.destination}</div>
                  </div>
                  <div class="ticket-info">
                      <label>Date & Time</label>
                      <div>${new Date(group.booking_date).toLocaleDateString()} ${new Date(group.booking_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                  <div class="ticket-info">
                      <label>Seats</label>
                      <div>${seatLabels}</div>
                  </div>
                  <div class="ticket-info">
                      <label>Total Price</label>
                      <div>₹${schedule.price * group.seat_ids.length}</div>
                  </div>
                  <div class="ticket-info">
                      <label>Status</label>
                      <div><span class="status-badge status-${group.status}">${group.status}</span></div>
                  </div>
                  <div class="ticket-info" style="display: flex; align-items: flex-end;">
                      <button class="view-ticket-btn" onclick="window.location.href='./ticket.html?booking_ids=${group.booking_ids.join(",")}'" style="background: #ffcc00; color: black; border: none; padding: 8px 15px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px;">View Ticket</button>
                  </div>
              </div>
            `;
            } catch (err) {
              return '<div class="ticket-card">Error loading journey info.</div>';
            }
          }),
        );

        container.innerHTML = ticketsHtml.join("");
      } catch (err) {
        container.innerHTML =
          '<div class="loading" style="color:red">Failed to load tickets.</div>';
      }
    });
  }
});
