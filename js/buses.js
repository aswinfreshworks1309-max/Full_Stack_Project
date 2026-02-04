// Recap: Fetches and displays available bus schedules based on search criteria.
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Get query parameters from the URL
  const params = new URLSearchParams(window.location.search);
  const source = params.get("source");
  const destination = params.get("destination");
  const date = params.get("date");

  // 2. Update the header info (Route and Date)
  const routeInfoDiv = document.querySelector(".route-info");
  if (routeInfoDiv && source && destination) {
    // Assuming the structure: <span>From</span><span class="arrow">→</span><span>To</span>
    const spans = routeInfoDiv.querySelectorAll("span");
    if (spans.length >= 3) {
      spans[0].textContent = source;
      spans[2].textContent = destination;
    }
  }

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

  // 3. Fetch data from the Backend API
  const busListContainer = document.querySelector(".bus-list");
  if (!busListContainer) return;

  try {
    // Construct API URL with query parameters
    let apiUrl = `${API_BASE_URL}/schedules/`;
    const searchParams = new URLSearchParams();
    if (source) searchParams.append("source", source);
    if (destination) searchParams.append("destination", destination);

    const queryString = searchParams.toString();
    if (queryString) {
      apiUrl += `?${queryString}`;
    }

    console.log(`Fetching buses from: ${apiUrl}`);

    const user = JSON.parse(localStorage.getItem("user"));
    const headers = user?.access_token
      ? { Authorization: `Bearer ${user.access_token}` }
      : {};

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const schedules = await response.json();
    console.log("Schedules received:", schedules);

    // 4. Update the UI
    if (schedules.length > 0) {
      busListContainer.innerHTML = ""; // Clear hardcoded buses only if we have results

      // Fetch all buses for mapping labels/types
      const busesRes = await fetch(`${API_BASE_URL}/buses/`, { headers });
      const allBuses = await busesRes.json();

      schedules.forEach((schedule) => {
        const dep = new Date(schedule.departure_time);
        const arr = new Date(schedule.arrival_time);

        // Find bus info
        const busInfo = allBuses.find((b) => b.id === schedule.bus_id);
        const busName = busInfo
          ? busInfo.bus_number
          : `Bus #${schedule.bus_id}`;
        const busType = busInfo ? busInfo.bus_type : "Luxury Service";

        // Calculate duration
        const distinctMs = arr - dep;
        const hours = Math.floor(distinctMs / 3600000);
        const minutes = Math.floor((distinctMs % 3600000) / 60000);

        const busCard = `
                <div class="bus-card" data-aos="fade-up">
                    <div class="bus-header">
                        <div class="bus-name">${busName}</div>
                        <div class="bus-type">${busType}</div>
                    </div>
                    <div class="bus-details">
                        <div class="detail-item">
                            <div class="detail-label">Departure</div>
                            <div class="time">${dep.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}</div>
                            <div class="route-path">${
                              schedule.source || source || "Origin"
                            }</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Duration</div>
                            <div class="detail-value">${hours}h ${minutes}m</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Arrival</div>
                            <div class="time">${arr.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}</div>
                            <div class="route-path">${
                              schedule.destination || destination || "Dest"
                            }</div>
                        </div>
                    </div>
                    <div class="bus-footer">
                        <div class="price-section">
                            <div class="price-label">Fare per seat</div>
                            <div class="price-value">₹${schedule.price}</div>
                        </div>
                        <div class="seats-available">${
                          schedule.available_seats
                        } Seats Available</div>
                        <button class="book-btn">
                            <a href="./seat.html?schedule_id=${
                              schedule.id
                            }">Select Seats</a>
                        </button>
                    </div>
                </div>`;

        busListContainer.insertAdjacentHTML("beforeend", busCard);
      });
    } else {
      // Optional: Show no results message if user searched but found nothing
      if (source || destination) {
        busListContainer.innerHTML = `<div style="text-align:center; color: white; padding: 20px;">No buses found for this route. Showing all available buses instead?</div>`;
        // Logic to fetch all could go here, or just leave message
      }
    }
  } catch (error) {
    console.error("Failed to fetch schedules:", error);
    // We keep the hardcoded buses visible if fetch fails, so the site doesn't look broken
  }
});
