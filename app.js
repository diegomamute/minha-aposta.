const today = document.getElementById("today");
const now = new Date();
today.textContent = new Intl.DateTimeFormat("pt-BR",{weekday:"short",day:"2-digit",month:"short",year:"numeric"}).format(now).toUpperCase();
document.getElementById("year").textContent = now.getFullYear();
const sidebar = document.querySelector(".sidebar");
document.getElementById("menuToggle").addEventListener("click",()=>sidebar.classList.toggle("open"));
document.querySelectorAll(".nav-item").forEach(link=>link.addEventListener("click",()=>sidebar.classList.remove("open")));
const filters = document.querySelectorAll(".filter");
filters.forEach(button=>button.addEventListener("click",()=>{
  filters.forEach(item=>item.classList.remove("active"));
  button.classList.add("active");
  // Os filtros serão aplicados às partidas assim que a API esportiva for conectada.
}));
document.getElementById("search").addEventListener("input",event=>{
  const term=event.target.value.trim().toLocaleLowerCase("pt-BR");
  document.querySelectorAll(".league-card").forEach(card=>{
    card.style.display=card.textContent.toLocaleLowerCase("pt-BR").includes(term)?"flex":"none";
  });
});