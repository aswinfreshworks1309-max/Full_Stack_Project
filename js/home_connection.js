// Recap: Initializes the home page functionalities and event listeners.
document.addEventListener("DOMContentLoaded", () => {
  const myTicketsBtn = document.getElementById("myTicketsBtn");
  const modal = document.getElementById("ticketsModal");
  const closeModal = document.querySelector(".close-modal");
  const container = document.getElementById("ticketsContainer");
  const profileIcon = document.getElementById("profile");

  //profile icon code

  // Recap: Displays the user profile information in a premium popup.
  // Recap: Displays the user profile information in a premium popup.
  profileIcon.addEventListener("click", async () => {
    const userJson = localStorage.getItem("user");
    if (!userJson) {
      showToast("Please login to see profile.", "info");
      return;
    }
    const user = JSON.parse(userJson);

    // Fetch total journeys for the profile
    let totalJourneys = 0;
    try {
      const headers = { Authorization: `Bearer ${user.access_token}` };
      const res = await fetch(`${API_BASE_URL}/bookings/?user_id=${user.id}`, {
        headers,
      });
      const bookings = await res.json();

      // Group bookings to count actual journey sessions (not individual seats)
      const groups = bookings.reduce((acc, b) => {
        const time = b.booking_date ? b.booking_date.substring(0, 16) : "00";
        const key = `${b.schedule_id}_${time}`;
        acc[key] = true;
        return acc;
      }, {});
      totalJourneys = Object.keys(groups).length;
    } catch (e) {
      console.error("Error fetching journeys for profile:", e);
    }

    const oldOverlay = document.getElementById("profilePopupOverlay");
    if (oldOverlay) oldOverlay.remove();

    const overlay = document.createElement("div");
    overlay.id = "profilePopupOverlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(12px);
      z-index: 2000;
      display: flex;
      justify-content: center;
      align-items: center;
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
          padding: 40px;
          width: 400px;
          text-align: center;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 204, 0, 0.1);
          animation: slideUp 0.5s ease-out;
          color: white;
          position: relative;
        }
        .profile-avatar {
          width: 100px; height: 100px;
          background: linear-gradient(45deg, #ffcc00, #ff9900);
          border-radius: 50%;
          margin: 0 auto 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 45px;
          color: black;
          font-weight: 800;
          box-shadow: 0 0 25px rgba(255, 204, 0, 0.4);
          border: 4px solid #000;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin: 25px 0;
        }
        .stat-box {
          background: rgba(255, 255, 255, 0.03);
          padding: 15px;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .stat-value { color: #ffcc00; font-size: 20px; font-weight: 700; }
        .stat-label { color: #888; font-size: 12px; text-transform: uppercase; margin-top: 5px; }
      </style>
      <div class="profile-card">
        <button id="closeProfileX" style="
          position: absolute;
          top: 20px; right: 25px;
          background: none; border: none;
          color: #ffcc00; font-size: 32px;
          cursor: pointer; opacity: 0.7; transition: 0.3s;
        ">&times;</button>

        <div class="profile-avatar">
          ${user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
        </div>

        <h2 style="color: #ffcc00; margin-bottom: 5px; font-size: 28px;">${
          user.full_name
        }</h2>
        <p style="color: #aaa; margin-bottom: 30px; letter-spacing: 1px;">${
          user.role ? user.role.toUpperCase() : "TRAVELER"
        }</p>

        <div style="text-align: left; background: rgba(255,255,255,0.03); padding: 20px; border-radius: 18px; margin-bottom: 25px; border: 1px solid rgba(255,255,255,0.05);">
          <div style="margin-bottom: 15px;">
            <span style="color: #444; font-size: 11px; font-weight: 700; display: block; margin-bottom: 4px; text-transform: uppercase;">Email Address</span>
            <span style="color: #eee; font-size: 15px;">${user.email}</span>
          </div>
          <div>
            <span style="color: #444; font-size: 11px; font-weight: 700; display: block; margin-bottom: 4px; text-transform: uppercase;">Travel Mode</span>
            <span style="color: #ffcc00; font-size: 15px; font-weight: 600;">Executive Class</span>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-box">
             <div class="stat-value">${totalJourneys}</div>
             <div class="stat-label">Total Rides</div>
          </div>
          <div class="stat-box">
             <div class="stat-value" style="color: #4CAF50;">Active</div>
             <div class="stat-label">Status</div>
          </div>
        </div>

        <div style="display: flex; gap: 15px;">
          <button id="logoutBtn" style="
            flex: 1;
            padding: 14px;
            background: #cc0000;
            color: white;
            border: none;
            border-radius: 14px;
            cursor: pointer;
            font-weight: 700;
            transition: 0.3s;
          ">Log out</button>
          <button id="viewHistBtn" style="
            flex: 1.5;
            padding: 14px;
            background: #ffcc00;
            color: black;
            border: none;
            border-radius: 14px;
            cursor: pointer;
            font-weight: 700;
            transition: 0.3s;
          ">My Journeys</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closePopup = () => overlay.remove();
    document.getElementById("closeProfileX").onclick = closePopup;
    document.getElementById("closeProfileX").onmouseover = (e) =>
      (e.target.style.opacity = "1");
    document.getElementById("closeProfileX").onmouseout = (e) =>
      (e.target.style.opacity = "0.7");

    overlay.onclick = (e) => {
      if (e.target === overlay) closePopup();
    };

    document.getElementById("viewHistBtn").onclick = () => {
      closePopup();
      document.getElementById("myTicketsBtn").click();
    };

    document.getElementById("logoutBtn").onclick = () => {
      localStorage.removeItem("user");
      showToast("Logged out successfully!", "success");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1000);
    };
  });

  // Close Modal Logic
  if (closeModal) {
    closeModal.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });

  // Recap: Fetches and displays the booking history for the logged-in user.
  if (myTicketsBtn) {
    myTicketsBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      // Check Auth
      const userJson = localStorage.getItem("user");
      if (!userJson) {
        showToast("Please login to view your tickets.", "error");
        setTimeout(() => {
          window.location.href = "./pages/login.html";
        }, 1500);
        return;
      }
      const user = JSON.parse(userJson);

      // Show Modal & Loader
      modal.style.display = "flex";
      container.innerHTML =
        '<div class="loading"><img src="../assests/loading image.gif" alt="Loading..." height="50px" width="50px" style="background: transparent; color:rgba(255, 255, 255,0.015) ; object-fit: cover;"></div>';

      try {
        // Fetch Bookings
        const headers = { Authorization: `Bearer ${user.access_token}` };
        const res = await fetch(
          `${API_BASE_URL}/bookings/?user_id=${user.id}`,
          { headers },
        );
        const bookings = await res.json();

        if (bookings.length === 0) {
          container.innerHTML =
            '<div class="loading">No booking history found.</div>';
          return;
        }

        // Group bookings by schedule_id AND time to show multi-seat bookings as one ticket,
        // but separate booking sessions as different tickets.
        const groupedBookings = bookings.reduce((acc, booking) => {
          // Use schedule + minute-level timestamp to group items booked together
          const bookingTime = booking.booking_date
            ? booking.booking_date.substring(0, 16)
            : "unknown";
          const groupKey = `${booking.schedule_id}_${bookingTime}`;

          if (!acc[groupKey]) {
            acc[groupKey] = {
              schedule_id: booking.schedule_id,
              booking_ids: [],
              seat_ids: [],
              status: booking.status,
              booking_date: booking.booking_date,
            };
          }
          acc[groupKey].booking_ids.push(booking.id);
          acc[groupKey].seat_ids.push(booking.seat_id);
          return acc;
        }, {});

        const ticketsHtml = await Promise.all(
          Object.values(groupedBookings).map(async (group) => {
            try {
              const schedRes = await fetch(
                `${API_BASE_URL}/schedules/${group.schedule_id}`,
                { headers },
              );
              const schedule = await schedRes.json();

              // Fetch seats for this specific bus to get labels
              const busSeatsRes = await fetch(
                `${API_BASE_URL}/seats/?bus_id=${schedule.bus_id}`,
                { headers },
              );
              const busSeats = await busSeatsRes.json();

              const depDate = new Date(schedule.departure_time);
              const seats = group.seat_ids
                .map((sid) => {
                  const s = busSeats.find((seat) => seat.id === sid);
                  return s ? s.seat_label : ` ${sid}`;
                })
                .sort();

              return `
                        <div class="ticket-card">
                            <div class="ticket-info">
                                <label>Route</label>
                                <div>${schedule.source} → ${schedule.destination}</div>
                            </div>
                            <div class="ticket-info">
                                <label>Date & Time</label>
                                <div>${depDate.toLocaleDateString()} ${depDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                            </div>
                            <div class="ticket-info">
                                <label>Seats</label>
                                <div>${seats.join(", ")}</div>
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
                                <button class="view-ticket-btn" onclick="window.location.href='./ticket.html?booking_ids=${group.booking_ids.join(",")}'" style="
                                    background: #ffcc00;
                                    color: black;
                                    border: none;
                                    padding: 8px 15px;
                                    border-radius: 8px;
                                    font-weight: 600;
                                    cursor: pointer;
                                    transition: 0.3s;
                                    font-size: 13px;
                                ">View Ticket</button>
                            </div>
                        </div>
              `;
            } catch (err) {
              console.error(err);
              return `<div class="ticket-card" style="color:red">Error loading journey info.</div>`;
            }
          }),
        );

        container.innerHTML = ticketsHtml.join("");
      } catch (error) {
        console.error(error);
        container.innerHTML =
          '<div class="loading" style="color:red">Failed to load tickets.</div>';
      }
    });
  }
});
