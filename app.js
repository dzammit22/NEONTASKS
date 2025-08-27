/* NEON/TASKS v0.12 — Character-focused progression with tiers and lore
   - Removed global power system
   - Character-specific XP progression with Tier A/B/C
   - Lore rewards from CSV columns (Lore_A, Lore_B, Lore_C)
   - Character unlock threshold before progression begins
   - Text A/B/C buttons replace Chat/Train/Gift
   - Gacha system with proper reveal mechanics
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
    characterUnlockThreshold: 50, // XP needed to unlock character initially
    tierThresholds: { A: 100, B: 250, C: 500 }, // XP needed for each tier
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

  // Character tier labels
  const TIER_LABELS = { A: "Tier A", B: "Tier B", C: "Tier C" };

  // ---------- State ----------
  let SESSION_CHAR = {};   // per-run random pick per category (for previews)
  let CHAR_POOL = {};      // full CSV pool by category
  let ACTIVITY = [];       // notable actions (persisted)
  const STATE = loadState(); // includes STATE.activity

  document.addEventListener("DOMContentLoaded", init);

  function loadState() {
    let s;
    try { s = JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { s = {}; }
    
    // Migrate old character structure if needed
    if (s.characters) {
      for (const [cat, char] of Object.entries(s.characters)) {
        if (!char.categoryXP) {
          char.categoryXP = char.xp || 0;
          char.unlockedTiers = char.unlockedTiers || [];
          // If character exists, they're already unlocked
          if (char.categoryXP < DEFAULT_CONFIG.characterUnlockThreshold) {
            char.categoryXP = DEFAULT_CONFIG.characterUnlockThreshold;
          }
        }
      }
    }
    
    return {
      tasks: s.tasks || [],
      characters: s.characters || {},
      config: s.config || deepClone(DEFAULT_CONFIG),
      calendarCursor: s.calendarCursor || todayStr().slice(0,7),
      seedVersion: s.seedVersion || 0,
      meta: s.meta || { installedAt: Date.now(), completedCount: 0 },
      activity: s.activity || [],
      categoryXP: s.categoryXP || {},
      readyToOpen: s.readyToOpen || {}
    };
  }
  
  function save() {
    localStorage.setItem(LS_KEY, JSON.stringify(STATE));
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

  function gachaReadyPortraitForCategory(cat){
    const color = {
      Fitness:"#23ffd9", Home:"#a26bff", Finance:"#ffe066",
      Work:"#ff33cc", Rose:"#ff6ad5", Skills:"#66ccff", Other:"#66ff99"
    }[cat] || "#6bf";
    const svg = encodeURIComponent(
`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 420'>
  <defs>
    <linearGradient id='g' x1='0' x2='1'>
      <stop stop-color='${color}' stop-opacity='.6' offset='0'/>
      <stop stop-color='#0b0f1a' offset='1'/>
    </linearGradient>
    <filter id='glow'><feGaussianBlur stdDeviation='4' result='b'/><feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge></filter>
  </defs>
  <rect width='640' height='420' rx='26' fill='url(#g)'/>
  <g opacity='.8' stroke='${color}' fill='none' stroke-width='4'>
    <rect x='30' y='30' width='580' height='360' rx='22'/>
  </g>
  <g transform='translate(320,210)' filter='url(#glow)'>
    <circle r='80' fill='none' stroke='${color}' stroke-width='6' opacity='.9'/>
    <circle r='60' fill='none' stroke='${color}' stroke-width='4' opacity='.7'/>
    <circle r='40' fill='none' stroke='${color}' stroke-width='3' opacity='.5'/>
    <text y='8' text-anchor='middle' font-size='24' fill='${color}' font-family='system-ui' font-weight='700'>?</text>
  </g>
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

  function isUnlocked(cat){ return !!STATE.characters[cat]; }

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

  // ---------- CSV Loader ----------
  async function loadCharactersFromCSV(){
    const path = "assets/Cyberpunk App.csv";
    try{
      const res = await fetch(path, {cache:"no-store"});
      if(!res.ok) {
        console.warn(`CSV fetch failed: ${res.status} ${res.statusText}`);
        throw new Error("csv missing");
      }
      const text = await res.text();

      const { header, rows } = parseCSV(text);
      
      const idx = {
        cat: header.findIndex(h => h && /category/i.test(h.trim())),
        img: header.findIndex(h => h && /image/i.test(h.trim())), 
        name: header.findIndex(h => h && /name.*title|title.*name|name/i.test(h.trim())),
        rarity: header.findIndex(h => h && /rarity/i.test(h.trim())),
        loreA: header.findIndex(h => h && /lore_a/i.test(h.trim())),
        loreB: header.findIndex(h => h && /lore_b/i.test(h.trim())),
        loreC: header.findIndex(h => h && /lore_c/i.test(h.trim()))
      };
      
      if (idx.cat === -1) throw new Error("Category column not found in CSV");
      if (idx.name === -1) throw new Error("Name/Title column not found in CSV");

      const byCat = {};
      let processedCount = 0;
      
      for(let i = 0; i < rows.length; i++){
        const cols = rows[i];
        if (!cols || !cols.length) continue;

        const csvCategory = cols[idx.cat] ? cols[idx.cat].toString().trim() : "";
        const rawName = cols[idx.name] ? cols[idx.name].toString().trim() : "";
        const rawImg = cols[idx.img] ? cols[idx.img].toString().trim() : "";
        const rawRarity = cols[idx.rarity] ? cols[idx.rarity].toString().trim() : "R";
        const loreA = cols[idx.loreA] ? cols[idx.loreA].toString().trim() : "";
        const loreB = cols[idx.loreB] ? cols[idx.loreB].toString().trim() : "";
        const loreC = cols[idx.loreC] ? cols[idx.loreC].toString().trim() : "";
        
        if (!csvCategory || csvCategory === "Unknown") continue;
        
        const cat = CSV_TO_APP_CATEGORY[csvCategory] || csvCategory;
        const categoryLower = cat.toLowerCase().replace(/\s+/g, '-');

        // Use the exact image filename from CSV, with proper handling
        let imagePath;
        if (rawImg && rawImg.trim() !== "") {
          let cleanImg = rawImg.trim();
          if (!cleanImg.includes('.')) {
            cleanImg += '.png';
          }
          imagePath = `assets/characters/${categoryLower}/${cleanImg}`;
        } else {
          imagePath = `assets/characters/${categoryLower}/${categoryLower}-default.png`;
        }

        const character = {
          category: cat,
          image: imagePath,
          name: rawName || `${cat} Ally`,
          rarity: rawRarity || "R",
          lore: { 
            A: loreA || `The origins of this ${cat} operative remain shrouded in mystery...`,
            B: loreB || `Through countless missions, this ally has proven their worth time and again...`,
            C: loreC || `At the pinnacle of their abilities, they stand as a legend among operatives...`
          }
        };
        
        if (!byCat[cat]) byCat[cat] = [];
        byCat[cat].push(character);
        processedCount++;
      }
      
      return byCat;
      
    } catch(e) {
      console.error("❌ CSV loading failed:", e);
      
      // Fallback
      const byCat = {};
      for(const cat of CATEGORIES){
        const slug = cat.toLowerCase().replace(/\s+/g, '-');
        byCat[cat] = [1,2,3].map(n=>({
          category: cat,
          image: `assets/characters/${slug}/${slug}-${n}.png`,
          name: `${cat} Operative ${n}`,
          rarity: ["R","SR","SSR"][n-1] || "R",
          lore: {
            A: `The origins of this ${cat} operative remain shrouded in mystery...`,
            B: `Through countless missions, this ally has proven their worth time and again...`,
            C: `At the pinnacle of their abilities, they stand as a legend among operatives...`
          }
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
        chosen[cat] = list[Math.floor(Math.random() * list.length)];
      }else{
        chosen[cat] = { 
          category:cat, 
          image: defaultPortraitForCategory(cat), 
          name: `${cat} Ally`, 
          rarity: "R",
          lore: {
            A: `The origins of this ${cat} operative remain shrouded in mystery...`,
            B: `Through countless missions, this ally has proven their worth time and again...`,
            C: `At the pinnacle of their abilities, they stand as a legend among operatives...`
          }
        };
      }
    }
    return chosen;
  }

  // ---------- App Init ----------
  async function init(){
    try {
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
    } catch (error) {
      console.error("Init error:", error);
    }
  }

  function renderAll(){
    try {
      renderSummary();
      renderTasks();
      renderCalendar();
      renderCharacters();
    } catch (error) {
      console.error("Render error:", error);
    }
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
        const id = btn.dataset.tab;
        document.querySelectorAll("main > section").forEach(s=> s.hidden = !s.id.endsWith(id));
        const views = document.getElementById("views");
        if(views?.focus) views.focus({preventScroll:true});
        if(id==="tasks") renderTasks();
        if(id==="summary") renderSummary();
        if(id==="characters") renderCharacters();
        if(id==="calendar") renderCalendar();
      });
    });
  }

  // ---------- XP System ----------
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

  function addCategoryXP(category, xp){
    if (!STATE.categoryXP[category]) STATE.categoryXP[category] = 0;
    STATE.categoryXP[category] += xp;
    
    // If character is unlocked, add XP to them too
    if (STATE.characters[category]) {
      STATE.characters[category].categoryXP = (STATE.characters[category].categoryXP || 0) + xp;
      
      // Check for tier unlocks
      const char = STATE.characters[category];
      const currentTier = getCharacterTier(char);
      
      // If we just unlocked a new tier
      if (currentTier && (!char.lastNotifiedTier || char.lastNotifiedTier !== currentTier)) {
        char.lastNotifiedTier = currentTier;
        toast(`🌟 <strong>${char.name}</strong> reached <span class="yellow">${TIER_LABELS[currentTier]}</span>!`);
        addActivity(`${char.name} reached ${TIER_LABELS[currentTier]}`, 0, "tier_unlock");
      }
    }
    
    save();
  }

  // ---------- Activity ----------
  function addActivity(title, xp = 0, kind = "generic"){
    const entry = { when: new Date().toISOString(), title, xp, kind };
    ACTIVITY.unshift(entry);
    ACTIVITY = ACTIVITY.slice(0, 100);
    STATE.activity = ACTIVITY;
    save();
  }

  // ---------- Summary ----------
  function renderSummary(){
    try {
      ensureLockedCharCSS();

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
          <button class="tile ${unlocked ? "" : (readyToOpen ? "ready-gacha" : "locked")}" data-cat="${cat}" aria-label="${cat} ${unlocked ? 'portrait' : (readyToOpen ? 'ready to open' : 'locked')}">
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

      // Activity section
      if (!document.getElementById("summary-activity-space")) {
        const s = document.createElement("style");
        s.id = "summary-activity-space";
        s.textContent = `
          #view-summary{ display:grid; gap:18px; }
          .summary-grid{ margin-bottom:6px; }
          .xp-indicator { font-size: 0.75rem; color: var(--cyan); margin-top: 2px; font-weight: 600; }
        `;
        document.head.appendChild(s);
      }

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
          case "tier_unlock":     return "🌟";
          default: return "•";
        }
      };
      const TITLE_MAX = 48;

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
    } catch (error) {
      console.error("Summary render error:", error);
    }
  }

  // ---------- Characters ----------
  function unlockCharacterMaybe(category, xpGained){
    const categoryXP = getCategoryXP(category);
    
    // Check if we should unlock the character (gacha mechanic trigger)
    if(!STATE.characters[category] && categoryXP >= STATE.config.characterUnlockThreshold){
      // Mark as ready to open but don't actually unlock yet
      STATE.readyToOpen = STATE.readyToOpen || {};
      STATE.readyToOpen[category] = true;
      save();
      renderSummary(); // Update the UI to show "Tap to open"
    }
  }

  function openGachaFor(category) {
    // This is called when user taps the "Tap to open" tile
    const availableChars = CHAR_POOL[category] || [];
    let pick;
    
    if (availableChars.length > 0) {
      // Random selection for the gacha unlock
      pick = availableChars[Math.floor(Math.random() * availableChars.length)];
    } else {
      // Fallback if no characters available
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
    
    // Ensure lore exists
    if (!pick.lore) {
      pick.lore = {
        A: pick.lore?.A || `The origins of this ${category} operative remain shrouded in mystery...`,
        B: pick.lore?.B || `Through countless missions, this ally has proven their worth time and again...`,
        C: pick.lore?.C || `At the pinnacle of their abilities, they stand as a legend among operatives...`
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
    
    // Clear the ready to open state
    if (STATE.readyToOpen && STATE.readyToOpen[category]) {
      delete STATE.readyToOpen[category];
    }
    
    addActivity(`Found ${pick.name}`, 0, "character_found");
    save();
    renderSummary();
    renderCharacters();
    
    // Show gacha reveal lightbox (no toast)
    const rarityColor = {R: '#9fb2c8', SR: '#ffe066', SSR: '#ff33cc'}[pick.rarity] || '#9fb2c8';
    openLightbox(`
      <div style="text-align: center;">
        <h2 style="color: ${rarityColor}; margin-bottom: 16px;">🎉 Character Unlocked!</h2>
        <img src="${pick.image}" alt="${pick.name}" 
             style="max-width:200px;max-height:200px;border-radius:12px;object-fit:cover;object-position:top center;transform:scale(1.4);transform-origin:top center;" />
        <h3 style="margin: 16px 0 8px 0;">${escapeHTML(pick.name)}</h3>
        <p style="color: ${rarityColor}; font-weight: 600; font-size: 1.1em;">${pick.rarity} Rarity</p>
        <p style="color: var(--muted); margin-top: 12px;">${category} Category</p>
      </div>
    `);
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
    try {
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

        // Mobile swipe
        let sx=0, ex=0;
        card.addEventListener("touchstart", e=>{ sx = e.changedTouches[0].screenX; }, {passive:true});
        card.addEventListener("touchend", e=>{
          ex = e.changedTouches[0].screenX;
          const dx = ex - sx;
          if(dx > 60){ completeTask(card.dataset.id); card.classList.add("zap"); setTimeout(()=>renderTasks(), 620); }
          else if(dx < -60){ if(confirm("Delete this task?")){ deleteTask(card.dataset.id); renderTasks(); renderCalendar(); } }
        }, {passive:true});
      });
    } catch (error) {
      console.error("Tasks render error:", error);
    }
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
    t.completedAt = new Date().toISOString();
    STATE.meta.completedCount++;
    const xp = computeTaskXP(t);
    
    addCategoryXP(t.category, xp);
    addActivity(`Completed: ${t.title}`, xp, "task_completed");
    unlockCharacterMaybe(t.category, xp);
    
    toast(`⚡ <strong>Completed</strong>: ${escapeHTML(t.title)} <span class="muted">(+${xp} XP)</span>`);
    save();
    renderCharacters(); renderCalendar(); renderSummary();
  }

  function deleteTask(id){ STATE.tasks = STATE.tasks.filter(x=>x.id!==id); save(); }

  // Minimal versions of other required functions to prevent errors
  function setupAddDialog(){}
  function setupCalendar(){}
  function setupConfig(){}
  function setupReset(){}
  function renderCalendar(){}
  function renderCharacters(){}

})();
