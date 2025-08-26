/* NEON/TASKS v0.11 — import/export completed tasks
   - Summary activity tidy (one-line)
   - Calendar neon-dots
   - Characters: locked placeholders
   - CSV loader w/ fallback
   - Added completedAt timestamp on finish
   - Export/Import completed tasks (JSON)
   - Preserves existing localStorage (v0.7 key)
*/

(() => {
  "use strict";

  // ---------- Constants ----------
  const LS_KEY = "neon_tasks_v07"; // keep existing data
  const CATEGORIES = ["Fitness","Home","Finance","Work","Rose","Skills","Other"];
  const PRIORITY_COLORS = { Low: "#00fff0", Medium: "#ffe066", High: "#ff355e" };
  const DEFAULT_CONFIG = {
    xpPreset: "Default",
    scale: "Linear",
    bossTarget: 300,
    weights: { priority: { Low:1, Medium:2, High:3 }, estHour: 1, streak: 0.5 }
  };
  const CSV_TO_APP_CATEGORY = {
  "Training": "Fitness",
  "Home": "Home", 
  "Work": "Work",
  "Finance": "Finance",
  "Skills": "Skills",
  "Rose Foundation": "Rose",
  "Unknown": "Other"
};

  // ---------- State ----------
  let SESSION_CHAR = {};   // per-run random pick per category (for previews)
  let CHAR_POOL = {};      // full CSV pool by category
  let ACTIVITY = [];       // notable actions (persisted)
  const STATE = loadState(); // includes STATE.activity

  document.addEventListener("DOMContentLoaded", init);

  function loadState() {
    let s;
    try { s = JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { s = {}; }
    return {
      tasks: s.tasks || [],
      characters: s.characters || {},        // unlocked characters keyed by category
      config: s.config || deepClone(DEFAULT_CONFIG),
      power: s.power || 0,
      calendarCursor: s.calendarCursor || todayStr().slice(0,7), // YYYY-MM
      seedVersion: s.seedVersion || 0,
      meta: s.meta || { installedAt: Date.now(), completedCount: 0 },
      activity: s.activity || []             // persisted activity feed
    };
  }
  function save() {
    localStorage.setItem(LS_KEY, JSON.stringify(STATE));
    renderHeaderPower();
  }
  ACTIVITY = STATE.activity || [];

  // ---------- Utilities ----------
  function deepClone(o){ return JSON.parse(JSON.stringify(o)); }
  function uid(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }
  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
  function todayStr(){ return new Date().toISOString().slice(0,10); }
  function fmtDate(iso){ if(!iso) return "—"; const d = new Date(iso+"T00:00:00"); return d.toLocaleDateString(undefined,{month:"short", day:"numeric"}); }
  function startOfWeek(d){ const dt = new Date(d); const day = dt.getDay(); const diff = (day+6)%7; dt.setDate(dt.getDate()-diff); return dt; }
  function endOfWeek(d){ const s = startOfWeek(d); const e = new Date(s); e.setDate(e.getDate()+6); return e; }
  function inRange(dateIso, a, b){ const d = new Date(dateIso+"T00:00:00"); return d >= new Date(a) && d <= new Date(b); }
  function priorityScore(p){ return STATE.config.weights.priority[p] ?? 1; }
  function escapeHTML(s){ return (s||"").replace(/[&<>"']/g, m=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function ellipsize(s, max){ s = String(s || ""); return s.length > max ? s.slice(0, max - 1) + "…" : s; }

  // ---------- Portraits & Locks ----------
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
        <g fill='none' stroke='${color}' stroke-width='6' opacity='.85'>
          <rect x='40' y='40' width='520' height='320' rx='26'/>
          <path d='M70 360L220 180 320 260 380 210 530 360'/>
        </g>
        <text x='50%' y='58%' text-anchor='middle' font-size='46' fill='white' font-family='system-ui' opacity='.9'>${cat}</text>
      </svg>`
    );
    return `data:image/svg+xml;charset=utf-8,${svg}`;
  }
  function isUnlocked(cat){ return !!STATE.characters[cat]; }
  function placeholderPortraitForCategory(cat){
    const color = {
      Fitness:"#23ffd9", Home:"#a26bff", Finance:"#ffe066",
      Work:"#ff33cc", Rose:"#ff6ad5", Skills:"#66ccff", Other:"#66ff99"
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
</svg>`);
    return `data:image/svg+xml;charset=utf-8,${svg}`;
  }
  function ensureLockedCharCSS(){
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

  // ---------- CSV Helpers ----------
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    text = text.replace(/\r\n/g, '\n');
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; } else { inQuotes = false; }
        } else { cell += ch; }
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { row.push(cell); cell = ''; }
        else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
        else cell += ch;
      }
    }
    row.push(cell); rows.push(row);
    while (rows.length && rows[rows.length - 1].every(x => x.trim() === '')) rows.pop();
    const header = rows.shift().map(h => h.trim());
    return { header, rows };
  }
  function normalizeImageName(raw, categoryLower) {
  if (!raw) return null;
  
  let s = String(raw).trim()
    .replace(/^["""']+/, '')
    .replace(/["""']+$/, '');
  s = s.split('/').pop().split('\\').pop().trim();
  s = s.replace(/[.\s]+$/g, '');
  
  if (!s) return null;
  
  // Add extension if missing
  if (!/\.(png|jpg|jpeg|webp|gif)$/i.test(s)) s += '.png';
  
  // Handle the specific naming patterns in your CSV
  // Your CSV has: fitness-1.png, skill-1.png, home-1.png, etc.
  const expectedPattern = new RegExp(`^${categoryLower}-([1-3])\\.(png|jpg|jpeg|webp|gif)$`, 'i');
  if (expectedPattern.test(s)) {
    return s; // Already in correct format
  }
  
  // Handle "skill-" vs "skills" category mismatch
  if (categoryLower === 'skills' && /^skill-\d+\.(png|jpg|jpeg|webp|gif)$/i.test(s)) {
    return s; // Keep skill-N.png for Skills category
  }
  
  // Extract number from filename and create proper format
  const numMatch = s.match(/([1-3])(?!\d)/);
  if (numMatch) {
    return `${categoryLower}-${numMatch[1]}.png`;
  }
  
  return s; // Return as-is if we can't normalize
}

  // ---------- CSV Loader (pool) ----------
  // Replace the entire loadCharactersFromCSV function in your app.js
// Replace the loadCharactersFromCSV function with this corrected version
async function loadCharactersFromCSV(){
  const path = "assets/Cyberpunk App.csv";
  try{
    const res = await fetch(path, {cache:"no-store"});
    if(!res.ok) {
      console.warn(`CSV fetch failed: ${res.status} ${res.statusText}`);
      throw new Error("csv missing");
    }
    const text = await res.text();
    console.log("CSV loaded successfully, length:", text.length);

    const { header, rows } = parseCSV(text);
    console.log("CSV parsed - headers:", header);
    console.log("CSV parsed - rows:", rows.length);
    
    // Log all headers to see exactly what we have
    header.forEach((h, i) => console.log(`Header ${i}: "${h}"`));
    
    const idx = {
      cat: header.findIndex(h => h && /category/i.test(h.trim())),
      img: header.findIndex(h => h && /image/i.test(h.trim())), 
      name: header.findIndex(h => h && /name.*title|title.*name|name/i.test(h.trim())), // Better regex for "Name/Title"
      rarity: header.findIndex(h => h && /rarity/i.test(h.trim()))
    };
    
    console.log("Column indices:", idx);
    console.log("Found columns:", {
      category: header[idx.cat],
      image: header[idx.img], 
      name: header[idx.name],
      rarity: header[idx.rarity]
    });
    
    if (idx.cat === -1) throw new Error("Category column not found in CSV");
    if (idx.name === -1) throw new Error("Name/Title column not found in CSV");

    const byCat = {};
    let processedCount = 0;
    
    for(let i = 0; i < rows.length; i++){
      const cols = rows[i];
      if (!cols || !cols.length) continue;

      // Safely get values - handle undefined/null
      const csvCategory = cols[idx.cat] ? cols[idx.cat].toString().trim() : "";
      const rawName = cols[idx.name] ? cols[idx.name].toString().trim() : "";
      const rawImg = cols[idx.img] ? cols[idx.img].toString().trim() : "";
      const rawRarity = cols[idx.rarity] ? cols[idx.rarity].toString().trim() : "R";
      
      // Skip empty rows or Unknown category
      if (!csvCategory || csvCategory === "Unknown") {
        console.log(`Skipping row ${i}: empty or unknown category`);
        continue; 
      }
      
      // Map CSV category to app category
      const cat = CSV_TO_APP_CATEGORY[csvCategory] || csvCategory;
      const categoryLower = cat.toLowerCase().replace(/\s+/g, '-');

      console.log(`Row ${i}: "${csvCategory}" -> "${cat}" (${categoryLower})`);
      console.log(`  Name: "${rawName}"`);
      console.log(`  Image: "${rawImg}"`);
      console.log(`  Rarity: "${rawRarity}"`);
      
      // Create image path
      let chosen;
      if (rawImg) {
        chosen = `assets/characters/${categoryLower}/${rawImg}`;
      } else {
        chosen = `assets/characters/${categoryLower}/${categoryLower}-${1 + Math.floor(Math.random()*3)}.png`;
      }

      const character = {
        category: cat,
        image: chosen,
        name: rawName || `${cat} Ally`,
        rarity: rawRarity || "R"
      };
      
      console.log("✓ Created character:", character);

      if (!byCat[cat]) byCat[cat] = [];
      byCat[cat].push(character);
      processedCount++;
    }
    
    console.log(`✓ Successfully processed ${processedCount} characters from CSV`);
    console.log("Final character data by category:");
    Object.entries(byCat).forEach(([cat, chars]) => {
      console.log(`  ${cat}: ${chars.length} characters`);
      chars.forEach((char, idx) => {
        console.log(`    ${idx + 1}. "${char.name}" (${char.rarity}) - ${char.image}`);
      });
    });
    
    // Ensure we have at least some characters
    if (Object.keys(byCat).length === 0) {
      throw new Error("No valid characters found in CSV");
    }
    
    return byCat;
    
  } catch(e) {
    console.error("❌ CSV loading failed with error:", e);
    console.error("Full error details:", e.message, e.stack);
    console.log("📋 Falling back to generated characters");
    
    // Fallback to generated characters
    const byCat = {};
    for(const cat of CATEGORIES){
      const slug = cat.toLowerCase().replace(/\s+/g, '-');
      byCat[cat] = [1,2,3].map(n=>({
        category: cat,
        image: `assets/characters/${slug}/${slug}-${n}.png`,
        name: `${cat} Operative ${n}`,
        rarity: ["R","SR","SSR"][n-1] || "R"
      }));
    }
    return byCat;
  }
}

  // ---------- Session Picks ----------
  function makeSessionCharacters(pool){
    const chosen = {};
    for(const cat of CATEGORIES){
      const list = pool[cat] || [];
      if(list.length){
        chosen[cat] = list[Math.floor(Math.random()*list.length)];
      }else{
        chosen[cat] = { category:cat, image: defaultPortraitForCategory(cat), name: `${cat} Ally`, rarity: "R" };
      }
    }
    return chosen;
  }

  // ---------- App Init ----------
  async function init(){
    // Populate quick-create category select
    const qCat = document.getElementById("q-category");
    if (qCat) qCat.innerHTML = CATEGORIES.map(c=>`<option>${c}</option>`).join("");

    setupTabs();
    setupAddDialog();
    setupTaskToolbar();
    setupCalendar();
    setupConfig();
    setupReset();

    // Characters
    CHAR_POOL = await loadCharactersFromCSV();
    SESSION_CHAR = makeSessionCharacters(CHAR_POOL);

    renderAll();

    if("serviceWorker" in navigator){
      navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
    }
  }
  function renderAll(){
    renderHeaderPower();
    renderSummary();
    renderTasks();
    renderCalendar();
    renderCharacters();
    renderBoss();
  }

  // ---------- Toasts & Lightbox ----------
  function toast(html){
    const layer = document.getElementById("toast-layer");
    if(!layer) return;
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = html;
    layer.appendChild(t);
    setTimeout(()=>{ t.remove(); }, 2300);
  }
  function openLightbox(html){
    const dlg = document.getElementById("lightbox");
    const cont = document.getElementById("lightbox-content");
    const close = document.getElementById("lightbox-close");
    if(!dlg || !cont || !close) return;
    cont.innerHTML = html;
    dlg.showModal();
    close.onclick = ()=> dlg.close();
  }

  // ---------- Tabs ----------
  function setupTabs(){
    const tabs = document.querySelectorAll(".tabs .tab");
    tabs.forEach(btn=>{
      btn.addEventListener("click", ()=>{
        tabs.forEach(b=>b.setAttribute("aria-selected","false"));
        btn.setAttribute("aria-selected","true");
        const id = btn.dataset.tab; // summary, create, tasks, calendar, characters, boss, config
        document.querySelectorAll("main > section").forEach(s=> s.hidden = !s.id.endsWith(id));
        const views = document.getElementById("views");
        if(views?.focus) views.focus({preventScroll:true});
        if(id==="tasks") renderTasks();
        if(id==="summary") renderSummary();
        if(id==="characters") renderCharacters();
        if(id==="calendar") renderCalendar();
        if(id==="boss") renderBoss();
      });
    });
  }

  // ---------- Power & XP ----------
  function computeTaskXP(t){
    const pr = priorityScore(t.priority);
    const est = Number(t.estimate || 0);
    const streak = STATE.config.weights.streak;
    let base = pr*10 + est*STATE.config.weights.estHour*5;
    switch(STATE.config.scale){
      case "Square root": base = Math.sqrt(base)*12; break;
      case "Log": base = Math.log10(base+1)*24; break;
    }
    const streakLevel = (STATE.meta.completedCount % 7);
    base += streak * streakLevel * 2;
    return Math.max(1, Math.round(base));
  }
  function addPower(xp){
    STATE.power += xp;
    save();
    renderHeaderPower();
  }
  function renderHeaderPower(){
    const pctEl = document.getElementById("power-perc");
    const bar = document.getElementById("powerbar-inner");
    if(!pctEl || !bar) return;
    const pct = clamp(Math.round( (STATE.power % STATE.config.bossTarget) / STATE.config.bossTarget * 100 ), 0, 100);
    pctEl.textContent = `${pct}%`;
    bar.style.width = `${pct}%`;
  }

  // ---------- Activity (persisted) ----------
  // kind: "character_found" | "task_completed" | "boss_win" | "boss_loss" | "generic"
  function addActivity(title, xp = 0, kind = "generic"){
    const entry = { when: new Date().toISOString(), title, xp, kind };
    ACTIVITY.unshift(entry);
    ACTIVITY = ACTIVITY.slice(0, 100);
    STATE.activity = ACTIVITY;
    save();
  }

  // ---------- Summary (hide "Other"; show recent activity) ----------
  function renderSummary(){
    ensureLockedCharCSS();

    const section = document.getElementById("view-summary");
    const grid = document.getElementById("summary-grid");
    if(!section || !grid) return;

    // tiles (hide "Other")
    const cats = CATEGORIES.filter(c => c !== "Other");
    grid.innerHTML = cats.map(cat=>{
      const unlocked = isUnlocked(cat);
      const portrait = unlocked
        ? (STATE.characters[cat]?.image || defaultPortraitForCategory(cat))
        : placeholderPortraitForCategory(cat);
      return `
        <button class="tile ${unlocked? "" : "locked"}" data-cat="${cat}" aria-label="${cat} ${unlocked?'portrait':'locked'}">
          <img alt="" src="${portrait}">
          <div class="label">${cat}</div>
        </button>`;
    }).join("");

    // tile actions
    grid.querySelectorAll(".tile").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const cat = btn.dataset.cat;
        if (isUnlocked(cat)) {
          const img = STATE.characters[cat]?.image || defaultPortraitForCategory(cat);
          openLightbox(`<img src="${img}" alt="${cat} portrait" style="max-width:100%;border-radius:12px" />`);
        } else {
          openLightbox(`<h3>${cat} Character Locked</h3><p class="muted">Complete a <strong>${cat}</strong> task to unlock this ally.</p>`);
        }
      });
    });

    // little breathing room before activity section
    if (!document.getElementById("summary-activity-space")) {
      const s = document.createElement("style");
      s.id = "summary-activity-space";
      s.textContent = `
        #view-summary{ display:grid; gap:18px; }
        .summary-grid{ margin-bottom:6px; }
      `;
      document.head.appendChild(s);
    }

    // recent activity (last 3) – clean one-line layout
    let act = document.getElementById("summary-activity");
    if (!act) {
      act = document.createElement("div");
      act.id = "summary-activity";
      act.className = "card";
      section.appendChild(act);
    }
    const recent = (STATE.activity || []).slice(0,3);
    const iconFor = (kind)=>{
      switch(kind){
        case "character_found": return "🎉";
        case "task_completed":  return "⚡";
        case "boss_win":        return "🧨";
        case "boss_loss":       return "💀";
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
        ${recent.map(e=>{
          const d = new Date(e.when);
          const when = d.toLocaleString(undefined, { month:"short", day:"numeric" });
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

  // ---------- Quick Create ----------
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
        type: "oneoff", start: null, end: null, repeat: null,
        estimate: 1,
        done: false,
        createdAt: new Date().toISOString()
      };
      if(!t.title){ document.getElementById("q-title").reportValidity(); return; }
      STATE.tasks.push(t); save();
      toast(`<strong class="cyan">Task created</strong>: ${escapeHTML(t.title)}`);
      e.target.reset();
      renderTasks(); renderCalendar(); renderSummary();
    }
  });

  // ---------- Tasks ----------
  function setupTaskToolbar(){
    const s = document.getElementById("task-search");
    const sort = document.getElementById("task-sort");
    if(s) s.addEventListener("input", ()=> renderTasks());
    if(sort) sort.addEventListener("change", ()=> renderTasks());

    document.querySelectorAll(".toolbar .chip[data-scope]").forEach(ch=>{
      ch.addEventListener("click", ()=>{
        document.querySelectorAll(".toolbar .chip[data-scope]").forEach(c=>c.setAttribute("aria-pressed","false"));
        ch.setAttribute("aria-pressed","true");
        renderTasks();
      });
    });

    const wrap = document.getElementById("task-categories");
    if(wrap){
      wrap.innerHTML = ['All', ...CATEGORIES].map(c=>`<button class="chip" data-cat="${c}" aria-pressed="${c==='All'}">${c}</button>`).join("");
      wrap.querySelectorAll(".chip").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          wrap.querySelectorAll(".chip").forEach(b=>b.setAttribute("aria-pressed","false"));
          btn.setAttribute("aria-pressed","true");
          renderTasks();
        });
      });
    }
  }

  function renderTasks(){
    const groupsEl = document.getElementById("task-groups");
    if(!groupsEl) return;

    const search = (document.getElementById("task-search")?.value || "").toLowerCase();
    const sort = document.getElementById("task-sort")?.value || "priority";
    const scopeBtn = document.querySelector('.toolbar .chip[aria-pressed="true"][data-scope]');
    const scope = scopeBtn?.dataset.scope || "today";
    const activeCatBtn = document.querySelector('#task-categories .chip[aria-pressed="true"]');
    const catFilter = activeCatBtn ? activeCatBtn.dataset.cat : "All";

    const now = new Date(); const start = startOfWeek(now); const end = endOfWeek(now);
    const filtered = STATE.tasks.filter(t=>{
      if(catFilter !== "All" && t.category !== catFilter) return false;
      if(search && !(t.title.toLowerCase().includes(search) || (t.notes||"").toLowerCase().includes(search))) return false;
      if(scope === "today"){ return (t.due ? t.due === todayStr() : true); }
      if(scope === "week"){ return (t.due ? inRange(t.due, start, end) : true); }
      return true;
    });

    // Stats
    const doneCount = STATE.tasks.filter(t=>t.done).length;
    const todayCount = STATE.tasks.filter(t=>t.due === todayStr() && !t.done).length;
    const statDone = document.getElementById("stat-done");
    const statToday = document.getElementById("stat-today");
    const statTotal = document.getElementById("stat-total");
    if(statDone) statDone.textContent = `Done: ${doneCount}`;
    if(statToday) statToday.textContent = `Due Today: ${todayCount}`;
    if(statTotal) statTotal.textContent = `Total: ${STATE.tasks.length}`;

    // Sort
    let sortFn;
    if(sort === "priority") sortFn = (a,b)=> priorityScore(b.priority) - priorityScore(a.priority);
    else if(sort === "due") sortFn = (a,b)=> (a.due||"9999").localeCompare(b.due||"9999");
    else sortFn = (a,b)=> (a.createdAt||"").localeCompare(b.createdAt||"");
    filtered.sort(sortFn);

    // Group by due date
    const map = new Map();
    for(const t of filtered){
      const key = t.due || "No date";
      if(!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }

    if(filtered.length === 0){
      groupsEl.innerHTML = `<div class="card muted">No tasks match your filters.</div>`;
      return;
    }

    groupsEl.innerHTML = [...map.entries()].map(([k, arr])=>{
      const label = k==="No date" ? "No date" : `${fmtDate(k)} (${k})`;
      return `<div class="group card">
        <div class="group-head">
          <strong>${label}</strong>
          <span class="muted">${arr.length} task(s)</span>
        </div>
        <div class="group-body">${arr.map(renderTaskCard).join("")}</div>
      </div>`;
    }).join("");

    // Handlers
    groupsEl.querySelectorAll(".task").forEach(card=>{
      card.querySelector(".btn-done").addEventListener("click", ()=>{
        completeTask(card.dataset.id);
        card.classList.add("zap");
        setTimeout(()=>renderTasks(), 620);
      });
      card.querySelector(".btn-del").addEventListener("click", ()=>{
        if(confirm("Delete this task?")){
          deleteTask(card.dataset.id);
          renderTasks(); renderCalendar();
        }
      });

      // Mobile swipe affordance
      let sx=0, ex=0;
      card.addEventListener("touchstart", e=>{ sx = e.changedTouches[0].screenX; }, {passive:true});
      card.addEventListener("touchend", e=>{
        ex = e.changedTouches[0].screenX;
        const dx = ex - sx;
        if(dx > 60){ completeTask(card.dataset.id); card.classList.add("zap"); setTimeout(()=>renderTasks(), 620); }
        else if(dx < -60){ if(confirm("Delete this task?")){ deleteTask(card.dataset.id); renderTasks(); renderCalendar(); } }
      }, {passive:true});
    });
  }

  function renderTaskCard(t){
    const color = PRIORITY_COLORS[t.priority] || "#9cf";
    const done = t.done ? "done" : "";
    return `<div class="task ${done}" data-id="${t.id}">
      <div class="p-dot" style="color:${color}"></div>
      <div>
        <div class="title">${escapeHTML(t.title)}</div>
        <div class="meta">
          <span class="pill">${t.category}</span>
          <span class="pill">Priority: ${t.priority}</span>
          <span class="pill">Due: ${fmtDate(t.due)}</span>
          ${t.type!=="oneoff" ? `<span class="pill">${t.type}</span>` : ""}
          ${t.estimate ? `<span class="pill">~${t.estimate}h</span>` : ""}
        </div>
        ${t.notes ? `<div class="notes">${escapeHTML(t.notes)}</div>` : ""}
      </div>
      <div class="actions">
        <button class="btn btn-done">Done</button>
        <button class="btn btn-del">Delete</button>
      </div>
      <div class="hint"><span>← Delete</span><span>Done →</span></div>
    </div>`;
  }

  function completeTask(id){
    const t = STATE.tasks.find(x=>x.id===id);
    if(!t || t.done) return;
    t.done = true;
    t.completedAt = new Date().toISOString();  // <-- record completion time
    STATE.meta.completedCount++;
    const xp = computeTaskXP(t);
    addPower(xp);
    addActivity(`Completed: ${t.title}`, xp, "task_completed");
    unlockCharacterMaybe(t.category, xp);
    toast(`⚡ <strong>Completed</strong>: ${escapeHTML(t.title)} <span class="muted">(+${xp} XP)</span>`);
    save();
    renderCharacters(); renderBoss(); renderCalendar(); renderSummary();
  }
  function deleteTask(id){ STATE.tasks = STATE.tasks.filter(x=>x.id!==id); save(); }

  // ---------- Add Dialog ----------
  let selectedAddCategory = CATEGORIES[0];
  function setupAddDialog(){
    const dlg = document.getElementById("add-dialog");
    const openBtn = document.getElementById("fab-add");
    if(!dlg || !openBtn) return;

    const cancelBtn = document.getElementById("add-cancel");
    const confirmBtn = document.getElementById("add-confirm");
    const pills = document.getElementById("a-category-pills");
    const prev = document.getElementById("a-character-preview");

    if(pills) {
      pills.innerHTML = CATEGORIES.map((c,i)=>`<button type="button" class="chip" data-cat="${c}" aria-pressed="${i===0}">${c}</button>`).join("");
      const updatePreview = ()=>{
        const character = SESSION_CHAR[selectedAddCategory];
        const img = character?.image || defaultPortraitForCategory(selectedAddCategory);
        if(prev) prev.innerHTML =
          `<img src="${img}" alt="${selectedAddCategory} preview" style="max-width:100%;max-height:110px;border-radius:10px"
                 onerror="this.src='${defaultPortraitForCategory(selectedAddCategory)}';" />`;
      };
      pills.querySelectorAll(".chip").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          pills.querySelectorAll(".chip").forEach(b=>b.setAttribute("aria-pressed","false"));
          btn.setAttribute("aria-pressed","true");
          selectedAddCategory = btn.dataset.cat;
          updatePreview();
        });
      });
      if(prev) prev.innerHTML = `<div class="muted">Character preview will appear here</div>`;
      openBtn.addEventListener("click", ()=> { dlg.showModal(); selectedAddCategory=CATEGORIES[0]; updatePreview(); });
    }

    if(cancelBtn) cancelBtn.addEventListener("click", ()=> dlg.close());
    const clearBtn = document.getElementById("add-clear");
    if(clearBtn) clearBtn.addEventListener("click", ()=> document.getElementById("add-form").reset());

    if(confirmBtn){
      confirmBtn.addEventListener("click", (e)=>{
        e.preventDefault();
        const title = document.getElementById("a-title").value.trim();
        if(!title){ document.getElementById("a-title").reportValidity(); return; }
        const t = {
          id: uid(),
          title,
          category: selectedAddCategory,
          priority: document.getElementById("a-priority").value,
          type: document.getElementById("a-type").value,
          start: document.getElementById("a-start").value || null,
          end: document.getElementById("a-end").value || null,
          estimate: Number(document.getElementById("a-est").value || 0),
          repeat: Number(document.getElementById("a-repeat").value || 0) || null,
          notes: document.getElementById("a-notes").value.trim(),
          due: (document.getElementById("a-end").value || document.getElementById("a-start").value || null),
          done:false, createdAt: new Date().toISOString()
        };
        STATE.tasks.push(t); save();
        dlg.close();
        toast(`<strong class="cyan">Task added</strong>: ${escapeHTML(t.title)}`);
        renderTasks(); renderCalendar(); renderSummary();
      });
    }
  }

  // ---------- Calendar ----------
  function setupCalendar(){
    const prev = document.getElementById("cal-prev");
    const next = document.getElementById("cal-next");
    const today = document.getElementById("cal-today");
    const gen = document.getElementById("cal-generate");
    if(prev) prev.addEventListener("click", ()=> shiftMonth(-1));
    if(next) next.addEventListener("click", ()=> shiftMonth(1));
    if(today) today.addEventListener("click", ()=>{ STATE.calendarCursor = todayStr().slice(0,7); save(); renderCalendar(); });
    if(gen) gen.addEventListener("click", ()=>{ generateRecurring(); renderCalendar(); });
  }
  function ensureCalendarCSS(){
    if (document.getElementById("cal-dot-style")) return;
    const css = `
    #calendar-grid { display:grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 12px; }
    #calendar-grid .day{ position:relative; height: 96px; border-radius:14px; background: rgba(255,255,255,.04);
      border: 1px solid rgba(255,255,255,.06); padding: 8px 10px 10px; overflow:hidden; }
    #calendar-grid .day[aria-disabled="true"]{ visibility:hidden; }
    #calendar-grid .d-num{ position:absolute; top:8px; left:10px; font: 600 12px/1 system-ui, ui-sans-serif, -apple-system, Segoe UI, Roboto, Arial;
      color:#8ea3c7; letter-spacing:.4px; opacity:.9; }
    #calendar-grid .today .d-num{ color:#ffffff; text-shadow:0 0 10px rgba(111,210,255,.9); }
    #calendar-grid .cal-dots{ position:absolute; left:8px; right:8px; bottom:8px; display:grid; grid-template-columns: repeat(8, 1fr); gap: 6px; }
    #calendar-grid .cal-dot{ width:10px; height:10px; border-radius:50%;
      filter: drop-shadow(0 0 4px currentColor) drop-shadow(0 0 8px currentColor); opacity:.95; }
    #calendar-grid .cal-over{ font-weight:600; font-size:10px; color:#c7d7ff; opacity:.8; text-align:right; align-self:center; }
    @media (max-width: 480px){ #calendar-grid { gap: 10px; } #calendar-grid .day{ height: 82px; }
      #calendar-grid .cal-dots{ grid-template-columns: repeat(7, 1fr); gap:5px; } }`;
    const style = document.createElement("style");
    style.id = "cal-dot-style";
    style.textContent = css;
    document.head.appendChild(style);
  }
  function shiftMonth(delta){
    const [y,m] = STATE.calendarCursor.split("-").map(n=>Number(n));
    const d = new Date(y, m-1 + delta, 1);
    STATE.calendarCursor = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    save(); renderCalendar();
  }
  function renderCalendar(){
    ensureCalendarCSS();
    const grid = document.getElementById("calendar-grid");
    const title = document.getElementById("cal-title");
    if(!grid || !title) return;

    const [y,m] = STATE.calendarCursor.split("-").map(n=>Number(n));
    const first = new Date(y,m-1,1);
    title.textContent = first.toLocaleString(undefined,{month:"long", year:"numeric"});

    const startDay = (first.getDay()+6)%7; // Mon=0
    const daysInMonth = new Date(y, m, 0).getDate();

    const todayISO = todayStr();
    const cells = [];
    for(let i=0;i<startDay;i++) cells.push({blank:true});
    for(let d=1; d<=daysInMonth; d++){
      const iso = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const dayTasks = STATE.tasks.filter(t=>t.due===iso);
      cells.push({date: iso, tasks: dayTasks, isToday: iso===todayISO});
    }

    grid.innerHTML = cells.map(c=>{
      if(c.blank) return `<div class="day" aria-disabled="true"></div>`;
      const MAX_DOTS = 14;
      const dots = [];
      const tt = [];
      const tasks = c.tasks.slice(0, MAX_DOTS);
      for(const t of tasks){
        const color = PRIORITY_COLORS[t.priority] || "#7dd3ff";
        dots.push(`<span class="cal-dot" style="color:${color};background:${color}" title="${escapeHTML(t.title)}"></span>`);
        tt.push(`${t.priority} · ${t.title}`);
      }
      const overflow = c.tasks.length - MAX_DOTS;
      return `<button class="day ${c.isToday?'today':''}" data-date="${c.date}"
                aria-label="${c.date} has ${c.tasks.length} task(s)"
                title="${c.tasks.length?tt.join('\n'):'No tasks'}">
        <span class="d-num">${c.date.slice(-2)}</span>
        <div class="cal-dots">
          ${dots.join("")}
          ${overflow>0 ? `<span class="cal-over" title="+${overflow} more">+${overflow}</span>` : ""}
        </div>
      </button>`;
    }).join("");

    grid.querySelectorAll(".day[data-date]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const date = btn.dataset.date;
        const list = STATE.tasks.filter(t=>t.due===date);
        if(list.length===0){ openLightbox(`<div class="muted">No tasks on ${date}</div>`); return; }
        const html = `<h3>${date} · Tasks</h3>` + list.map(renderTaskCard).join("");
        openLightbox(html);
        const box = document.getElementById("lightbox");
        if(!box) return;
        box.querySelectorAll(".task .btn-done").forEach(b=>{
          b.addEventListener("click", ()=>{
            const id = b.closest(".task").dataset.id;
            completeTask(id);
            setTimeout(()=>{ renderCalendar(); renderTasks(); }, 50);
          });
        });
        box.querySelectorAll(".task .btn-del").forEach(b=>{
          b.addEventListener("click", ()=>{
            const id = b.closest(".task").dataset.id;
            if(confirm("Delete this task?")){ deleteTask(id); renderCalendar(); renderTasks(); }
          });
        });
      });
    });
  }
  function generateRecurring(){
    const horizon = new Date(); horizon.setDate(horizon.getDate()+60);
    const futureIso = horizon.toISOString().slice(0,10);
    const repeats = STATE.tasks.filter(t=>t.type==="repeat" && t.repeat && t.start);
    let created = 0;
    for(const base of repeats){
      const start = new Date(base.start+"T00:00:00");
      for(let d = new Date(start); d <= horizon; d.setDate(d.getDate()+base.repeat)){
        const iso = d.toISOString().slice(0,10);
        if(iso < todayStr() || iso > futureIso) continue;
        const already = STATE.tasks.some(t=>t.title===base.title && t.due===iso);
        if(!already){
          STATE.tasks.push({...base, id: uid(), due: iso, done:false, createdAt:new Date().toISOString()});
          created++;
        }
      }
    }
    save();
    toast(created ? `Generated <strong>${created}</strong> task(s)` : `No new recurring tasks found`);
  }

  // ---------- Characters ----------
  function unlockCharacterMaybe(category, xpGained){
    if(!STATE.characters[category]){
      const pick = SESSION_CHAR[category] || {
        name:`${category} Ally`, image: defaultPortraitForCategory(category), rarity:"R", category
      };
      STATE.characters[category] = {
        name: pick.name, rarity: pick.rarity, category, level:1, bond: 0,
        xp: 0, xpToNext: 100, image: pick.image
      };
      addActivity(`Found ${pick.name}`, 0, "character_found");
      toast(`🎉 <strong>Unlocked</strong>: ${pick.name} (<span class="pink">${pick.rarity}</span>)`);
    }
    const ch = STATE.characters[category];
    if(ch){
      ch.xp += Math.floor(xpGained*0.6);
      ch.bond = clamp(ch.bond + Math.floor(xpGained*0.2), 0, 100);
      while(ch.xp >= ch.xpToNext){
        ch.xp -= ch.xpToNext; ch.level++; ch.xpToNext = Math.round(ch.xpToNext*1.25);
        toast(`⬆️ <strong>${ch.name}</strong> reached <span class="yellow">Lv.${ch.level}</span>`);
      }
      save();
    }
  }
  function renderCharacters(){
    ensureLockedCharCSS();
    const grid = document.getElementById("chars-grid");
    const empty = document.getElementById("chars-empty");
    if(!grid) return;

    // Always show one card per category (locked or unlocked)
    const items = CATEGORIES.map(cat => {
      if (isUnlocked(cat)) {
        const ch = STATE.characters[cat];
        const imagePath = ch.image || defaultPortraitForCategory(cat);
        return `<div class="char-card">
          <div class="char-portrait">
            <img alt="${escapeHTML(ch.name)} portrait" src="${imagePath}"
                 onerror="this.src='${defaultPortraitForCategory(cat)}';">
          </div>
          <div class="char-body">
            <div class="flex" style="justify-content:space-between">
              <div><strong>${escapeHTML(ch.name)}</strong> <span class="muted">(${ch.rarity})</span></div>
              <div class="muted">${cat}</div>
            </div>
            <div>Level: <strong>${ch.level}</strong> · Bond: <strong>${ch.bond}%</strong></div>
            <div class="progress" aria-label="XP"><div style="width:${Math.round(ch.xp/ch.xpToNext*100)}%"></div></div>
            <div class="flex">
              <button class="btn" data-chat="${cat}">Chat</button>
              <button class="btn" data-train="${cat}">Train</button>
              <button class="btn" data-gift="${cat}">Gift</button>
            </div>
          </div>
        </div>`;
      } else {
        const imagePath = placeholderPortraitForCategory(cat);
        return `<div class="char-card locked" data-locked="${cat}">
          <div class="char-portrait">
            <img alt="${cat} locked placeholder" src="${imagePath}">
            <div class="lock-overlay">Complete a ${cat} task to unlock</div>
          </div>
          <div class="char-body">
            <div class="flex" style="justify-content:space-between">
              <div><strong>${cat} Ally</strong> <span class="muted">(Locked)</span></div>
              <div class="muted">${cat}</div>
            </div>
            <div class="muted">No XP yet. Earn XP by completing ${cat} tasks.</div>
            <div class="progress" aria-label="XP"><div style="width:0%"></div></div>
            <div class="flex">
              <button class="btn" disabled>Chat</button>
              <button class="btn" disabled>Train</button>
              <button class="btn" disabled>Gift</button>
            </div>
          </div>
        </div>`;
      }
    });

    grid.innerHTML = items.join("");
    if(empty) empty.style.display = "none";
    // Wire actions
    grid.querySelectorAll("[data-chat]").forEach(b=> b.addEventListener("click", ()=>{
      const cat = b.getAttribute("data-chat");
      const ch = STATE.characters[cat];
      const lines = [
        `"Stay sharp. Every checkbox is a blade."`,
        `"Neon nights favor the disciplined."`,
        `"Your grind fuels our power core."`,
        `"Focus fire: one task at a time."`
      ];
      openLightbox(`<h3>${escapeHTML(ch.name)} · Chat</h3><p class="muted">${lines[Math.floor(Math.random()*lines.length)]}</p>`);
    }));
    grid.querySelectorAll("[data-train]").forEach(b=> b.addEventListener("click", ()=>{
      const cat = b.getAttribute("data-train"); const ch = STATE.characters[cat];
      ch.xp += 20; toast(`🏋️ Trained <strong>${escapeHTML(ch.name)}</strong> (+20 XP)`);
      while(ch.xp >= ch.xpToNext){ ch.xp -= ch.xpToNext; ch.level++; ch.xpToNext=Math.round(ch.xpToNext*1.25); toast(`⬆️ ${escapeHTML(ch.name)} Lv.${ch.level}`); }
      save(); renderCharacters();
    }));
    grid.querySelectorAll("[data-gift]").forEach(b=> b.addEventListener("click", ()=>{
      const cat = b.getAttribute("data-gift"); const ch = STATE.characters[cat];
      ch.bond = clamp(ch.bond + 5, 0, 100);
      toast(`🎁 Bond with <strong>${escapeHTML(ch.name)}</strong> +5`);
      save(); renderCharacters();
    }));
  }

  // ---------- Boss ----------
  function renderBoss(){
    const targetEl = document.getElementById("boss-target");
    const metaEl = document.getElementById("boss-meta");
    const chanceEl = document.getElementById("boss-chance");
    const inner = document.getElementById("party-inner");
    const perc = document.getElementById("party-perc");
    const power = STATE.power % STATE.config.bossTarget;
    const pct = clamp(Math.round(power / STATE.config.bossTarget * 100), 0, 100);
    if(targetEl) targetEl.textContent = STATE.config.bossTarget;
    if(metaEl) metaEl.textContent = `Power ${power} / ${STATE.config.bossTarget}`;
    if(chanceEl) chanceEl.textContent = `${Math.min(99, Math.max(1, Math.round(pct*0.9)))}%`;
    if(inner) inner.style.width = `${pct}%`;
    if(perc) perc.textContent = `${pct}%`;

    const btn = document.getElementById("btn-simulate");
    const res = document.getElementById("boss-result");
    if(btn && res){
      btn.onclick = ()=>{
        const rng = Math.random()*100;
        const winChance = Math.min(99, Math.max(1, Math.round(pct*0.9)));
        const win = rng < winChance;
        if(win){
          addActivity("Defeated the monthly boss!", 0, "boss_win");
          toast("🧨 <strong>Boss defeated!</strong>");
          res.innerHTML = `<div class="green">Victory! Your team crushed the boss.</div>`;
        }else{
          addActivity("Lost to the monthly boss…", 0, "boss_loss");
          res.innerHTML = `<div class="muted">Close! Train up and try again.</div>`;
        }
        renderSummary();
      };
    }

    // activity breakdown
    const list = document.getElementById("activity-list");
    if(list){
      const byKind = {};
      for(const a of STATE.activity){ byKind[a.kind] = (byKind[a.kind]||0)+1; }
      list.innerHTML = Object.entries(byKind).map(([k,v])=>`<div>${k}: <strong>${v}</strong></div>`).join("") || `<div class="muted">No activity yet.</div>`;
    }
  }

  // ---------- Config (plus import/export wiring) ----------
  // Replace your existing import/export functions in app.js with these comprehensive versions

