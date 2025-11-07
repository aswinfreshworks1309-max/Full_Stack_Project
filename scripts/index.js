document.addEventListener("DOMContentLoaded",()=>{
    const menuToggle = document.querySelector(".menu-toggle");
    const login = document.querySelector(".btn-login");
    const singUp = document.querySelector(".btn-signup");
    const navLinks = document.querySelector(".nav-links")

    menuToggle.addEventListener("click",() =>{
        navLinks.classList.toggle("active");
        menuToggle.classList.toggle("open");
    });
    login.addEventListener("click",()=>{
        alert("login button was clicked");
    });
    singUp.addEventListener("click",()=>{
        alert("signup button was clicked");
    });
    
const searchForm = document.getElementById("searchForm");
const fromInput = document.getElementById("from");
const toInput = document.getElementById("to");
const passengers = document.getElementById("passengers");


searchForm.addEventListener("submit",(event)=>{
    event.preventDefault();
    const fromValue = fromInput.value.trim();
    const toValue = toInput.value.trim();
    if (fromValue === ""|| toValue === ""){
        alert("Please enter both 'From' and 'To' locations." );
        return
    }
    if (fromValue.toLowerCase() === toValue.toLoweCase()){
        alert(" 'From' and ' To' location cannot be the same! ");
        return
    }




});

  
});