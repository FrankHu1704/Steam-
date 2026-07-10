const STORAGE_KEY = "asfalto-rival:modal-seen";

const modal = document.getElementById("download-modal");
const topBanner = document.getElementById("top-banner");

function openModal() {
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = "";
  sessionStorage.setItem(STORAGE_KEY, "1");
  topBanner.hidden = false;
}

// Every fresh visit to the site prompts the download modal.
openModal();

document.getElementById("modal-close").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.hidden) closeModal();
});

[
  "btn-nav-download",
  "btn-hero-download",
  "btn-strip-download",
  "btn-final-download",
  "btn-banner-download",
].forEach((id) => {
  document.getElementById(id)?.addEventListener("click", openModal);
});

document.getElementById("btn-banner-close").addEventListener("click", () => {
  topBanner.hidden = true;
});

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("toast--visible");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("toast--visible"), 2600);
}

document.getElementById("btn-store-android").addEventListener("click", () => {
  showToast("O app ainda não foi publicado. Enquanto isso, jogue no navegador!");
});
document.getElementById("btn-store-ios").addEventListener("click", () => {
  showToast("O app ainda não foi publicado. Enquanto isso, jogue no navegador!");
});

// ---------- Screenshots (original stylized scenes, no external assets) ----------
const scenes = [
  { grad: "linear-gradient(180deg,#2a3352,#0d1424 65%)", road: "#181d2c", progress: "62%", speed: "241", caption: "Ruas da cidade à noite" },
  { grad: "linear-gradient(180deg,#3a2a1a,#120c08 65%)", road: "#241a10", progress: "38%", speed: "198", caption: "Perseguição no deserto" },
  { grad: "linear-gradient(180deg,#1c3a3a,#081414 65%)", road: "#0f2626", progress: "81%", speed: "276", caption: "Nitro na zona costeira" },
  { grad: "linear-gradient(180deg,#3a1c30,#150810 65%)", road: "#261020", progress: "14%", speed: "163", caption: "Drift no distrito neon" },
  { grad: "linear-gradient(180deg,#25304a,#0a0e18 65%)", road: "#161c2c", progress: "95%", speed: "302", caption: "Sprint final contra rivais" },
];

const screensTrack = document.getElementById("screens-track");
screensTrack.innerHTML = scenes
  .map(
    (s) => `
    <div class="screen-card">
      <div class="screen-card__scene" style="background:${s.grad}">
        <svg width="100%" height="100%" viewBox="0 0 220 391" preserveAspectRatio="xMidYMax slice" style="position:absolute;inset:0">
          <polygon points="60,391 160,391 130,180 90,180" fill="${s.road}" />
          <rect x="107" y="200" width="6" height="18" fill="#ffffff55" />
          <rect x="107" y="240" width="6" height="22" fill="#ffffff55" />
          <rect x="107" y="285" width="7" height="26" fill="#ffffff77" />
          <rect x="106" y="335" width="8" height="30" fill="#ffffffaa" />
          <g transform="translate(110,300)">
            <rect x="-22" y="-14" width="44" height="26" rx="6" fill="#ff5f2e" />
            <rect x="-14" y="-22" width="28" height="14" rx="4" fill="#ffd9c8" />
            <circle cx="-2" cy="-30" r="14" fill="#00e0ff" opacity="0.5" />
          </g>
        </svg>
      </div>
      <div class="screen-card__hud">
        <div>PROGRESSO ${s.progress}</div>
        <div style="align-self:flex-end">${s.speed} KM/H</div>
      </div>
      <div class="screen-card__caption">${s.caption}</div>
    </div>`
  )
  .join("");

// ---------- Reviews (original sample text) ----------
const reviews = [
  { name: "Marcos Aurélio", initials: "MA", stars: 5, date: "28/06/26", color: "#00e0ff", text: "Os gráficos são incríveis pra um jogo mobile! O drift ficou muito satisfatório, e o sistema de nitro dá um gás extra nas corridas." },
  { name: "Luana Cardoso", initials: "LC", stars: 4, date: "15/06/26", color: "#ff5f2e", text: "Muito bom, mas o multiplayer podia ter matchmaking por nível. Corri contra gente muito mais forte logo no começo." },
  { name: "Renato Dias", initials: "RD", stars: 3, date: "02/06/26", color: "#ffd23f", text: "Jogo divertido, só acho que o tempo de espera pra recarregar fichas podia ser menor. Fora isso, recomendo." },
  { name: "Beatriz Nunes", initials: "BN", stars: 5, date: "20/05/26", color: "#9b6bff", text: "Vício total. A customização dos carros é muito completa e cada pista tem sua própria pegada." },
];

const reviewsTrack = document.getElementById("reviews-track");
reviewsTrack.innerHTML = reviews
  .map(
    (r) => `
    <div class="review">
      <div class="review__head">
        <div class="review__avatar" style="background:${r.color}">${r.initials}</div>
        <div>
          <div class="review__name">${r.name}</div>
          <div class="review__meta">
            <span class="review__stars">${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)}</span>
            <span>${r.date}</span>
          </div>
        </div>
      </div>
      <p>${r.text}</p>
    </div>`
  )
  .join("");
