/* NEON/TASKS v0.12 — Character-focused progression (Debug Version) */

(() => {
  "use strict";

  // ---------- Constants ----------
  const LS_KEY = "neon_tasks_v07";
  const CATEGORIES = ["Fitness","Home","Finance","Work","Rose","Skills","Other"];
  const PRIORITY_COLORS = { Low: "#00fff0", Medium: "#ffe066", High: "#ff355e" };
  const DEFAULT_CONFIG = {
    xpPreset: "Default",
    scale: "Linear",
    characterUnlockThreshold: 50,
    tierThresholds: { A: 100, B: 250, C: 500 },
    weights: { priority: { Low:1, Medium:2, High:3 }, estHour: 1, streak: 0.5 }
  };

  // Character tier labels
  const TIER_LABELS = { A: "Tier A", B: "Tier B", C: "Tier C" };

  // ---------- State ----------
  let SESSION_CHAR = {};
  let CHAR_POOL = {};
  let ACTIVITY = [];
  const STATE = loadState();

  // Add debug logging
  console.log("🚀 NEON/TASKS Debug Version Loading...");
  console.log("📊 Initial STATE:", STATE);

  document.addEventListener("DOMContentLoaded", init);

  function loadState() {
    console.log("📂 Loading state from localStorage...");
    let s;
    try { 
      s = JSON.parse(localStorage.getItem(LS_KEY) || "{}"); 
      console.log("✅ State loaded successfully");
    } catch { 
      s = {}; 
      console.log("⚠️ Failed to load state, using defaults");
    }
    
    return {
      tasks: s.tasks || [],
      characters: s.characters || {},
      config: s.config || deepClone(DEFAULT_CONFIG),
      calendarCursor: s.calendarCursor || todayStr().slice(0,7),
      seedVersion: s.seedVersion || 0,
      meta: s.meta || { installedAt: Date.now(), completedCount: 0 },
      activity: s.activity || [],
      categoryXP: s.categoryXP || {}
    };
  }
  
  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(STATE));
      console.log("💾 State saved successfully");
    } catch (e) {
      console.error("❌ Failed to save state:", e);
    }
  }
  
  ACTIVITY = STATE.activity || [];

  // ---------- Utilities ----------
  function deepClone(o){ return JSON.parse(JSON.stringify(o)); }
  function uid(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }
  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
  function todayStr(){ return new Date().toISOString().slice(0,10); }
  function fmtDate(iso){ 
    if(!iso) return "—"; 
    const d = new Date(iso+"T00:00:00"); 
    return d.toLocaleDateString(undefined,{month:"short", day:"numeric"}); 
  }
  function escapeHTML(s){ 
    return (s||"").replace(/[&<>"']/g, m=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); 
  }

  function isUnlocked(cat){ return !!STATE.characters[cat]; }
  function getCategoryXP(cat) { return STATE.categoryXP[cat] || 0; }

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

  // ---------- Default Character Generator ----------
  function generateDefaultCharacters() {
    console.log("🎭 Generating default characters...");
    const pool = {};
    
    // Color scheme for each category
    const categoryColors = {
      Fitness: "#23ffd9", Home: "#a26bff", Finance: "#ffe066",
      Work: "#ff33cc", Rose: "#ff6ad5", Skills: "#66ccff", Other: "#66ff99"
    };
    
    for(const cat of CATEGORIES){
      const color = categoryColors[cat] || "#6bf";
      pool[cat] = [1,2,3].map(n=>({
        category: cat,
        image: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
          <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>
            <defs>
              <linearGradient id='grad${cat}${n}' x1='0%' y1='0%' x2='100%' y2='100%'>
                <stop offset='0%' style='stop-color:${color};stop-opacity:0.8' />
                <stop offset='100%' style='stop-color:#1a1a2e;stop-opacity:1' />
              </linearGradient>
            </defs>
            <rect width='200' height='200' fill='url(#grad${cat}${n})'/>
            <circle cx='100' cy='80' r='25' fill='rgba(255,255,255,0.3)'/>
            <rect x='70' y='110' width='60' height='70' rx='10' fill='rgba(255,255,255,0.2)'/>
            <text x='100' y='170' text-anchor='middle' fill='white' font-size='12' font-family='system-ui'>${cat} #${n}</text>
          </svg>
        `)}`,
        name: `${cat} Operative ${n}`,
        rarity: ["R","SR","SSR"][n-1] || "R",
        lore: {
          A: `The origins of this ${cat} operative remain shrouded in mystery...`,
          B: `Through countless missions, this ally has proven their worth time and again...`,
          C: `At the pinnacle of their abilities, they stand as a legend among operatives...`
        }
      }));
    }
    console.log("✅ Default characters generated:", pool);
    return pool;
  }

  // ---------- Session Picks ----------
  function makeSessionCharacters(pool){
    console.log("🎲 Making session character picks...");
    const chosen = {};
    for(const cat of CATEGORIES){
      const list = pool[cat] || [];
      if(list.length){
        chosen[cat] = list[Math.floor(Math.random() * list.length)];
      } else {
        const color = ["#23ffd9", "#a26bff", "#ffe066", "#ff33cc", "#ff6ad5", "#66ccff", "#66ff99"][CATEGORIES.indexOf(cat)] || "#6bf";
        chosen[cat] = { 
          category: cat, 
          image: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>
              <defs>
                <linearGradient id='grad${cat}' x1='0%' y1='0%' x2='100%' y2='100%'>
                  <stop offset='0%' style='stop-color:${color};stop-opacity:0.6' />
                  <stop offset='100%' style='stop-color:#2a2a2a;stop-opacity:1' />
                </linearGradient>
              </defs>
              <rect width='200' height='200' fill='url(#grad${cat})'/>
              <circle cx='100' cy='80' r='25' fill='rgba(255,255,255,0.2)'/>
              <rect x='70' y='110' width='60' height='70' rx='10' fill='rgba(255,255,255,0.15)'/>
              <text x='100' y='170' text-anchor='middle' fill='white' font-size='14' font-family='system-ui'>${cat}</text>
            </svg>
          `)}`,
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
    console.log("✅ Session characters selected:", chosen);
    return chosen;
  }

  // ---------- App Init ----------
  async function init(){
    console.log("🎬 Initializing app...");
    
    try {
      // Initialize character pool
      CHAR_POOL = generateDefaultCharacters();
      SESSION_CHAR = makeSessionCharacters(CHAR_POOL);

      // Setup category dropdown
      const qCat = document.getElementById("q-category");
      if (qCat) {
        qCat.innerHTML = CATEGORIES.map(c=>`<option>${c}</option>`).join("");
        console.log("✅ Category dropdown initialized");
      }

      // Setup all components
      setupTabs();
      console.log("✅ Tabs setup complete");

      // Render all views
      renderAll();
      console.log("✅ Initial render complete");
      
      // Add demo data if it's a fresh install
      addDemoData();

    } catch (error) {
      console.error("❌ Initialization failed:", error);
      // Show error message to user
      document.body.innerHTML = `
        <div style="padding: 20px; color: white; background: #1a0f0f; text-align: center;">
          <h1>🔧 NEON/TASKS Debug Mode</h1>
          <p>Initialization Error: ${error.message}</p>
          <p>Check console for details</p>
          <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 10px;">Reload</button>
        </div>
      `;
    }
  }

  function renderAll(){
    console.log("🎨 Rendering all views...");
    try {
      renderSummary();
      console.log("✅ Summary rendered");
    } catch (e) {
      console.error("❌ Summary render failed:", e);
    }
  }

  // ---------- Toast System ----------
  function toast(html){
    console.log("📢 Toast:", html);
    const layer = document.getElementById("toast-layer");
    if(!layer) {
      console.warn("⚠️ Toast layer not found");
      return;
    }
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = html;
    layer.appendChild(t);
    setTimeout(()=>{ t.remove(); }, 2300);
  }

  // ---------- Tabs ----------
  function setupTabs(){
    console.log("📋 Setting up tabs...");
    const tabs = document.querySelectorAll(".tabs .tab");
    console.log("Found tabs:", tabs.length);
    
    tabs.forEach((btn, index) => {
      console.log(`Setting up tab ${index}:`, btn.dataset.tab);
      btn.addEventListener("click", ()=>{
        console.log("Tab clicked:", btn.dataset.tab);
        tabs.forEach(b=>b.setAttribute("aria-selected","false"));
        btn.setAttribute("aria-selected","true");
        const id = btn.dataset.tab;
        document.querySelectorAll("main > section").forEach(s=> s.hidden = !s.id.endsWith(id));
        
        // Render specific views
        if(id==="summary") renderSummary();
      });
    });
  }

  // ---------- Summary ----------
  function renderSummary(){
    console.log("📊 Rendering summary...");
    
    const section = document.getElementById("view-summary");
    const grid = document.getElementById("summary-grid");
    
    if(!section || !grid) {
      console.error("❌ Summary elements not found", { section: !!section, grid: !!grid });
      return;
    }

    const cats = CATEGORIES.filter(c => c !== "Other");
    console.log("Rendering categories:", cats);

    try {
      grid.innerHTML = cats.map(cat=>{
        const unlocked = isUnlocked(cat);
        const categoryXP = getCategoryXP(cat);
        
        const portrait = unlocked
          ? (STATE.characters[cat]?.image || SESSION_CHAR[cat]?.image || `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#2a4a7a"/><text x="50" y="55" text-anchor="middle" fill="white" font-size="10">' + cat + '</text></svg>')}`)
          : `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="lock" patternUnits="userSpaceOnUse" width="20" height="20"><rect width="20" height="20" fill="#333"/><rect width="10" height="10" fill="#555"/></pattern></defs><rect width="100" height="100" fill="url(#lock)"/><text x="50" y="35" text-anchor="middle" fill="#999" font-size="8">' + cat + '</text><text x="50" y="65" text-anchor="middle" fill="#666" font-size="12">🔒</text></svg>')}`;
          
        const progressText = unlocked 
          ? `${categoryXP} XP`
          : `${categoryXP}/${STATE.config.characterUnlockThreshold} XP`;
          
        return `
          <button class="tile ${unlocked? "" : "locked"}" data-cat="${cat}" aria-label="${cat} ${unlocked?'portrait':'locked'}">
            <img alt="" src="${portrait}">
            <div class="label">${cat}
              <div class="xp-indicator">${progressText}</div>
            </div>
          </button>`;
      }).join("");

      console.log("✅ Summary grid rendered successfully");

      // Add click handlers
      grid.querySelectorAll(".tile").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          const cat = btn.dataset.cat;
          toast(`Clicked ${cat} - XP: ${getCategoryXP(cat)}`);
        });
      });

      // Add activity section
      addActivitySection(section);

    } catch (error) {
      console.error("❌ Summary render error:", error);
      grid.innerHTML = `<div style="color: red; padding: 20px;">Error rendering summary: ${error.message}</div>`;
    }
  }

  function addActivitySection(section) {
    console.log("📈 Adding activity section...");
    
    let act = document.getElementById("summary-activity");
    if (!act) {
      act = document.createElement("div");
      act.id = "summary-activity";
      act.className = "card";
      section.appendChild(act);
    }
    
    const recent = (STATE.activity || []).slice(0,3);
    console.log("Recent activity:", recent);

    act.innerHTML = `
      <div class="group-head">
        <strong>Recent activity</strong>
        <span class="muted">${recent.length ? "" : "No recent actions yet"}</span>
      </div>
      <div class="activity-list" role="list">
        ${recent.length ? recent.map(e=>{
          const d = new Date(e.when);
          const when = d.toLocaleString(undefined, { month:"short", day:"numeric" });
          return `
            <div class="activity-row" role="listitem">
              <span class="a-icn">•</span>
              <span class="a-text">${escapeHTML(e.title)}</span>
              <time class="a-date">${when}</time>
            </div>`;
        }).join("") : '<div class="muted">Complete some tasks to see activity here!</div>'}
      </div>`;
  }

  // ---------- Quick Test Functions ----------
  window.debugNeonTasks = {
    addTestXP: (category, amount) => {
      if (!STATE.categoryXP[category]) STATE.categoryXP[category] = 0;
      STATE.categoryXP[category] += amount;
      save();
      renderSummary();
      toast(`Added ${amount} XP to ${category}`);
    },
    unlockCharacter: (category) => {
      const char = SESSION_CHAR[category] || { name: `${category} Hero`, rarity: "R", lore: {} };
      STATE.characters[category] = {
        name: char.name,
        rarity: char.rarity,
        category,
        categoryXP: STATE.categoryXP[category] || 0,
        image: char.image,
        lore: char.lore || {},
        unlockedTiers: [],
        lastNotifiedTier: null
      };
      save();
      renderSummary();
      toast(`🎉 Unlocked ${char.name}!`);
    },
    completeTask: (category = "Fitness") => {
      const xp = 25;
      if (!STATE.categoryXP[category]) STATE.categoryXP[category] = 0;
      STATE.categoryXP[category] += xp;
      
      const activity = {
        when: new Date().toISOString(),
        title: `Completed test ${category} task`,
        xp: xp,
        kind: "task_completed"
      };
      STATE.activity.unshift(activity);
      STATE.activity = STATE.activity.slice(0, 100);
      
      // Check for character unlock
      if (!STATE.characters[category] && STATE.categoryXP[category] >= STATE.config.characterUnlockThreshold) {
        this.unlockCharacter(category);
      }
      
      save();
      renderSummary();
      toast(`⚡ Completed ${category} task (+${xp} XP)`);
    },
    showState: () => {
      console.log("Current STATE:", STATE);
      return STATE;
    },
    reset: () => {
      localStorage.removeItem(LS_KEY);
      location.reload();
    }
  };

  // Add some initial demo data
  function addDemoData() {
    if (STATE.activity.length === 0) {
      console.log("🎯 Adding demo data...");
      
      // Add some XP to categories
      STATE.categoryXP.Fitness = 30;
      STATE.categoryXP.Home = 75; // This will unlock a character
      STATE.categoryXP.Work = 20;
      
      // Add some activity
      STATE.activity = [
        { when: new Date().toISOString(), title: "Started using NEON/TASKS", xp: 0, kind: "generic" },
        { when: new Date(Date.now() - 3600000).toISOString(), title: "Completed morning workout", xp: 25, kind: "task_completed" }
      ];
      
      // Unlock Home character since it has 75 XP
      if (STATE.categoryXP.Home >= STATE.config.characterUnlockThreshold) {
        const char = SESSION_CHAR.Home;
        STATE.characters.Home = {
          name: char.name,
          rarity: char.rarity,
          category: "Home",
          categoryXP: STATE.categoryXP.Home,
          image: char.image,
          lore: char.lore,
          unlockedTiers: [],
          lastNotifiedTier: null
        };
      }
      
      save();
      console.log("✅ Demo data added");
    }
  }

  // Initialize immediately
  console.log("🎯 Script loaded, waiting for DOM...");
  
})();
