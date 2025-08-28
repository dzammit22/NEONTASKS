<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>NEON/TASKS</title>
  <style>
    :root{
      --bg:#0b0f1a;
      --bg2:#0d1222;
      --panel:#11162a;
      --text:#e6f1ff;
      --muted:#9fb2c8;
      --cyan:#00fff0;
      --pink:#ff33cc;
      --purple:#a26bff;
      --yellow:#ffe066;
      --red:#ff355e;
      --radius:16px;
      --radius-sm:12px;
      --glow:0 0 18px rgba(0,255,240,.35), 0 0 6px rgba(0,255,240,.6);
      --shadow:0 10px 30px rgba(0,0,0,.35);
      --gap:14px;
    }

    *{box-sizing:border-box}
    html,body{height:100%}
    body{
      margin:0; font-family:system-ui,Segoe UI,Roboto,Ubuntu,"Helvetica Neue",Arial,sans-serif;
      color:var(--text); background: radial-gradient(1200px 800px at 10% -10%, #0e1430,transparent 60%), linear-gradient(#0b0f1a,#090d18);
    }

    .sr-only{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}
    small{opacity:.7}

    /* Header */
    .app-header{
      position:sticky; top:0; z-index:5; background:linear-gradient(180deg, rgba(11,15,26,.95),rgba(11,15,26,.6));
      backdrop-filter: blur(8px);
      display:flex; align-items:center; justify-content:center; padding:12px 14px; border-bottom:1px solid rgba(255,255,255,.06)
    }
    .logo{font-weight:800; letter-spacing:.5px}
    .logo span{color:var(--cyan); text-shadow:var(--glow)}
    .logo small{font-weight:600; opacity:.7}

    /* Tabs */
    .tabs{
      position:sticky; top:58px; z-index:5; display:flex; overflow:auto; gap:8px; padding:8px 8px 10px;
      background:linear-gradient(180deg, rgba(11,15,26,.9), rgba(11,15,26,.5));
      border-bottom:1px solid rgba(255,255,255,.06)
    }
    .tab{
      border:1px solid rgba(255,255,255,.1); background:linear-gradient(180deg,#0f1530,#0b1028);
      color:var(--text); padding:9px 14px; border-radius:999px; cursor:pointer; white-space:nowrap;
      box-shadow:0 2px 10px rgba(0,0,0,.35)
    }
    .tab[aria-selected="true"]{
      border-color: rgba(0,255,240,.5);
      box-shadow: 0 0 0 1px rgba(0,255,240,.4), inset 0 0 22px rgba(0,255,240,.12);
      text-shadow: var(--glow);
    }

    /* Main containers */
    main{padding:14px; display:grid; gap:16px; max-width:1100px; margin:0 auto}
    .card{
      background: linear-gradient(180deg, rgba(17,22,42,.9), rgba(14,18,33,.85));
      border:1px solid rgba(255,255,255,.06);
      border-radius:var(--radius);
      box-shadow: var(--shadow);
      padding:14px;
    }

    .field{display:flex; flex-direction:column; gap:6px; margin-bottom:12px}
    .field input, .field select, .field textarea{
      background:#0c142b; border:1px solid rgba(255,255,255,.08); color:var(--text); padding:10px 12px;
      border-radius:var(--radius-sm); outline: none; transition:border-color .2s
    }
    .field input:focus, .field select:focus, .field textarea:focus{
      border-color:var(--cyan); box-shadow:0 0 0 2px rgba(0,255,240,.2)
    }
    .req{color:var(--pink)}

    .row{display:grid; grid-template-columns:1fr 1fr; gap:12px}
    .actions{display:flex; gap:10px}

    .btn{
      background:#121a35; color:var(--text); border:1px solid rgba(255,255,255,.12);
      border-radius:12px; padding:9px 12px; cursor:pointer; transition:transform .08s ease, box-shadow .2s;
    }
    .btn.primary{background: linear-gradient(90deg, #132647, #11213f); border-color: rgba(0,255,240,.35)}
    .btn:hover{box-shadow: 0 0 10px rgba(255,255,255,.1)}
    .btn:active{transform: translateY(1px)}
    .btn.danger{border-color: rgba(255,53,94,.45); color:#ffd7de; background:linear-gradient(90deg,#2a0f18,#2a0b17)}

    .muted{color:var(--muted)}

    /* Summary grid */
    .summary-grid{
      display:grid; gap:12px; grid-template-columns: repeat(3, minmax(0,1fr)); margin-bottom:6px;
    }
    @media(min-width:800px){ .summary-grid{ grid-template-columns: repeat(6, minmax(0,1fr)); } }
    .tile{
      position:relative; overflow:hidden; border-radius:18px; height:120px; cursor:pointer;
      background:linear-gradient(180deg,#0f1530,#0b1028); border:1px solid rgba(255,255,255,.08);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .tile:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(0,0,0,.4), 0 0 20px rgba(0,255,240,.1);
    }
    .tile .label{
      position:absolute; bottom:8px; left:10px; right:10px; font-weight:700; 
      text-shadow: 0 0 12px rgba(0,255,240,.4);
    }
    .tile img{position:absolute; inset:auto 0 0 0; width:100%; height:100%; object-fit:cover; opacity:.9; filter:saturate(1.4)}

    /* XP indicators */
    .xp-indicator { 
      font-size: 0.75rem; 
      margin-top: 2px; 
      font-weight: 600; 
      color: var(--cyan) !important;
      text-shadow: 0 0 8px rgba(0,255,240,.4);
    }
    .gacha-indicator {
      font-size: 0.75rem; 
      margin-top: 2px; 
      font-weight: 700;
      color: var(--yellow) !important;
      text-shadow: 0 0 8px rgba(255,224,102,.6);
      animation: pulse-glow 1.5s ease-in-out infinite;
    }
    @keyframes pulse-glow {
      0%, 100% { opacity: 0.8; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.05); }
    }

    .tile.ready-gacha {
      border: 2px solid var(--yellow) !important;
      box-shadow: 0 0 20px rgba(255,224,102,.4) !important;
      animation: gacha-pulse 2s ease-in-out infinite;
    }
    @keyframes gacha-pulse {
      0%, 100% { box-shadow: 0 0 20px rgba(255,224,102,.4); }
      50% { box-shadow: 0 0 30px rgba(255,224,102,.6); }
    }

    .tile.locked .xp-indicator {
      color: #9fb3ff !important;
      opacity: 0.8;
    }

    /* Activity section */
    #view-summary {
      display: grid;
      gap: 18px;
    }
    #summary-activity .group-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    #summary-activity .activity-list {
      display: grid;
      row-gap: 6px;
    }
    .activity-row {
      display: grid;
      grid-template-columns: 1.4em 1fr auto;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      border-top: 1px solid rgba(255,255,255,.06);
    }
    .activity-row:first-child {
      border-top: none;
    }
    .activity-row .a-icn {
      text-align: center;
      opacity: .95;
      font-size: 1.1em;
    }
    .activity-row .a-text {
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .activity-row .a-date {
      color: var(--muted);
      white-space: nowrap;
    }

    /* Tasks */
    .task-groups{display:grid; gap:12px}
    .group .group-head{display:flex; justify-content:space-between; align-items:center; margin-bottom:8px}
    .group .group-body{display:grid; gap:8px}
    .task{
      position:relative; display:grid; gap:8px; grid-template-columns:auto 1fr auto; align-items:start;
      background:#0b1326; border:1px solid rgba(255,255,255,.08); border-radius:14px; padding:10px;
      overflow:hidden;
    }
    .task .p-dot{width:10px; height:10px; border-radius:999px; box-shadow:0 0 8px currentColor}
    .task .title{
      font-weight:700; margin-bottom: 4px;
    }
    .task .meta{
      display:flex; flex-wrap:wrap; gap:6px; color:var(--muted); font-size:.82rem;
    }
    .task .meta .pill{background:#16213e; padding:3px 8px; border-radius:999px;}
    .task .notes{
      grid-column:1/-1; color:#cfe1ff; font-size:.95rem; margin-top:6px;
    }
    .task .actions{display:grid; gap:6px; justify-items:end;}
    .task.done{opacity:.6}

    .task .btn-done {
      background: linear-gradient(90deg, #0b3d1a, #145a28) !important;
      border: 1px solid rgba(0,255,120,.4) !important;
      color: #a6ffcf !important;
      font-weight: 600;
    }
    .task .btn-del {
      background: linear-gradient(90deg, #3d0b15, #5a1420) !important;
      border: 1px solid rgba(255,70,70,.45) !important;
      color: #ffcfd6 !important;
      font-weight: 600;
    }

    /* Characters */
    .empty{color:#b9c5d8; border-style:dashed}
    .chars-grid{display:grid; gap:12px; grid-template-columns: repeat(auto-fill, minmax(220px,1fr))}
    .char-card{
      background:#0b1326; border:1px solid rgba(255,255,255,.08); border-radius:16px; overflow:hidden;
    }
    .char-portrait{height:160px; background:#0f1530; position:relative; overflow:hidden;}
    .char-portrait img{width:100%; height:100%; object-fit:cover; filter:saturate(1.3);}
    .char-body{padding:12px; display:grid; gap:8px;}
    .char-body strong { color: #fff; font-weight: 600; }
    .char-body .pink { color: var(--pink) !important; font-weight: 600; }
    .char-body .muted { color: var(--muted) !important; }

    .progress{
      height:10px; border-radius:999px; background:#0c1730; overflow:hidden;
      border: 1px solid rgba(255,255,255,.05);
    }
    .progress > div{
      height:100%; background:linear-gradient(90deg,var(--cyan),var(--pink)); 
      transition: width 0.6s ease; box-shadow: 0 0 12px rgba(0,255,240,.3);
    }

    .tier-buttons {
      gap: 6px !important; margin-top: 6px;
    }
    .tier-btn {
      font-size: 0.85rem !important; padding: 6px 10px !important; min-width: 0; flex: 1;
      background: linear-gradient(90deg, #1a2847, #152139) !important;
      border: 1px solid rgba(0,255,240,.25) !important;
      color: var(--cyan) !important; font-weight: 600;
    }
    .tier-btn[disabled] {
      background: #0c1326 !important; border: 1px solid rgba(255,255,255,.08) !important;
      color: #5a6b82 !important; cursor: not-allowed; opacity: 0.5;
    }
    .tier-btn[disabled]::after { content: " 🔒"; opacity: 0.6; }

    /* Dialog */
    dialog{
      border:none; border-radius:16px; padding:0; overflow:hidden; background:transparent;
    }
    dialog::backdrop{background: rgba(4,6,12,.6); backdrop-filter: blur(4px)}
    dialog form, dialog > div{
      background: linear-gradient(180deg, rgba(17,22,42,.98), rgba(12,16,33,.95));
      border:1px solid rgba(255,255,255,.08); padding:16px; min-width:min(92vw,560px)
    }
    .dialog-actions{display:flex; gap:8px; justify-content:flex-end; margin-top:12px}

    /* Toasts */
    #toast-layer{
      position:fixed; inset:auto 0 12px 0; display:grid; justify-items:center; gap:8px; padding:10px; 
      pointer-events:none; z-index: 9999;
    }
    .toast{
      background:linear-gradient(180deg, #132a52, #0E1B36) !important;
      border: 1px solid rgba(0,255,240,.55) !important; color: #eafffb !important;
      padding:10px 12px; border-radius:12px; max-width: 90vw; text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,.5) !important;
      animation: rise 900ms ease forwards;
    }
    @keyframes rise{0%{transform:translateY(10px); opacity:0} 100%{transform:translateY(-10px); opacity:1}}

    .toast .yellow { color: var(--yellow) !important; }
    .cyan{color:var(--cyan)}

    .zap::after{
      content:""; position:absolute; inset:0; background: linear-gradient(90deg, transparent, rgba(0,255,240,.25), transparent);
      animation: zap 600ms ease; pointer-events:none
    }
    @keyframes zap{0%{transform:translateX(-120%)}100%{transform:translateX(120%)}}

    /* Ensure proper hiding */
    [hidden] { display: none !important; }

    /* Stats */
    .stats{display:flex; gap:12px; color:var(--muted); font-size:.9rem}
  </style>
</head>
<body>

  <header class="app-header">
    <div class="logo">NEON/<span>TASKS</span> <small>v0.12</small></div>
  </header>

  <nav class="tabs" role="tablist" aria-label="Views">
    <button class="tab" data-tab="summary" aria-selected="true" role="tab">Summary</button>
    <button class="tab" data-tab="create"  aria-selected="false" role="tab">Create</button>
    <button class="tab" data-tab="tasks"   aria-selected="false" role="tab">Tasks</button>
    <button class="tab" data-tab="calendar" aria-selected="false" role="tab">Calendar</button>
    <button class="tab" data-tab="characters" aria-selected="false" role="tab">Characters</button>
    <button class="tab" data-tab="config"  aria-selected="false" role="tab">Config</button>
  </nav>

  <main id="views" tabindex="-1">
    <!-- SUMMARY -->
    <section id="view-summary" class="view">
      <div id="summary-grid" class="summary-grid"></div>
    </section>

    <!-- CREATE -->
    <section id="view-create" class="view" hidden>
      <div class="card">
        <h3>Add Task (quick)</h3>
        <form id="quick-form" class="form">
          <div class="field">
            <label for="q-title">Title <span class="req">*</span></label>
            <input id="q-title" name="title" placeholder="Task title" required />
          </div>

          <div class="row">
            <div class="field">
              <label for="q-priority">Priority</label>
              <select id="q-priority" name="priority">
                <option>Low</option>
                <option selected>Medium</option>
                <option>High</option>
              </select>
            </div>
            <div class="field">
              <label for="q-due">Due</label>
              <input id="q-due" type="date" />
            </div>
          </div>

          <div class="row">
            <div class="field">
              <label for="q-category">Category</label>
              <select id="q-category"></select>
            </div>
            <div class="field">
              <label for="q-notes">Notes</label>
              <input id="q-notes" placeholder="Optional notes" />
            </div>
          </div>

          <div class="actions">
            <button class="btn primary" type="submit">Add</button>
            <button class="btn" type="reset">Clear</button>
          </div>
        </form>
      </div>
    </section>

    <!-- TASKS -->
    <section id="view-tasks" class="view" hidden>
      <div class="card">
        <div class="stats">
          <div id="stat-done">Done: 0</div>
          <div id="stat-today">Due Today: 0</div>
          <div id="stat-total">Total: 0</div>
        </div>
      </div>
      <div id="task-groups" class="task-groups"></div>
    </section>

    <!-- CALENDAR -->
    <section id="view-calendar" class="view" hidden>
      <div class="card">
        <h3>Calendar</h3>
        <p class="muted">Calendar view - placeholder</p>
      </div>
    </section>

    <!-- CHARACTERS -->
    <section id="view-characters" class="view" hidden>
      <div id="chars-empty" class="card empty">No characters yet — complete tasks to unlock allies.</div>
      <div id="chars-grid" class="chars-grid"></div>
    </section>

    <!-- CONFIG -->
    <section id="view-config" class="view" hidden>
      <div class="card">
        <h3>XP settings</h3>
        <div class="row">
          <div class="field">
            <label for="xp-preset">Preset</label>
            <select id="xp-preset">
              <option>Default</option>
              <option>Aggressive</option>
              <option>Gentle</option>
            </select>
          </div>
          <div class="field">
            <label for="xp-scale">Scale</label>
            <select id="xp-scale">
              <option>Linear</option>
              <option>Square root</option>
              <option>Log</option>
            </select>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>Character unlock threshold</h3>
        <p class="muted">XP needed to unlock character (gacha mechanic)</p>
        <div class="row">
          <div class="field">
            <label for="unlock-threshold-input">Unlock XP</label>
            <input id="unlock-threshold-input" type="number" min="10" step="10" />
          </div>
          <div class="actions">
            <button id="apply-unlock-threshold" class="btn primary">Apply</button>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>Tier thresholds</h3>
        <p class="muted">XP needed to unlock each character tier</p>
        <div class="row">
          <div class="field">
            <label for="tier-a-input">Tier A XP</label>
            <input id="tier-a-input" type="number" min="10" step="10" />
          </div>
          <div class="field">
            <label for="tier-b-input">Tier B XP</label>
            <input id="tier-b-input" type="number" min="50" step="10" />
          </div>
        </div>
        <div class="row">
          <div class="field">
            <label for="tier-c-input">Tier C XP</label>
            <input id="tier-c-input" type="number" min="100" step="10" />
          </div>
          <div class="actions">
            <button id="apply-tier-thresholds" class="btn primary">Apply</button>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>Data controls</h3>
        <div class="row">
          <button id="seed-demo" class="btn">Seed demo data</button>
          <button id="export-completed" class="btn">Export full backup</button>
          <button id="import-completed" class="btn">Import backup</button>
          <input id="import-completed-file" type="file" accept="application/json,.json" style="display:none" />
          <button id="reset-all" class="btn danger">Reset all</button>
        </div>
      </div>
    </section>
  </main>

  <!-- Generic Lightbox -->
  <dialog id="lightbox">
    <div>
      <div class="actions" style="justify-content:flex-end">
        <button id="lightbox-close" class="btn">Close</button>
      </div>
      <div id="lightbox-content"></div>
    </div>
  </dialog>

  <!-- Toasts -->
  <div id="toast-layer" aria-live="polite" aria-atomic="true"></div>

<script>
const LS_KEY = "neon_tasks_v07";
const CATEGORIES = ["Fitness","Home","Finance","Work","Rose","Skills","Other"];
const PRIORITY_COLORS = { Low: "#00fff0", Medium: "#ffe066", High: "#ff355e" };
const DEFAULT_CONFIG = {
  characterUnlockThreshold: 50,
  tierThresholds: { A: 100, B: 250, C: 500 },
  weights: { priority: { Low:1, Medium:2, High:3 }, estHour: 1 }
};
const TIER_LABELS = { A: "Tier A", B: "Tier B", C: "Tier C" };

let CHAR_POOL = {};
let ACTIVITY = [];
const STATE = loadState();

function loadState() {
  let s;
  try { 
    s = JSON.parse(localStorage.getItem(LS_KEY) || "{}"); 
  } catch { 
    s = {}; 
  }
  return {
    tasks: s.tasks || [],
    characters: s.characters || {},
    config: s.config || {...DEFAULT_CONFIG},
    meta: s.meta || { completedCount: 0 },
    activity: s.activity || [],
    categoryXP: s.categoryXP || {},
    readyToOpen: s.readyToOpen || {}
  };
}

function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(STATE));
}

function uid() { 
  return Math.random().toString(36).slice(2)+Date.now().toString(36); 
}

function todayStr() { 
  return new Date().toISOString().slice(0,10); 
}

function escapeHTML(s) { 
  return (s||"").replace(/[&<>"']/g, m=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); 
}

function defaultPortraitForCategory(cat){
  const color = {
    Fitness:"#23ffd9", Home:"#a26bff", Finance:"#ffe066",
    Work:"#ff33cc", Rose:"#ff6ad5", Skills:"#66ccff", Other:"#66ff99"
  }[cat] || "#6bf";
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'>
      <defs><linearGradient id='g' x1='0' x2='1'>
        <stop stop-color='${color}' stop-opacity='.85' offset='0'/>
        <stop stop-color='#0b0f1a' offset='1'/></linearGradient></defs>
      <rect width='600' height='400' fill='url(#g)'/>
      <text x='50%' y='58%' text-anchor='middle' font-size='46' fill='white' font-family='system-ui' opacity='.9'>${cat}</text>
    </svg>`
  );
  return `data:image/svg+xml;charset=utf-8,${svg}`;
}

function placeholderPortraitForCategory(cat){
  const color = {
    Fitness:"#23ffd9", Home:"#a26bff", Finance:"#ffe066",
    Work:"#ff33cc", Rose:"#ff6ad5", Skills:"#66ccff", Other:"#66ff99"
  }[cat] || "#6bf";
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 420'>
      <rect width='640' height='420' rx='26' fill='url(#g)'/>
      <text x='50%' y='78%' text-anchor='middle' font-size='28' fill='#d9e6ff' opacity='.9' font-family='system-ui'>${cat.toUpperCase()} · LOCKED</text>
    </svg>`
  );
  return `data:image/svg+xml;charset=utf-8,${svg}`;
}

function gachaReadyPortraitForCategory(cat){
  const color = {
    Fitness:"#23ffd9", Home:"#a26bff", Finance:"#ffe066",
    Work:"#ff33cc", Rose:"#ff6ad5", Skills:"#66ccff", Other:"#66ff99"
  }[cat] || "#6bf";
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 420'>
      <rect width='640' height='420' rx='26' fill='${color}'/>
      <text x='50%' y='50%' text-anchor='middle' font-size='48' fill='white' font-family='system-ui' font-weight='700'>?</text>
    </svg>`
  );
  return `data:image/svg+xml;charset=utf-8,${svg}`;
}

function isUnlocked(cat) { 
  return !!STATE.characters[cat]; 
}

function getCategoryXP(cat) {
  return STATE.categoryXP[cat] || 0;
}

function getCharacterTier(char) {
  const xp = char.categoryXP || 0;
  const thresholds = STATE.config.tierThresholds;
  if (xp >= thresholds.C) return 'C';
  if (xp >= thresholds.B) return 'B';
  if (xp >= thresholds.A) return 'A';
  return null;
}

function getUnlockedTiers(char) {
  const xp = char.categoryXP || 0;
  const thresholds = STATE.config.tierThresholds;
  const unlocked = [];
  if (xp >= thresholds.A) unlocked.push('A');
  if (xp >= thresholds.B) unlocked.push('B');
  if (xp >= thresholds.C) unlocked.push('C');
  return unlocked;
}

function loadCharacters(){
  CHAR_POOL = {};
  for(const cat of CATEGORIES){
    CHAR_POOL[cat] = [1,2,3].map(n=>({
      category: cat,
      image: defaultPortraitForCategory(cat),
      name: `${cat} Operative ${n}`,
      rarity: ["R","SR","SSR"][n-1] || "R",
      lore: {
        A: `The origins of this ${cat} operative remain shrouded in mystery...`,
        B: `Through countless missions, this ally has proven their worth time and again...`,
        C: `At the pinnacle of their abilities, they stand as a legend among operatives...`
      }
    }));
  }
}

function toast(html){
  const layer = document.getElementById("toast-layer");
  if(!layer) return;
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = html;
  layer.appendChild(t);
  setTimeout(() => t.remove(), 2300);
}

function openLightbox(html){
  const dlg = document.getElementById("lightbox");
  const cont = document.getElementById("lightbox-content");
  const close = document.getElementById("lightbox-close");
  if(!dlg || !cont || !close) return;
  cont.innerHTML = html;
  dlg.showModal();
  close.onclick = () => dlg.close();
}

function setupTabs(){
  const tabs = document.querySelectorAll(".tabs .tab");
  tabs.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      tabs.forEach(b=>b.setAttribute("aria-selected","false"));
      btn.setAttribute("aria-selected","true");
      const id = btn.dataset.tab;
      document.querySelectorAll("main > section").forEach(s=> s.hidden = !s.id.endsWith(id));
      if(id==="tasks") renderTasks();
      if(id==="summary") renderSummary();
      if(id==="characters") renderCharacters();
    });
  });
}

function computeTaskXP(t){
  const pr = STATE.config.weights.priority[t.priority] || 1;
  const est = Number(t.estimate || 0);
  return Math.max(1, Math.round(pr*10 + est*5));
}

function addCategoryXP(category, xp){
  if (!STATE.categoryXP[category]) STATE.categoryXP[category] = 0;
  STATE.categoryXP[category] += xp;
  
  if (STATE.characters[category]) {
    STATE.characters[category].categoryXP = (STATE.characters[category].categoryXP || 0) + xp;
    
    const char = STATE.characters[category];
    const currentTier = getCharacterTier(char);
    
    if (currentTier && (!char.lastNotifiedTier || char.lastNotifiedTier !== currentTier)) {
      char.lastNotifiedTier = currentTier;
      toast(`🌟 <strong>${char.name}</strong> reached <span class="yellow">${TIER_LABELS[currentTier]}</span>!`);
    }
  }
  save();
}

function addActivity(title, xp = 0, kind = "generic"){
  const entry = { when: new Date().toISOString(), title, xp, kind };
  ACTIVITY.unshift(entry);
  ACTIVITY = ACTIVITY.slice(0, 100);
  STATE.activity = ACTIVITY;
  save();
}

function renderSummary(){
  const section = document.getElementById("view-summary");
  const grid = document.getElementById("summary-grid");
  if(!section || !grid) return;

  const cats = CATEGORIES.filter(c => c !== "Other");
  grid.innerHTML = cats.map(cat=>{
    const unlocked = isUnlocked(cat);
    const categoryXP = getCategoryXP(cat);
    const readyToOpen = STATE.readyToOpen && STATE.readyToOpen[cat];
    
    let portrait, labelClass = "", labelText = cat;
    
    if (unlocked) {
      portrait = STATE.characters[cat]?.image || defaultPortraitForCategory(cat);
      labelText = `${cat}<div class="xp-indicator">${categoryXP} XP</div>`;
    } else if (readyToOpen) {
      portrait = gachaReadyPortraitForCategory(cat);
      labelClass = "ready-to-open";
      labelText = `${cat}<div class="gacha-indicator">Tap to open!</div>`;
    } else {
      portrait = placeholderPortraitForCategory(cat);
      labelText = `${cat}<div class="xp-indicator">${categoryXP}/${STATE.config.characterUnlockThreshold} XP</div>`;
    }
      
    return `
      <button class="tile ${unlocked ? "" : (readyToOpen ? "ready-gacha" : "locked")}" data-cat="${cat}">
        <img alt="" src="${portrait}">
        <div class="label ${labelClass}">${labelText}</div>
      </button>`;
  }).join("");

  grid.querySelectorAll(".tile").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const cat = btn.dataset.cat;
      const unlocked = isUnlocked(cat);
      const readyToOpen = STATE.readyToOpen && STATE.readyToOpen[cat];
      
      if (unlocked) {
        const img = STATE.characters[cat]?.image || defaultPortraitForCategory(cat);
        const char = STATE.characters[cat];
        const tier = getCharacterTier(char);
        const tierText = tier ? ` (${TIER_LABELS[tier]})` : " (No Tier)";
        openLightbox(`
          <div style="text-align: center;">
            <img src="${img}" alt="${cat} portrait" style="max-width:100%;max-height:300px;border-radius:12px" />
            <h3>${char.name}${tierText}</h3>
            <p><strong>${char.categoryXP || 0} XP</strong> · ${cat} Category</p>
          </div>
        `);
      } else if (readyToOpen) {
        openGachaFor(cat);
      } else {
        const categoryXP = getCategoryXP(cat);
        const needed = STATE.config.characterUnlockThreshold - categoryXP;
        openLightbox(`
          <h3>${cat} Character Locked</h3>
          <p class="muted">Complete <strong>${cat}</strong> tasks to unlock this ally.</p>
          <p><strong>Progress:</strong> ${categoryXP}/${STATE.config.characterUnlockThreshold} XP</p>
          ${needed > 0 ? `<p class="muted">Need ${needed} more XP to unlock</p>` : ""}
        `);
      }
    });
  });

  let act = document.getElementById("summary-activity");
  if (!act) {
    act = document.createElement("div");
    act.id = "summary-activity";
    act.className = "card";
    section.appendChild(act);
  }
  
  const recent = (STATE.activity || []).slice(0,3);
  act.innerHTML = `
    <div class="group-head">
      <strong>Recent activity</strong>
      <span class="muted">${recent.length ? "" : "No recent actions yet"}</span>
    </div>
    <div class="activity-list" role="list">
      ${recent.map(e=>{
        const d = new Date(e.when);
        const when = d.toLocaleString(undefined, { month:"short", day:"numeric" });
        const iconFor = (kind)=>{
          switch(kind){
            case "character_found": return "🎉";
            case "task_completed":  return "⚡";
            case "tier_unlock":     return "🌟";
            default: return "•";
          }
        };
        return `
          <div class="activity-row" role="listitem">
            <span class="a-icn">${iconFor(e.kind)}</span>
            <span class="a-text">${escapeHTML(e.title)}</span>
            <time class="a-date">${when}</time>
          </div>`;
      }).join("")}
    </div>`;
}

function unlockCharacterMaybe(category, xpGained){
  const categoryXP = getCategoryXP(category);
  
  if(!STATE.characters[category] && categoryXP >= STATE.config.characterUnlockThreshold){
    STATE.readyToOpen = STATE.readyToOpen || {};
    STATE.readyToOpen[category] = true;
    save();
    renderSummary();
  }
}

function openGachaFor(category) {
  const availableChars = CHAR_POOL[category] || [];
  let pick;
  
  if (availableChars.length > 0) {
    pick = availableChars[Math.floor(Math.random() * availableChars.length)];
  } else {
    pick = {
      name: `${category} Ally`, 
      image: defaultPortraitForCategory(category), 
      rarity: "R", 
      category,
      lore: {
        A: `The origins of this ${category} operative remain shrouded in mystery...`,
        B: `Through countless missions, this ally has proven their worth time and again...`,
        C: `At the pinnacle of their abilities, they stand as a legend among operatives...`
      }
    };
  }
  
  const categoryXP = getCategoryXP(category);
  STATE.characters[category] = {
    name: pick.name, 
    rarity: pick.rarity || "R", 
    category, 
    categoryXP: categoryXP,
    image: pick.image,
    lore: pick.lore,
    unlockedTiers: [],
    lastNotifiedTier: null
  };
  
  if (STATE.readyToOpen && STATE.readyToOpen[category]) {
    delete STATE.readyToOpen[category];
  }
  
  addActivity(`Found ${pick.name}`, 0, "character_found");
  save();
  renderSummary();
  renderCharacters();
  
  const rarityColor = {R: '#9fb2c8', SR: '#ffe066', SSR: '#ff33cc'}[pick.rarity] || '#9fb2c8';
  openLightbox(`
    <div style="text-align: center;">
      <h2 style="color: ${rarityColor}; margin-bottom: 16px;">🎉 Character Unlocked!</h2>
      <img src="${pick.image}" alt="${pick.name}" 
           style="max-width:200px;max-height:200px;border-radius:12px;" />
      <h3 style="margin: 16px 0 8px 0;">${escapeHTML(pick.name)}</h3>
      <p style="color: ${rarityColor}; font-weight: 600; font-size: 1.1em;">${pick.rarity} Rarity</p>
      <p style="color: var(--muted); margin-top: 12px;">${category} Category</p>
    </div>
  `);
}

function renderCharacters(){
  const empty = document.getElementById("chars-empty");
  const grid = document.getElementById("chars-grid");
  if(!empty || !grid) return;

  const chars = Object.values(STATE.characters);
  empty.hidden = chars.length > 0;
  grid.hidden = chars.length === 0;

  if (chars.length === 0) return;

  grid.innerHTML = chars.map(char => {
    const tier = getCharacterTier(char);
    const unlockedTiers = getUnlockedTiers(char);
    const tierText = tier ? TIER_LABELS[tier] : "No Tier";
    
    return `
      <div class="char-card">
        <div class="char-portrait">
          <img src="${char.image}" alt="${escapeHTML(char.name)}" />
        </div>
        <div class="char-body">
          <div><strong>${escapeHTML(char.name)}</strong></div>
          <div><span class="pink">${char.rarity}</span> · ${char.category} · <span class="muted">${tierText}</span></div>
          <div><strong>${char.categoryXP || 0} XP</strong></div>
          <div class="progress">
            <div style="width: ${Math.min(100, ((char.categoryXP || 0) / STATE.config.tierThresholds.C) * 100)}%"></div>
          </div>
          <div class="actions tier-buttons">
            ${['A', 'B', 'C'].map(t => {
              const isUnlocked = unlockedTiers.includes(t);
              return `<button class="btn tier-btn" data-char-cat="${char.category}" data-tier="${t}" ${isUnlocked ? '' : 'disabled'}>
                Text ${t}
              </button>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.tier-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.charCat;
      const tier = btn.dataset.tier;
      const char = STATE.characters[cat];
      
      if (char && char.lore && char.lore[tier]) {
        openLightbox(`
          <div style="text-align: center;">
            <img src="${char.image}" alt="${char.name}" style="max-width:150px;max-height:150px;border-radius:12px;margin-bottom:16px;" />
            <h3>${escapeHTML(char.name)} - ${TIER_LABELS[tier]}</h3>
            <p style="line-height: 1.6; margin-top: 16px; text-align: left;">${escapeHTML(char.lore[tier])}</p>
          </div>
        `);
      }
    });
  });
}

document.addEventListener("submit", (e)=>{
  if(e.target && e.target.id === "quick-form"){
    e.preventDefault();
    const t = {
      id: uid(),
      title: document.getElementById("q-title").value.trim(),
      due: document.getElementById("q-due").value || null,
      priority: document.getElementById("q-priority").value,
      category: document.getElementById("q-category").value,
      notes: document.getElementById("q-notes").value.trim(),
      type: "oneoff",
      estimate: 1,
      done: false,
      createdAt: new Date().toISOString()
    };
    if(!t.title){ 
      document.getElementById("q-title").reportValidity(); 
      return; 
    }
    STATE.tasks.push(t); 
    save();
    toast(`<strong class="cyan">Task created</strong>: ${escapeHTML(t.title)}`);
    e.target.reset();
    renderTasks();
  }
});

function renderTasks(){
  const groupsEl = document.getElementById("task-groups");
  if(!groupsEl) return;

  const doneCount = STATE.tasks.filter(t=>t.done).length;
  const todayCount = STATE.tasks.filter(t=>t.due === todayStr() && !t.done).length;
  const statDone = document.getElementById("stat-done");
  const statToday = document.getElementById("stat-today");
  const statTotal = document.getElementById("stat-total");
  if(statDone) statDone.textContent = `Done: ${doneCount}`;
  if(statToday) statToday.textContent = `Due Today: ${todayCount}`;
  if(statTotal) statTotal.textContent = `Total: ${STATE.tasks.length}`;

  const tasks = STATE.tasks.filter(t => !t.done);
  if(tasks.length === 0){
    groupsEl.innerHTML = `<div class="card muted">No active tasks. Create some in the Create tab!</div>`;
    return;
  }

  groupsEl.innerHTML = `<div class="group card">
    <div class="group-head">
      <strong>Active Tasks</strong>
      <span class="muted">${tasks.length} task(s)</span>
    </div>
    <div class="group-body">${tasks.map(renderTaskCard).join("")}</div>
  </div>`;

  groupsEl.querySelectorAll(".task").forEach(card=>{
    card.querySelector(".btn-done").addEventListener("click", ()=>{
      completeTask(card.dataset.id);
      card.classList.add("zap");
      setTimeout(()=>renderTasks(), 620);
    });
    card.querySelector(".btn-del").addEventListener("click", ()=>{
      if(confirm("Delete this task?")){
        deleteTask(card.dataset.id);
        renderTasks();
      }
    });
  });
}

function renderTaskCard(t){
  const color = PRIORITY_COLORS[t.priority] || "#9cf";
  return `<div class="task" data-id="${t.id}">
    <div class="p-dot" style="color:${color}"></div>
    <div>
      <div class="title">${escapeHTML(t.title)}</div>
      <div class="meta">
        <span class="pill">${t.category}</span>
        <span class="pill">Priority: ${t.priority}</span>
        <span class="pill">Due: ${t.due || "No date"}</span>
      </div>
      ${t.notes ? `<div class="notes">${escapeHTML(t.notes)}</div>` : ""}
    </div>
    <div class="actions">
      <button class="btn btn-done">Done</button>
      <button class="btn btn-del">Delete</button>
    </div>
  </div>`;
}

function completeTask(id){
  const t = STATE.tasks.find(x=>x.id===id);
  if(!t || t.done) return;
  t.done = true;
  t.completedAt = new Date().toISOString();
  STATE.meta.completedCount++;
  const xp = computeTaskXP(t);
  
  addCategoryXP(t.category, xp);
  addActivity(`Completed: ${t.title}`, xp, "task_completed");
  unlockCharacterMaybe(t.category, xp);
  
  toast(`⚡ <strong>Completed</strong>: ${escapeHTML(t.title)} <span class="muted">(+${xp} XP)</span>`);
  save();
  renderCharacters();
  renderSummary();
}

function deleteTask(id){ 
  STATE.tasks = STATE.tasks.filter(x=>x.id!==id); 
  save(); 
}

function setupConfig(){
  const seedDemo = document.getElementById("seed-demo");
  const resetBtn = document.getElementById("reset-all");
  
  if(seedDemo) {
    seedDemo.addEventListener("click", () => {
      const demoTasks = [
        {id: uid(), title: "Morning workout", category: "Fitness", priority: "Medium", due: todayStr(), estimate: 1, done: false, createdAt: new Date().toISOString(), type: "oneoff"},
        {id: uid(), title: "Clean kitchen", category: "Home", priority: "Low", due: todayStr(), estimate: 0.5, done: false, createdAt: new Date().toISOString(), type: "oneoff"},
        {id: uid(), title: "Review budget", category: "Finance", priority: "High", due: todayStr(), estimate: 2, done: false, createdAt: new Date().toISOString(), type: "oneoff"}
      ];
      STATE.tasks.push(...demoTasks);
      save();
      toast("Demo tasks added!");
      renderTasks();
    });
  }

  if(resetBtn) {
    resetBtn.addEventListener("click", () => {
      if(confirm("Reset all data? This cannot be undone.")) {
        localStorage.removeItem(LS_KEY);
        location.reload();
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  ACTIVITY = STATE.activity || [];
  
  const qCat = document.getElementById("q-category");
  if (qCat) qCat.innerHTML = CATEGORIES.map(c=>`<option>${c}</option>`).join("");

  setupTabs();
  setupConfig();
  loadCharacters();
  renderSummary();
  renderTasks();
  renderCharacters();
});

</script>
</body>
</html>
