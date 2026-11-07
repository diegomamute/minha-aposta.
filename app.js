const API_URL = "https://wjebszolbtlxvoxndoke.supabase.co/functions/v1/football-data";
const today = document.getElementById("today");
const now = new Date();
today.textContent = new Intl.DateTimeFormat("pt-BR",{weekday:"short",day:"2-digit",month:"short",year:"numeric"}).format(now).toUpperCase();
document.getElementById("year").textContent = now.getFullYear();

const sidebar = document.querySelector(".sidebar");
document.getElementById("menuToggle").addEventListener("click",()=>sidebar.classList.toggle("open"));
document.querySelectorAll(".nav-item").forEach(a=>a.addEventListener("click",()=>sidebar.classList.remove("open")));

const list = document.getElementById("matchList");
const statusText = document.getElementById("dataStatus");
const searchInput = document.getElementById("search");
const leagueChips = document.createElement("div");
leagueChips.id = "leagueChips";
leagueChips.className = "league-chips";
document.querySelector(".match-toolbar").insertAdjacentElement("afterend",leagueChips);

let view = "today";
let region = "all";
let selectedLeague = "all";
let query = "";
let cache = {};
let currentItems = [];

const southAmericanCountries = new Set(["Brazil","Argentina","Uruguay","Chile","Colombia","Ecuador","Paraguay","Peru","Bolivia","Venezuela"]);
const europeanCountries = new Set(["England","Scotland","Wales","Northern Ireland","Spain","Italy","France","Germany","Portugal","Netherlands","Belgium","Turkey","Türkiye","Greece","Austria","Switzerland","Denmark","Norway","Sweden","Finland","Poland","Czech Republic","Czechia","Croatia","Serbia","Ukraine","Russia","Romania","Hungary","Ireland","Republic of Ireland","Slovakia","Slovenia","Bulgaria","Cyprus","Iceland","Luxembourg","Israel","Albania","Bosnia","Montenegro","North Macedonia","Moldova","Georgia","Armenia","Azerbaijan","Estonia","Latvia","Lithuania","Kosovo"]);
const europeanCompetitionIds = new Set([2,3,848,531]); // Champions League, Europa League, Conference League e Supercopa da UEFA

const dateFor = offset => {
  const d = new Date();
  d.setDate(d.getDate()+offset);
  return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
};
const esc = value => String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

async function callApi(action,params={}) {
  const url = new URL(API_URL);
  url.searchParams.set("action",action);
  Object.entries(params).forEach(([key,value])=>{if(value!==""&&value!=null)url.searchParams.set(key,value)});
  const response = await fetch(url,{headers:{Accept:"application/json"}});
  const data = await response.json().catch(()=>({}));
  if(!response.ok) throw Error(data.error||"Falha ao consultar dados esportivos.");
  return data;
}

function belongsToRegion(match) {
  const league = match.league||{};
  const country = league.country||"";
  const id = Number(league.id);
  if(region==="all") return true;
  if(region==="brazil") return country==="Brazil";
  if(region==="south-america") return southAmericanCountries.has(country);
  if(region==="europe") return europeanCountries.has(country)||europeanCompetitionIds.has(id)||["Europe","UEFA"].includes(country);
  return true;
}

function getVisibleItems() {
  return currentItems.filter(match=>{
    if(!belongsToRegion(match)) return false;
    if(selectedLeague!=="all"&&String(match.league?.id)!==selectedLeague) return false;
    if(query) {
      const text = [match.league?.name,match.league?.country,match.teams?.home?.name,match.teams?.away?.name].join(" ").toLocaleLowerCase("pt-BR");
      if(!text.includes(query)) return false;
    }
    return true;
  });
}

function renderLeagueChips(items) {
  const unique = new Map();
  items.forEach(match=>{if(match.league?.id!=null)unique.set(String(match.league.id),match.league.name||"Competição")});
  const competitions = [...unique.entries()].sort((a,b)=>a[1].localeCompare(b[1],"pt-BR"));
  leagueChips.innerHTML = competitions.length
    ? '<button class="league-chip '+(selectedLeague==="all"?"active":"")+'" data-league="all">Todas as competições</button>'+competitions.map(([id,name])=>'<button class="league-chip '+(selectedLeague===id?"active":"")+'" data-league="'+esc(id)+'">'+esc(name)+'</button>').join("")
    : "";
  leagueChips.querySelectorAll("[data-league]").forEach(button=>button.addEventListener("click",()=>{
    selectedLeague=button.dataset.league;
    renderLeagueChips(items);
    showMatches(getVisibleItems());
  }));
}

