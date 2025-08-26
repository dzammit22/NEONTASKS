import { STATE, save } from '../core/state.js';
import { CATEGORIES } from '../core/config.js';
import { escapeHTML, ellipsize } from '../core/utils.js';
import { openLightbox } from '../ui/lightbox.js';

export function renderAll() {
  renderSummary();
  // Import and call other render functions
  import('./tasks.js').then(({ renderTasks }) => {
    renderTasks();
  }).catch(() => {});
  
  import('./calendar.js').then(({ renderCalendar }) => {
    renderCalendar();
  }).catch(() => {});
  
  import('./characters.js').then(({ renderCharacters }) => {
    renderCharacters();
  }).catch(() => {});
  
  import('./boss.js').then(({ renderBoss }) => {
    renderBoss();
  }).catch(() => {});
  
  renderHeaderPower();
}

export function renderSummary() {
  ensureLockedCharCSS();
  
  const section = document.getElementById("view-summary");
  const grid = document.getElementById("summary-grid");
  if (!section || !grid) return;

  // Tiles (hide "Other")
  const cats = CATEGORIES.filter(c => c !== "Other");
  grid.innerHTML = cats.map(cat => {
    const unlocked = isUnlocked(cat);
    const portrait = unlocked
      ? (STATE.characters[cat]?.image || defaultPortraitForCategory(cat))
      : placeholderPortraitForCategory(cat);
    return `
      <button class="tile ${unlocked ? "" : "locked"}" data-cat="${cat}" aria-label="${cat} ${unlocked ? 'portrait' : 'locked'}">
        <img alt="" src="${portrait}">
        <div class="label">${cat}</div>
      </button>`;
  }).join("");

  // Add tile click handlers
  grid.querySelectorAll(".tile").forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.cat;
      if (isUnlocked(cat)) {
        const img = STATE.characters[cat]?.image || defaultPortraitForCategory(cat);
        openLightbox(`<img src="${img}" alt="${cat} portrait" style="max-width:100%;border-radius:12px" />`);
      } else {
        openLightbox(`<h3>${cat} Character Locked</h3><p class="muted">Complete a <strong>${cat}</strong> task to unlock this ally.</p>`);
      }
    });
  });

  // Add breathing room for activity section
  if (!document.getElementById("summary-activity-space")) {
    const s = document.createElement("style");
    s.id = "summary-activity-space";
    s.textContent = `
      #view-summary{ display:grid; gap:18px; }
      .summary-grid{ margin-bottom:6px; }
    `;
    document.head.appendChild(s);
  }

  // Recent activity section
  let act = document.getElementById("summary-activity");
  if (!act) {
    act = document.createElement("div");
    act.id = "summary-activity";
    act.className = "card";
    section.appendChild(act);
  }
  
  const recent = (STATE.activity || []).slice(0, 3);
  const iconFor = (kind) => {
    switch (kind) {
      case "character_found": return "🎉";
      case "task_completed": return "⚡";
      case "boss_win": return "🧨";
      case "boss_loss": return "💀";
      default: return "•";
    }
  };
  
  const TITLE_MAX = 48; // keep things to a single line

  act.innerHTML = `
    <div class="group-head">
      <strong>Recent activity</strong>
      <span class="muted">${recent.length ? "" : "No recent actions yet"}</span>
    </div>
    <div class="activity-list" role="list">
      ${recent.map(e => {
        const d = new Date(e.when);
        const when = d.toLocaleString(undefined, { month: "short", day: "numeric" });
        const full = escapeHTML(e.title);
        const short = escapeHTML(ellipsize(e.title, TITLE_MAX));
        return `
          <div class="activity-row" role="listitem">
            <span class="a-icn">${iconFor(e.kind)}</span>
            <span class="a-text" title="${full}">${short}</span>
            <time class="a-date" aria-label="on ${when}">${when}</time>
          </div>`;
      }).join("")}
    </div>`;
}

function renderHeaderPower() {
  const pctEl = document.getElementById("power-perc");
  const bar = document.getElementById("powerbar-inner");
  if (!pctEl || !bar) return;
  
  const pct = Math.min(100, Math.round((STATE.power % STATE.config.bossTarget) / STATE.config.bossTarget * 100));
  pctEl.textContent = `${pct}%`;
  bar.style.width = `${pct}%`;
}

