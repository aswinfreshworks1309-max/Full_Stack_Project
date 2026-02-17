// This script fetches and displays available bus schedules based on what the user searched for
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Get the source, destination, and date from the website URL
  const params = new URLSearchParams(window.location.search);
  const source = params.get("source");
  const destination = params.get("destination");
  const date = params.get("date");

  // 2. Update the page title/header to show the route (e.g., "London → Paris")
  const routeInfoDiv = document.querySelector(".route-info");
  if (routeInfoDiv && source && destination) {
    const spans = routeInfoDiv.querySelectorAll("span");
    if (spans.length >= 3) {
      spans[0].textContent = source;
      spans[2].textContent = destination;
    }
  }

  // 3. Update the date shown on the page
  if (date) {
    const dateDiv = document.querySelector(".date-info");
    if (dateDiv) {
      const dateObj = new Date(date);
      dateDiv.textContent = dateObj.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
  }

  // 4. Fetch the actual bus data from the Backend API
  const busListContainer = document.querySelector(".bus-list");
  if (!busListContainer) return;

  try {
    // Construct the API URL with our search queries
    let apiUrl = `${API_BASE_URL}/schedules/`;
    const searchParams = new URLSearchParams();
    if (source) searchParams.append("source", source);
    if (destination) searchParams.append("destination", destination);

    const queryString = searchParams.toString();
    if (queryString) {
      apiUrl += `?${queryString}`;
    }

    // Get the logged-in user's token (needed for some API calls)
    const user = JSON.parse(localStorage.getItem("user"));
    const headers = user?.access_token
      ? { Authorization: `Bearer ${user.access_token}` }
      : {};

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const schedules = await response.json();

    // 5. If we found schedules, show them on the page
    if (schedules.length > 0) {
      busListContainer.innerHTML = ""; // Clear any old/placeholder data

      // Also get bus details (like bus number and type) to show on the cards
      const busesRes = await fetch(`${API_BASE_URL}/buses/`, { headers });
      const allBuses = await busesRes.json();

      schedules.forEach((schedule) => {
        const dep = new Date(schedule.departure_time);
        const arr = new Date(schedule.arrival_time);

        // Find the specific bus for this schedule
        const busInfo = allBuses.find((b) => b.id === schedule.bus_id);
        const busName = busInfo
          ? busInfo.bus_number
          : `Bus #${schedule.bus_id}`;
        const busType = busInfo ? busInfo.bus_type : "Luxury Service";

        // Calculate how long the journey takes
        const distinctMs = arr - dep;
        const hours = Math.floor(distinctMs / 3600000);
        const minutes = Math.floor((distinctMs % 3600000) / 60000);

        // 6. Create the HTML for each bus "card"
        const busCard = `
                <div class="bus-card" data-aos="fade-up">
                    <div class="bus-header">
                        <div class="bus-name">${busName}</div>
                        <div class="bus-type">${busType}</div>
                    </div>
                    <div class="bus-details">
                        <div class="detail-item">
                            <div class="detail-label">Departure</div>
                            <div class="time">${dep.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                            <div class="route-path">${schedule.source || source || "Origin"}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Duration</div>
                            <div class="detail-value">${hours}h ${minutes}m</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Arrival</div>
                            <div class="time">${arr.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                            <div class="route-path">${schedule.destination || destination || "Dest"}</div>
                        </div>
                    </div>
                    <div class="bus-footer">
                        <div class="price-section">
                            <div class="price-label">Fare per seat</div>
                            <div class="price-value">₹${schedule.price}</div>
                        </div>
                        
                        <button class="book-btn">
                            <a href="./seat.html?schedule_id=${schedule.id}">Select Seats</a>
                        </button>
                    </div>
                </div>`;

        // Add the card to the container
        busListContainer.insertAdjacentHTML("beforeend", busCard);
      });
    } else {
      // If no buses were found
      busListContainer.innerHTML = `<div style="text-align:center; color: white; padding: 20px;">No buses found for this route.</div>`;
    }
  } catch (error) {
    console.error("Failed to fetch schedules:", error);
    // If something goes wrong, the page will just show whatever was already there
  }
});
