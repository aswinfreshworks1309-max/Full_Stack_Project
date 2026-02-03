// Recap: Initializes the home page functionalities and event listeners.
document.addEventListener("DOMContentLoaded", () => {
  const myTicketsBtn = document.getElementById("myTicketsBtn");
  const modal = document.getElementById("ticketsModal");
  const closeModal = document.querySelector(".close-modal");
  const container = document.getElementById("ticketsContainer");
  const profileIcon = document.getElementById("profile");

  //profile icon code

  // Recap: Displays the user profile information in a premium popup.
  profileIcon.addEventListener("click", () => {
    const userJson = localStorage.getItem("user");
    if (!userJson) {
      showToast("Please login to see profile.", "info");
      return;
    }
    //converting string to json object
    const user = JSON.parse(userJson);

    const oldOverlay = document.getElementById("profilePopupOverlay");
    if (oldOverlay) oldOverlay.remove();

    const overlay = document.createElement("div");
    overlay.id = "profilePopupOverlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(8px);
      z-index: 2000;
      display: flex;
      justify-content: center;
      align-items: center;
    `;

    overlay.innerHTML = `
      <div style="
        background: rgba(20, 20, 20, 0.95);
        border: 2px solid #ffcc00;
        border-radius: 20px;
        padding: 40px;
        width: 350px;
        text-align: center;
        box-shadow: 0 0 30px rgba(255, 204, 0, 0.2);
        position: relative;
        color: white;
      ">
        <button id="closeProfileX" style="
          position: absolute;
          top: 15px; right: 20px;
          background: none; border: none;
          color: #ffcc00; font-size: 28px;
          cursor: pointer;
        ">&times;</button>

        <div style="
          width: 80px; height: 80px;
          background: #ffcc00;
          border-radius: 50%;
          margin: 0 auto 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 35px;
          color: black;
          font-weight: bold;
          box-shadow: 0 0 15px rgba(255, 204, 0, 0.5);
        ">
          ${user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
        </div>

        <h2 style="color: #ffcc00; margin-bottom: 5px;">${user.full_name}</h2>
        <p style="color: #888; margin-bottom: 25px;">${user.role || "Traveler"}</p>

        <div style="text-align: left; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; margin-bottom: 25px;">
          <p style="margin-bottom: 10px; font-size: 14px;">
            <span style="color: #ffcc00; font-weight: 600;">Email:</span> ${user.email}
          </p>
          <p style="font-size: 14px;">
            <span style="color: #ffcc00; font-weight: 600;">Account Status:</span> 
            <span style="color: #4CAF50;">Active</span>
          </p>
        </div>

        <div style="display: flex; gap: 10px;">
          <button id="logoutBtn" style="
            flex: 1;
            padding: 12px;
            background: #cc0000;
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
            transition: 0.3s;
          ">Logout</button>
          <button id="closeProfileBtn" style="
            flex: 1;
            padding: 12px;
            background: #ffcc00;
            color: black;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
            transition: 0.3s;
          ">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closePopup = () => overlay.remove();
    document.getElementById("closeProfileX").onclick = closePopup;
    document.getElementById("closeProfileBtn").onclick = closePopup;
    overlay.onclick = (e) => {
      if (e.target === overlay) closePopup();
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

        // Group bookings by schedule_id to show multi-seat bookings as one ticket
        const groupedBookings = bookings.reduce((acc, booking) => {
          if (!acc[booking.schedule_id]) {
            acc[booking.schedule_id] = {
              schedule_id: booking.schedule_id,
              booking_ids: [],
              seat_ids: [],
              status: booking.status,
            };
          }
          acc[booking.schedule_id].booking_ids.push(booking.id);
          acc[booking.schedule_id].seat_ids.push(booking.seat_id);
          return acc;
        }, {});

        const allSeatsRes = await fetch(`${API_BASE_URL}/seats/`, { headers });
        const allSeats = await allSeatsRes.json();

        const ticketsHtml = await Promise.all(
          Object.values(groupedBookings).map(async (group) => {
            try {
              const schedRes = await fetch(
                `${API_BASE_URL}/schedules/${group.schedule_id}`,
                {
                  headers,
                },
              );
              const schedule = await schedRes.json();

              const depDate = new Date(schedule.departure_time);
              const seats = group.seat_ids
                .map((sid) => {
                  const s = allSeats.find((seat) => seat.id === sid);
                  return s ? s.seat_label : `ID: ${sid}`;
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