function isUnlocked(cat) {
  return !!STATE.characters[cat];
}

function defaultPortraitForCategory(cat) {
  const color = {
    Fitness: "#23ffd9", Home: "#a26bff", Finance: "#ffe066",
    Work: "#ff33cc", Rose: "#ff6ad5", Skills: "#66ccff", Other: "#66ff99"
  }[cat] || "#6bf";
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'>
      <defs><linearGradient id='g' x1='0' x2='1'>
        <stop stop-color='${color}' stop-opacity='.85' offset='0'/>
        <stop stop-color='#0b0f1a' offset='1'/></linearGradient></defs>
      <rect width='600' height='400' fill='url(#g)'/>
      <g fill='none' stroke='${color}' stroke-width='6' opacity='.85'>
        <rect x='40' y='40' width='520' height='320' rx='26'/>
        <path d='M70 360L220 180 320 260 380 210 530 360'/>
      </g>
      <text x='50%' y='58%' text-anchor='middle' font-size='46' fill='white' font-family='system-ui' opacity='.9'>${cat}</text>
    </svg>`
  );
  return `data:image/svg+xml;charset=utf-8,${svg}`;
}

function placeholderPortraitForCategory(cat) {
  const color = {
    Fitness: "#23ffd9", Home: "#a26bff", Finance: "#ffe066",
    Work: "#ff33cc", Rose: "#ff6ad5", Skills: "#66ccff", Other: "#66ff99"
  }[cat] || "#6bf";
  const label = cat.toUpperCase();
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 420'>
      <defs>
        <linearGradient id='g' x1='0' x2='1'>
          <stop stop-color='${color}' stop-opacity='.35' offset='0'/>
          <stop stop-color='#0b0f1a' offset='1'/>
        </linearGradient>
        <filter id='glow'><feGaussianBlur stdDeviation='4' result='b'/><feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <rect width='640' height='420' rx='26' fill='url(#g)'/>
      <g opacity='.25' stroke='${color}' fill='none' stroke-width='4'>
        <rect x='30' y='30' width='580' height='360' rx='22'/>
      </g>
      <g transform='translate(0,-10)' opacity='.45'>
        <circle cx='320' cy='180' r='58' fill='${color}' opacity='.25'/>
        <rect x='220' y='235' width='200' height='120' rx='30' fill='${color}' opacity='.18'/>
      </g>
      <g filter='url(#glow)'>
        <rect x='275' y='240' width='90' height='70' rx='12' fill='none' stroke='${color}' stroke-width='4'/>
        <path d='M300 240 v-20 a20 20 0 0 1 40 0 v20' stroke='${color}' stroke-width='4' fill='none'/>
      </g>
      <text x='50%' y='78%' text-anchor='middle' font-size='28' fill='#d9e6ff' opacity='.9'
            font-family='system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'>${label} · LOCKED</text>
    </svg>`
  );
  return `data:image/svg+xml;charset=utf-8,${svg}`;
}

function ensureLockedCharCSS() {
  if (document.getElementById("locked-char-style")) return;
  const style = document.createElement("style");
  style.id = "locked-char-style";
  style.textContent = `
    .tile.locked img { filter: blur(3px) saturate(.6) brightness(.7); }
    .tile.locked .label::after{ content:" · Locked"; color:#9fb3ff; opacity:.8; font-weight:600; }
    .char-card.locked { position:relative; }
    .char-card.locked img { filter: blur(4px) saturate(.6) brightness(.7) contrast(.9); opacity:.75; }
    .char-card.locked .lock-overlay{
      position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
      color:#def; text-shadow:0 0 12px rgba(123,200,255,.6);
      font-weight:700; letter-spacing:.4px;
      background: radial-gradient(ellipse at center, rgba(17,23,43,.25), rgba(17,23,43,.0) 55%);
      pointer-events:none;
    }
    .char-card.locked .btn{ opacity:.5; pointer-events:none; }
  `;
  document.head.appendChild(style);
}
