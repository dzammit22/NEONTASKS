function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(STATE));
}

// ---------- Utilities ----------
function uid() { 
  return Math.random().toString(36).slice(2) + Date.now().toString(36); 
}

function todayStr() { 
  return new Date().toISOString().slice(0,10); 
}

function escapeHTML(s) { 
  return (s||"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); 
}

// ---------- Character Portrait Generation ----------
function defaultPortraitForCategory(cat) {
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

function placeholderPortraitForCategory(cat) {
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

function gachaReadyPortraitForCategory(cat) {
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

// ---------- Character System ----------
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

function loadCharacters() {
  CHAR_POOL = {};
  for(const cat of CATEGORIES) {
    CHAR_POOL[cat] = [1,2,3].map(n => ({
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

// ---------- UI Components ----------
function toast(html) {
  const layer = document.getElementById("toast-layer");
  if(!layer) return;
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = html;
  layer.appendChild(t);
  setTimeout(() => t.remove(), 2300);
}

function openLightbox(html) {
  const dlg = document.getElementById("lightbox");
  const cont = document.getElementById("lightbox-content");
  const close = document.getElementById("lightbox-close");
  if(!dlg || !cont || !close) return;
  cont.innerHTML = html;
  dlg.showModal();
  close.onclick = () => dlg.close();
}

// ---------- Tab System ----------
function setupTabs() {
  const tabs = document.querySelectorAll(".tabs .tab");
  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(b => b.setAttribute("aria-selected","false"));
      btn.setAttribute("aria-selected","true");
      const id = btn.dataset.tab;
      document.querySelectorAll("main > section").forEach(s => s.hidden = !s.id.endsWith(id));
      
      // Trigger renders for specific tabs
      if(id === "tasks") renderTasks();
      if(id === "summary") renderSummary();
      if(id === "characters") renderCharacters();
    });
  });
}

// ---------- XP System ----------
function computeTaskXP(t) {
  const pr = STATE.config.weights.priority[t.priority] || 1;
  const est = Number(t.estimate || 0);
  const streak = STATE.config.weights.streak || 0.5;
  let base = pr*10 + est*STATE.config.weights.estHour*5;
  
  // Apply scaling
  switch(STATE.config.scale) {
    case "Square root": base = Math.sqrt(base)*12; break;
    case "Log": base = Math.log10(base+1)*24; break;
  }
  
  // Apply streak bonus
  const streakLevel = (STATE.meta.completedCount % 7);
  base += streak * streakLevel * 2;
  
  return Math.max(1, Math.round(base));
}

function addCategoryXP(category, xp) {
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

// ---------- Activity System ----------
function addActivity(title, xp = 0, kind = "generic") {
  const entry = { when: new Date().toISOString(), title, xp, kind };
  ACTIVITY.unshift(entry);
  ACTIVITY = ACTIVITY.slice(0, 100);
  STATE.activity = ACTIVITY;
  save();
}

// ---------- Summary View ----------
function renderSummary() {
  const section = document.getElementById("view-summary");
  const grid = document.getElementById("summary-grid");
  if(!section || !grid) return;

  const cats = CATEGORIES.filter(c => c !== "Other");
  grid.innerHTML = cats.map(cat => {
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

  // Add click handlers
  grid.querySelectorAll(".tile").forEach(btn => {
    btn.addEventListener("click", () => {
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

  // Render activity section
  renderActivity(section);
}

function renderActivity(section) {
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
      ${recent.map(e => {
        const d = new Date(e.when);
        const when = d.toLocaleString(undefined, { month:"short", day:"numeric" });
        const iconFor = (kind) => {
          switch(kind) {
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

// ---------- Character Unlock System ----------
function unlockCharacterMaybe(category, xpGained) {
  const categoryXP = getCategoryXP(category);
  
  if(!STATE.characters[category] && categoryXP >= STATE.config.characterUnlockThreshold) {
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

// ---------- Characters View ----------
function renderCharacters() {
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

  // Add tier button handlers
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

// ---------- Task System ----------
function renderTasks() {
  const groupsEl = document.getElementById("task-groups");
  if(!groupsEl) return;

  const doneCount = STATE.tasks.filter(t => t.done).length;
  const todayCount = STATE.tasks.filter(t => t.due === todayStr() && !t.done).length;
  const statDone = document.getElementById("stat-done");
  const statToday = document.getElementById("stat-today");
  const statTotal = document.getElementById("stat-total");
  if(statDone) statDone.textContent = `Done: ${doneCount}`;
  if(statToday) statToday.textContent = `Due Today: ${todayCount}`;
  if(statTotal) statTotal.textContent = `Total: ${STATE.tasks.length}`;

  const tasks = STATE.tasks.filter(t => !t.done);
  if(tasks.length === 0) {
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

  // Add task handlers
  groupsEl.querySelectorAll(".task").forEach(card => {
    card.querySelector(".btn-done").addEventListener("click", () => {
      completeTask(card.dataset.id);
      card.classList.add("zap");
      setTimeout(() => renderTasks(), 620);
    });
    card.querySelector(".btn-del").addEventListener("click", () => {
      if(confirm("Delete this task?")) {
        deleteTask(card.dataset.id);
        renderTasks();
      }
    });
  });
}

function renderTaskCard(t) {
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

function completeTask(id) {
  const t = STATE.tasks.find(x => x.id === id);
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

function deleteTask(id) { 
  STATE.tasks = STATE.tasks.filter(x => x.id !== id); 
  save(); 
}

// ---------- Task Creation ----------
function setupTaskCreation() {
  document.addEventListener("submit", (e) => {
    if(e.target && e.target.id === "quick-form") {
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
      if(!t.title) { 
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
}

// ---------- Configuration ----------
function setupConfig() {
  // XP preset handling
  const presetSelect = document.getElementById("xp-preset");
  const scaleSelect = document.getElementById("xp-scale");
  
  if(presetSelect) {
    presetSelect.value = STATE.config.xpPreset;
    presetSelect.addEventListener("change", () => {
      STATE.config.xpPreset = presetSelect.value;
      
      // Apply preset weights
      switch(presetSelect.value) {
        case "Aggressive":
          STATE.config.weights = { priority: { Low:2, Medium:4, High:6 }, estHour: 2, streak: 1 };
          break;
        case "Gentle":
          STATE.config.weights = { priority: { Low:0.5, Medium:1, High:1.5 }, estHour: 0.5, streak: 0.25 };
          break;
        default: // Default
          STATE.config.weights = { priority: { Low:1, Medium:2, High:3 }, estHour: 1, streak: 0.5 };
      }
      save();
      toast("XP preset updated!");
    });
  }
  
  if(scaleSelect) {
    scaleSelect.value = STATE.config.scale;
    scaleSelect.addEventListener("change", () => {
      STATE.config.scale = scaleSelect.value;
      save();
      toast("XP scale updated!");
    });
  }

  // Unlock threshold
  const unlockInput = document.getElementById("unlock-threshold-input");
  const unlockApply = document.getElementById("apply-unlock-threshold");
  
  if(unlockInput) unlockInput.value = STATE.config.characterUnlockThreshold;
  if(unlockApply) {
    unlockApply.addEventListener("click", () => {
      const val = parseInt(unlockInput.value);
      if(val >= 10) {
        STATE.config.characterUnlockThreshold = val;
        save();
        toast("Unlock threshold updated!");
        renderSummary();
      } else {
        toast("Threshold must be at least 10 XP");
      }
    });
  }

  // Tier thresholds
  const tierA = document.getElementById("tier-a-input");
  const tierB = document.getElementById("tier-b-input");
  const tierC = document.getElementById("tier-c-input");
  const tierApply = document.getElementById("apply-tier-thresholds");
  
  if(tierA) tierA.value = STATE.config.tierThresholds.A;
  if(tierB) tierB.value = STATE.config.tierThresholds.B;
  if(tierC) tierC.value = STATE.config.tierThresholds.C;
  
  if(tierApply) {
    tierApply.addEventListener("click", () => {
      const a = parseInt(tierA.value);
      const b = parseInt(tierB.value);
      const c = parseInt(tierC.value);
      if(a >= 10 && b >= 50 && c >= 100 && a < b && b < c) {
        STATE.config.tierThresholds = {A: a, B: b, C: c};
        save();
        toast("Tier thresholds updated!");
        renderCharacters();
      } else {
        toast("Invalid thresholds - must be A < B < C and meet minimums");
      }
    });
  }

  // Data controls
  setupDataControls();
}

function setupDataControls() {
  const seedDemo = document.getElementById("seed-demo");
  const exportBtn = document.getElementById("export-completed");
  const importBtn = document.getElementById("import-completed");
  const importFile = document.getElementById("import-completed-file");
  const resetBtn = document.getElementById("reset-all");
  
  if(seedDemo) {
    seedDemo.addEventListener("click", () => {
      const demoTasks = [
        {id: uid(), title: "Morning workout", category: "Fitness", priority: "Medium", due: todayStr(), estimate: 1, done: false, createdAt: new Date().toISOString(), type: "oneoff"},
        {id: uid(), title: "Clean kitchen", category: "Home", priority: "Low", due: todayStr(), estimate: 0.5, done: false, createdAt: new Date().toISOString(), type: "oneoff"},
        {id: uid(), title: "Review budget", category: "Finance", priority: "High", due: todayStr(), estimate: 2, done: false, createdAt: new Date().toISOString(), type: "oneoff"},
        {id: uid(), title: "Team meeting prep", category: "Work", priority: "High", due: todayStr(), estimate: 1.5, done: false, createdAt: new Date().toISOString(), type: "oneoff"},
        {id: uid(), title: "Learn new skill", category: "Skills", priority: "Medium", due: todayStr(), estimate: 2, done: false, createdAt: new Date().toISOString(), type: "oneoff"}
      ];
      STATE.tasks.push(...demoTasks);
      save();
      toast("Demo tasks added!");
      renderTasks();
    });
  }

  if(exportBtn) {
    exportBtn.addEventListener("click", () => {
      try {
        const data = JSON.stringify(STATE, null, 2);
        const blob = new Blob([data], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `neon-tasks-backup-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast("Data exported successfully!");
      } catch(err) {
        toast("Export failed - please try again");
        console.error("Export error:", err);
      }
    });
  }

  if(importBtn && importFile) {
    importBtn.addEventListener("click", () => {
      importFile.click();
    });
    
    importFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if(!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          // Validate the data structure
          if(!data.tasks || !Array.isArray(data.tasks)) {
            throw new Error("Invalid backup file - missing tasks array");
          }
          
          // Merge imported data with current state
          Object.assign(STATE, {
            tasks: data.tasks || [],
            characters: data.characters || {},
            config: Object.assign({}, DEFAULT_CONFIG, data.config || {}),
            meta: Object.assign({}, STATE.meta, data.meta || {}),
            activity: data.activity || [],
            categoryXP: data.categoryXP || {},
            readyToOpen: data.readyToOpen || {}
          });
          
          save();
          toast("Data imported successfully! Refreshing...");
          
          // Refresh the UI
          setTimeout(() => {
            location.reload();
          }, 1000);
          
        } catch(err) {
          toast("Import failed - invalid file format");
          console.error("Import error:", err);
        }
      };
      reader.readAsText(file);
      
      // Clear the file input so the same file can be imported again if needed
      e.target.value = '';
    });
  }

  if(resetBtn) {
    resetBtn.addEventListener("click", () => {
      if(confirm("Reset all data? This will erase all tasks, characters, XP, and settings. This cannot be undone.")) {
        localStorage.removeItem(LS_KEY);
        toast("Data reset! Refreshing...");
        setTimeout(() => {
          location.reload();
        }, 1000);
      }
    });
  }
}

// ---------- App Initialization ----------
function init() {
  ACTIVITY = STATE.activity || [];
  
  // Setup category options
  const qCat = document.getElementById("q-category");
  if (qCat) qCat.innerHTML = CATEGORIES.map(c => `<option>${c}</option>`).join("");

  // Initialize systems
  setupTabs();
  setupTaskCreation();
  setupConfig();
  loadCharacters();
  
  // Initial render
  renderSummary();
  renderTasks();
  renderCharacters();
}

// ---------- App Startup ----------
document.addEventListener("DOMContentLoaded", init);/* NEON/TASKS v0.12 — Character-focused progression with tiers and lore */

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
const TIER_LABELS = { A: "Tier A", B: "Tier B", C: "Tier C" };

// ---------- State ----------
let CHAR_POOL = {};
let ACTIVITY = [];
const STATE = loadState();

// ---------- State Management ----------
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
    config: Object.assign({}, DEFAULT_CONFIG, s.config || {}),
    meta: s.meta || { completedCount: 0 },
    activity: s.activity || [],
    categoryXP: s.categoryXP || {},
    readyToOpen: s.readyToOpen || {}
  };
}

function save() {
  localStorage.setItem(LS_KEY, JSON.stringify
