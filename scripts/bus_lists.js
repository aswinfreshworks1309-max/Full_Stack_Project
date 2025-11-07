document.addEventListener("DOMContentLoaded", ()=>{
    const menuToggle = document.querySelector(".menu-toggle");
    const navLinks = document.querySelector(".nav-links");
    menuToggle.addEventListener("click",() =>{
        navLinks.classList.toggle("active");
        menuToggle.classList,toggle("open");

    });

    const routeInfo = document.querySelector(".route-info");
    const searchData = JSON.parse(localStorage.getItem("busSearchData"));

    if (searchData){
        const { from,to,passengers} = searchData;


        routeInfo.innerHTML = `
        <span>${from}</span>
        <span class = "arrow">→</span>
        <span>${to}</span>
        <div class = "date-info"> For ${passengers} passenger(s)</div>
        `;


        const busCards = document.querySelectorAll(".bus-card");
        busCards.forEach(card => {
            const routPath = card.querySelector(".route-path");
            const routeText = Array.from(routePath).map(el => el.textContent.toLowerCase()).join(" ");
            if (!routeText.includes(from.toLowerCase()) || !routeText.includes(to .toLowerCase())){
                card.style.display = "none";
            }
        });

    }
        else {
            routeInfo.innerHTML = "<p>No route selected. Please go back and search again.</p>";
        }


        const bookButtons = document.querySelectorAll(".book-btn");
});