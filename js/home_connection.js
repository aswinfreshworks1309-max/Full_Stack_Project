// Recap: Initializes the home page functionalities and event listeners.
document.addEventListener("DOMContentLoaded", () => {
  const myTicketsBtn = document.getElementById("myTicketsBtn");
  const modal = document.getElementById("ticketsModal");
  const closeModal = document.querySelector(".close-modal");
  const container = document.getElementById("ticketsContainer");
  const profileIcon = document.getElementById("profile");

  //profile icon code

  // Recap: Displays the user profile information in a popup.
  profileIcon.addEventListener("click", () => {
    const userJson = localStorage.getItem("user");
    if (!userJson) return;

    const user = JSON.parse(userJson);

    const oldPopup = document.getElementById("profilePopup");
    if (oldPopup) oldPopup.remove();

    const div = document.createElement("div");
    div.id = "profilePopup";
    div.innerHTML = `
    <div style="
      position: fixed;
      top:50%;
      left:50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 8px;
      padding: 20px;
      width: 300px;
      height:280px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 1000;
    ">
    <h3 style = "color:black;position:absolute;top:25px;right:120px;">  Profile</h3>
    <img src="../assests/profile.png" alt="Profile" style="width:40px;height:40px;border-radius:50%;margin-right:10px;position:absolute;top:20px;left:70px;">
    <div style = "margin-top:70px;">
      <p style = "color:black; margin:5px;padding:5px;"><b>Username :</b> ${user.full_name}</p>
      <p style = "color:black;margin:5px;padding:5px;"><b>Email :</b> ${user.email}</p>
      <p style = "color:black;margin:5px;padding:5px;"><b>Status :</b> Active</p>
      <button id="closePopup" style="
        margin-top:10px;
        padding:6px 12px;
        cursor:pointer;
        margin-left:90px;
        
      ">Close</button>
      </div>
    </div>

    <div id="overlay" style="
      position:fixed;
      top:0; left:0;
      width:100%; height:100%;
      background:rgba(0,0,0,0.5);
      z-index:999;
    "></div>
  `;

    document.body.appendChild(div);

    document.getElementById("closePopup").onclick = () => div.remove();
    document.getElementById("overlay").onclick = () => div.remove();
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
        '<div class="loading">Loading your journeys...</div>';

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

        const ticketsHtml = await Promise.all(
          bookings.map(async (booking) => {
            try {
              // Parallel fetch for schedule and seat
              const [schedRes, seatRes] = await Promise.all([
                fetch(`${API_BASE_URL}/schedules/${booking.schedule_id}`, {
                  headers,
                }),
                fetch(`${API_BASE_URL}/seats/`, { headers }), // We need to filter by ID on client or add backend endpoint
              ]);

              const schedule = await schedRes.json();
              const allSeats = await seatRes.json();

              // schedule.bus_id
              const seat = allSeats.find((s) => s.id === booking.seat_id);

              const depDate = new Date(schedule.departure_time);
              const arrDate = new Date(schedule.arrival_time);

              return `
                        <div class="ticket-card">
                            <div class="ticket-info">
                                <label>Route</label>
                                <div>${schedule.source} → ${
                                  schedule.destination
                                }</div>
                            </div>
                            <div class="ticket-info">
                                <label>Date & Time</label>
                                <div>${depDate.toLocaleDateString()} ${depDate.toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" },
                                )}</div>
                            </div>
                            <div class="ticket-info">
                                <label>Seat</label>
                                <div>${
                                  seat
                                    ? seat.seat_label
                                    : `ID: ${booking.seat_id}`
                                }</div>
                            </div>
                            <div class="ticket-info">
                                <label>Price</label>
                                <div>₹${schedule.price}</div>
                            </div>
                            <div class="ticket-info">
                                <label>Status</label>
                                <div><span class="status-badge status-${
                                  booking.status
                                }">${booking.status}</span></div>
                            </div>
                         
                        </div>
                        `;
            } catch (err) {
              console.error(err);
              return `<div class="ticket-card" style="color:red">Error loading ticket ${booking.id}</div>`;
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