// ---------- FULL BACKUP EXPORT ----------
function exportFullBackup(){
  // Create a complete snapshot of the current state
  const fullBackup = {
    version: "neon-tasks-full-backup/v1",
    exportedAt: new Date().toISOString(),
    appVersion: "0.11",
    data: {
      // Core app data
      tasks: STATE.tasks || [],
      characters: STATE.characters || {},
      config: STATE.config || deepClone(DEFAULT_CONFIG),
      power: STATE.power || 0,
      calendarCursor: STATE.calendarCursor || todayStr().slice(0,7),
      seedVersion: STATE.seedVersion || 0,
      meta: STATE.meta || { installedAt: Date.now(), completedCount: 0 },
      activity: STATE.activity || [],
      
      // Additional metadata for verification
      exportMeta: {
        totalTasks: STATE.tasks?.length || 0,
        completedTasks: STATE.tasks?.filter(t => t.done)?.length || 0,
        unlockedCharacters: Object.keys(STATE.characters || {}).length,
        totalPower: STATE.power || 0,
        lastActivity: STATE.activity?.[0]?.when || null
      }
    }
  };

  // Create and download the backup file
  const blob = new Blob([JSON.stringify(fullBackup, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const timestamp = new Date().toISOString().slice(0,16).replace(/[:T]/g, '-');
  a.href = url;
  a.download = `neontasks-backup-${timestamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  
  const stats = fullBackup.data.exportMeta;
  toast(`📤 <strong>Full backup exported</strong><br>
    ${stats.totalTasks} tasks, ${stats.unlockedCharacters} characters, ${stats.totalPower} power`);
  
  console.log("Full backup exported:", fullBackup);
}

// ---------- FULL BACKUP IMPORT ----------
function importFullBackup(backupData){
  try {
    // Validate the backup format
    if (!backupData || typeof backupData !== 'object') {
      throw new Error("Invalid backup format - not a valid object");
    }
    
    if (!backupData.version || !backupData.version.includes('neon-tasks')) {
      throw new Error("Invalid backup format - missing or incorrect version");
    }
    
    if (!backupData.data) {
      throw new Error("Invalid backup format - no data section found");
    }
    
    const data = backupData.data;
    let importStats = {
      tasks: 0,
      characters: 0,
      power: 0,
      activities: 0,
      errors: []
    };
    
    console.log("Starting full backup import...");
    console.log("Backup data:", backupData);
    
    // Create a new state object with imported data
    const newState = {};
    
    // Import tasks
    if (Array.isArray(data.tasks)) {
      newState.tasks = data.tasks.map(task => ({
        id: task.id || uid(),
        title: task.title || "Imported Task",
        category: CATEGORIES.includes(task.category) ? task.category : "Other",
        priority: ["Low","Medium","High"].includes(task.priority) ? task.priority : "Medium",
        type: task.type || "oneoff",
        start: task.start || null,
        end: task.end || null,
        estimate: Number(task.estimate) || 0,
        repeat: task.repeat || null,
        notes: task.notes || "",
        due: task.due || null,
        done: Boolean(task.done),
        createdAt: task.createdAt || new Date().toISOString(),
        completedAt: task.completedAt || null
      }));
      importStats.tasks = newState.tasks.length;
    } else {
      newState.tasks = [];
      importStats.errors.push("No valid tasks found in backup");
    }
    
    // Import characters
    if (data.characters && typeof data.characters === 'object') {
      newState.characters = {};
      for (const [category, charData] of Object.entries(data.characters)) {
        if (CATEGORIES.includes(category) && charData) {
          newState.characters[category] = {
            name: charData.name || `${category} Ally`,
            rarity: charData.rarity || "R",
            category: category,
            level: Math.max(1, Number(charData.level) || 1),
            bond: Math.max(0, Math.min(100, Number(charData.bond) || 0)),
            xp: Math.max(0, Number(charData.xp) || 0),
            xpToNext: Math.max(100, Number(charData.xpToNext) || 100),
            image: charData.image || defaultPortraitForCategory(category)
          };
          importStats.characters++;
        }
      }
    } else {
      newState.characters = {};
      importStats.errors.push("No valid characters found in backup");
    }
    
    // Import config
    if (data.config && typeof data.config === 'object') {
      newState.config = {
        xpPreset: data.config.xpPreset || "Default",
        scale: data.config.scale || "Linear",
        bossTarget: Math.max(10, Number(data.config.bossTarget) || 300),
        weights: {
          priority: {
            Low: Number(data.config.weights?.priority?.Low) || 1,
            Medium: Number(data.config.weights?.priority?.Medium) || 2,
            High: Number(data.config.weights?.priority?.High) || 3
          },
          estHour: Number(data.config.weights?.estHour) || 1,
          streak: Number(data.config.weights?.streak) || 0.5
        }
      };
    } else {
      newState.config = deepClone(DEFAULT_CONFIG);
      importStats.errors.push("No valid config found, using defaults");
    }
    
    // Import power
    newState.power = Math.max(0, Number(data.power) || 0);
    importStats.power = newState.power;
    
    // Import calendar cursor
    newState.calendarCursor = data.calendarCursor || todayStr().slice(0,7);
    
    // Import seed version
    newState.seedVersion = Number(data.seedVersion) || 0;
    
    // Import meta
    if (data.meta && typeof data.meta === 'object') {
      newState.meta = {
        installedAt: data.meta.installedAt || Date.now(),
        completedCount: Math.max(0, Number(data.meta.completedCount) || 0)
      };
    } else {
      newState.meta = { installedAt: Date.now(), completedCount: 0 };
      importStats.errors.push("No valid meta found, using defaults");
    }
    
    // Import activity
    if (Array.isArray(data.activity)) {
      newState.activity = data.activity.map(act => ({
        when: act.when || new Date().toISOString(),
        title: act.title || "Imported Activity",
        xp: Number(act.xp) || 0,
        kind: act.kind || "generic"
      })).slice(0, 100); // Keep only last 100 activities
      importStats.activities = newState.activity.length;
    } else {
      newState.activity = [];
      importStats.errors.push("No valid activity found");
    }
    
    // Apply the new state
    Object.assign(STATE, newState);
    ACTIVITY = STATE.activity;
    
    // Save to localStorage
    save();
    
    // Re-render everything
    renderAll();
    
    // Show success toast
    const errorText = importStats.errors.length > 0 ? 
      ` (${importStats.errors.length} warnings)` : "";
    
    toast(`📥 <strong>Full backup imported${errorText}</strong><br>
      ${importStats.tasks} tasks, ${importStats.characters} characters, ${importStats.power} power`);
    
    console.log("Import completed successfully:", importStats);
    
    // Log any errors/warnings
    if (importStats.errors.length > 0) {
      console.warn("Import warnings:", importStats.errors);
    }
    
    return importStats;
    
  } catch (error) {
    console.error("Full backup import failed:", error);
    toast(`<span class="danger">Import failed: ${error.message}</span>`);
    throw error;
  }
}

// ---------- LEGACY IMPORT (for completed tasks only) ----------
function importCompletedTasksFromJSON(payload){
  // Keep this for backward compatibility with old exports
  const items = Array.isArray(payload) ? payload : (Array.isArray(payload?.items) ? payload.items : []);
  let added = 0;

  const has = new Set(
    STATE.tasks.filter(t=>t.done).map(t => `${t.title}__${t.completedAt || t.createdAt || ""}`)
  );

  for(const r of items){
    const title = String(r.title || "").trim();
    if(!title) continue;
    const completedAt = r.completedAt || r.completed_at || null;
    const key = `${title}__${completedAt || ""}`;
    if(has.has(key)) continue;

    const t = {
      id: uid(),
      title,
      category: CATEGORIES.includes(r.category) ? r.category : "Other",
      priority: ["Low","Medium","High"].includes(r.priority) ? r.priority : "Low",
      type: r.type || "oneoff",
      estimate: Number(r.estimate || 0),
      notes: String(r.notes || ""),
      start: null,
      end: null,
      repeat: null,
      due: r.due || null,
      done: true,
      createdAt: r.createdAt || completedAt || new Date().toISOString(),
      completedAt: completedAt || new Date().toISOString()
    };
    STATE.tasks.push(t);
    has.add(key);
    added++;
  }
  save();
  return added;
}

// ---------- UPDATED CONFIG SETUP ----------
function setupConfig(){
  const preset = document.getElementById("xp-preset");
  const scale = document.getElementById("xp-scale");
  const target = document.getElementById("boss-target-input");
  const apply = document.getElementById("apply-target");
  
  if(preset){ 
    preset.value = STATE.config.xpPreset; 
    preset.addEventListener("change", ()=>{
      STATE.config.xpPreset = preset.value;
      if(preset.value === "Aggressive"){
        STATE.config.weights.priority = { Low:1, Medium:3, High:5 };
        STATE.config.weights.estHour = 2;
      }else if(preset.value === "Gentle"){
        STATE.config.weights.priority = { Low:1, Medium:2, High:2 };
        STATE.config.weights.estHour = 0.5;
      }else{
        STATE.config.weights.priority = deepClone(DEFAULT_CONFIG.weights.priority);
        STATE.config.weights.estHour = 1;
      }
      save();
    });
  }
  
  if(scale){ 
    scale.value = STATE.config.scale; 
    scale.addEventListener("change", ()=>{ STATE.config.scale = scale.value; save(); }); 
  }
  
  if(target){ target.value = STATE.config.bossTarget; }
  
  if(apply){ 
    apply.addEventListener("click", ()=>{ 
      const v = Number(target.value||0); 
      if(v>=10){ 
        STATE.config.bossTarget = v; 
        save(); 
        renderHeaderPower(); 
        renderBoss(); 
        toast("Applied boss target"); 
      } 
    }); 
  }

  // Updated Import/Export buttons - FULL BACKUP
  const exportBtn = document.getElementById("export-completed");
  const importBtn = document.getElementById("import-completed");
  const importFile = document.getElementById("import-completed-file");
  
  if(exportBtn) {
    // Update button text and function
    exportBtn.textContent = "Export Full Backup";
    exportBtn.addEventListener("click", exportFullBackup);
  }
  
  if(importBtn && importFile){
    // Update button text
    importBtn.textContent = "Import Full Backup";
    
    importBtn.addEventListener("click", ()=> importFile.click());
    importFile.addEventListener("change", async ()=>{
      const file = importFile.files?.[0];
      if(!file) return;
      
      // Show confirmation dialog for full import
      const confirmed = confirm(
        "⚠️ FULL BACKUP IMPORT ⚠️\n\n" +
        "This will COMPLETELY REPLACE all your current data including:\n" +
        "• All tasks (completed and pending)\n" +
        "• All unlocked characters and their levels\n" +
        "• All power and XP\n" +
        "• All settings and configuration\n" +
        "• All activity history\n\n" +
        "Are you sure you want to proceed?\n\n" +
        "(Consider exporting your current data first as a backup)"
      );
      
      if (!confirmed) {
        importFile.value = "";
        return;
      }
      
      try{
        const text = await file.text();
        const parsed = JSON.parse(text);
        
        // Check if it's a full backup or legacy format
        if (parsed.version && parsed.version.includes('neon-tasks-full-backup')) {
          // Full backup import
          const stats = importFullBackup(parsed);
          toast(`📥 <strong>Full backup imported successfully!</strong>`);
        } else if (parsed.version && parsed.version.includes('neon-tasks/v1')) {
          // Legacy completed tasks import
          const added = importCompletedTasksFromJSON(parsed);
          toast(`📥 Imported <strong>${added}</strong> completed task(s) (legacy format)`);
        } else if (Array.isArray(parsed)) {
          // Raw array of tasks
          const added = importCompletedTasksFromJSON(parsed);
          toast(`📥 Imported <strong>${added}</strong> completed task(s)`);
        } else {
          throw new Error("Unrecognized backup format");
        }
        
        renderAll();
      }catch(e){
        console.error("Import error:", e);
        toast(`<span class="danger">Import failed: ${e.message}</span>`);
      }finally{
        importFile.value = "";
      }
    });
  }
}
  // ---------- Reset / Seed ----------
  function setupReset(){
    const dlg = document.getElementById("confirm-reset");
    const open = document.getElementById("reset-all");
    const yes = document.getElementById("reset-confirm-btn");
    const no = document.getElementById("reset-cancel-btn");
    const seed = document.getElementById("seed-demo");
    if(open){ open.addEventListener("click", ()=> dlg?.showModal()); }
    if(no){ no.addEventListener("click", ()=> dlg?.close()); }
    if(yes){ yes.addEventListener("click", ()=>{ localStorage.removeItem(LS_KEY); location.reload(); }); }
    if(seed){ seed.addEventListener("click", ()=>{ seedDemo(); toast("Seeded demo data"); renderAll(); }); }
  }
  function seedDemo(){
    if(STATE.seedVersion >= 1) return;
    const now = new Date();
    const iso = (d)=> d.toISOString().slice(0,10);
    const t1 = new Date(now); t1.setDate(now.getDate()+0);
    const t2 = new Date(now); t2.setDate(now.getDate()+1);
    const t3 = new Date(now); t3.setDate(now.getDate()+2);
    STATE.tasks.push(
      { id:uid(), title:"Daily stretch", category:"Fitness", priority:"Low", type:"repeat", start:iso(now), end:null, estimate:1, repeat:1, notes:"5 min", due:iso(t1), done:false, createdAt:new Date().toISOString() },
      { id:uid(), title:"Clean apartment", category:"Home", priority:"Medium", type:"oneoff", start:null, end:null, estimate:2, repeat:null, notes:"bathroom focus", due:iso(t2), done:false, createdAt:new Date().toISOString() },
      { id:uid(), title:"Budget review", category:"Finance", priority:"High", type:"oneoff", start:null, end:null, estimate:1, repeat:null, notes:"YNAB sync", due:iso(t3), done:false, createdAt:new Date().toISOString() }
    );
    addActivity("Found Aki — The Crimson Striker", 0, "character_found");
    addActivity("Completed: Daily stretch", 7, "task_completed");
    addActivity("Found Cinderjaw — The Blue‑Flame Outlaw", 0, "character_found");
    STATE.seedVersion = 1;
    save();
  }
// Additional debugging function you can call from console
function debugCharacters() {
  console.log("Current CHAR_POOL:", CHAR_POOL);
  console.log("Current SESSION_CHAR:", SESSION_CHAR);
  console.log("Categories:", CATEGORIES);
  console.log("CSV mapping:", CSV_TO_APP_CATEGORY);
}

// Make it globally accessible for debugging
window.debugCharacters = debugCharacters;

   // Debug override - add this temporarily
window.debugCharacters = function() {
  console.log("CHAR_POOL:", CHAR_POOL);
  console.log("SESSION_CHAR:", SESSION_CHAR);
  console.log("State characters:", STATE.characters);
};
   
})();