function showMatches(items) {
  if(!items.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-ball">⚽</div><h3>Nenhuma partida encontrada</h3><p>Não há jogos para esta região, competição ou data na cobertura atual do fornecedor. Experimente outra data ou região.</p></div>';
    return;
  }

  const groups = new Map();
  items.forEach(match=>{
    const league=match.league||{};
    const key=String(league.id??league.name??"sem-liga");
    if(!groups.has(key)) groups.set(key,{league,matches:[]});
    groups.get(key).matches.push(match);
  });

  const viewTitle = view==="live" ? "PARTIDAS EM ANDAMENTO" : view==="tomorrow" ? "AGENDA DE AMANHÃ" : "JOGOS DE HOJE";
  list.innerHTML = '<div class="match-day-heading"><span class="day-heading-icon">'+(view==="live"?"●":view==="tomorrow"?"◷":"⚽")+'</span><div><b>'+viewTitle+'</b><small>'+items.length+' partida(s) • '+groups.size+' competição(ões)</small></div>'+(view==="live"?'<span class="live-now-badge"><i></i> AO VIVO</span>':'')+'</div>'+
    [...groups.values()].map(group=>{
      const league=group.league||{};
      const logo=league.logo?'<img class="league-logo" src="'+esc(league.logo)+'" alt="" loading="lazy" onerror="this.style.display=\'none\'">':'<span class="league-logo-fallback">🏆</span>';
      return '<section class="league-match-group"><header class="league-group-head">'+logo+'<div class="league-group-name"><b>'+esc(league.name||"Competição")+'</b><small>'+esc(league.country||"Futebol internacional")+'</small></div><span class="league-game-count">'+group.matches.length+' JOGO(S)</span></header><div class="league-group-games">'+group.matches.map(match=>{
        const fixture=match.fixture||{},teams=match.teams||{},goals=match.goals||{},status=fixture.status||{};
        const live=["1H","HT","2H","ET","P","LIVE","BT"].includes(status.short);
        const finished=["FT","AET","PEN"].includes(status.short);
        const score=goals.home==null&&goals.away==null?"VS":(goals.home??0)+" : "+(goals.away??0);
        const time=status.elapsed!=null?status.elapsed+"'":new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"}).format(new Date(fixture.date));
        const state=live?'<span class="game-state live"><i></i> '+(status.elapsed!=null?status.elapsed+"' AO VIVO":"AO VIVO")+'</span>':finished?'<span class="game-state finished">ENCERRADO</span>':'<span class="game-state scheduled">'+esc(status.long||"AGENDADO")+'</span>';
        return '<article class="match-card '+(live?"is-live":"")+'"><div class="match-kickoff">'+(live?'<span class="live-pulse"></span>':"")+(live?"EM JOGO":finished?"RESULTADO":"INÍCIO")+' <span>'+esc(time)+'</span></div><div class="match-main"><div class="match-team home"><img src="'+esc(teams.home?.logo||"")+'" alt="" loading="lazy" onerror="this.style.display=\'none\'"><b>'+esc(teams.home?.name||"Mandante")+'</b></div><div class="match-score"><strong>'+esc(score)+'</strong>'+state+'</div><div class="match-team away"><img src="'+esc(teams.away?.logo||"")+'" alt="" loading="lazy" onerror="this.style.display=\'none\'"><b>'+esc(teams.away?.name||"Visitante")+'</b></div></div></article>';
      }).join("")+'</div></section>';
    }).join("");
}
function applyFilters() {
  const visible=currentItems.filter(belongsToRegion);
  if(selectedLeague!=="all"&&!visible.some(match=>String(match.league?.id)===selectedLeague)) selectedLeague="all";
  renderLeagueChips(visible);
  showMatches(getVisibleItems());
}

async function loadMatches(force=false) {
  const offset=view==="tomorrow"?1:0;
  const date=dateFor(offset);
  const key=view+date;
  if(!force&&cache[key]&&Date.now()-cache[key].time<120000) {
    currentItems=cache[key].items;
    applyFilters();
    return;
  }
  list.innerHTML='<div class="loading-state"><span class="spinner"></span> Buscando partidas do mundo todo...</div>';
  try {
    const data=await callApi("fixtures",view==="live"?{live:"all"}:{date});
    let items=data.response||[];
    if(view==="live") items=items.filter(match=>["1H","HT","2H","ET","P","LIVE","BT"].includes(match.fixture?.status?.short));
    cache[key]={time:Date.now(),items};
    currentItems=items;
    applyFilters();
    statusText.textContent="Encontramos "+items.length+" partida(s) na consulta global • Atualizado às "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})+".";
  } catch(error) {
    list.innerHTML='<div class="empty-state"><div class="empty-ball">⚽</div><h3>Não foi possível carregar os jogos</h3><p>'+esc(error.message)+'</p></div>';
  }
}

document.querySelectorAll("[data-filter]").forEach(button=>button.addEventListener("click",()=>{
  document.querySelectorAll("[data-filter]").forEach(item=>item.classList.toggle("active",item===button));
  region=button.dataset.filter;
  selectedLeague="all";
  applyFilters();
}));
document.querySelectorAll("[data-match-view]").forEach(button=>button.addEventListener("click",()=>{
  document.querySelectorAll("[data-match-view]").forEach(item=>item.classList.toggle("active",item===button));
  view=button.dataset.matchView;
  loadMatches();
}));
searchInput.addEventListener("input",event=>{query=event.target.value.trim().toLocaleLowerCase("pt-BR");applyFilters()});
document.getElementById("refreshMatches").addEventListener("click",()=>loadMatches(true));

document.getElementById("loadStandings").addEventListener("click",async()=>{
  const league=document.getElementById("leagueId").value;
  const season=document.getElementById("seasonYear").value;
  const panel=document.getElementById("standingsPanel");
  if(!league||!season){panel.textContent="Informe o ID da liga e a temporada.";return}
  panel.innerHTML='<span class="spinner"></span><div>Carregando classificação...</div>';
  try {
    const data=await callApi("standings",{league,season});
    const rows=(data.response?.[0]?.league?.standings||[]).flat();
    if(!rows.length){panel.textContent="Classificação indisponível para esta competição/temporada.";return}
    panel.className="standings-table-wrap";
    panel.innerHTML='<table class="standings-table"><thead><tr><th>#</th><th>Clube</th><th>J</th><th>SG</th><th>Pts</th></tr></thead><tbody>'+rows.map(row=>'<tr><td>'+esc(row.rank)+'</td><td class="club-cell"><img src="'+esc(row.team?.logo||"")+'" alt=""><b>'+esc(row.team?.name)+'</b></td><td>'+esc(row.all?.played)+'</td><td>'+esc(row.goalsDiff)+'</td><td><b>'+esc(row.points)+'</b></td></tr>').join("")+'</tbody></table>';
  } catch(error) {panel.textContent=error.message}
});

loadMatches();
