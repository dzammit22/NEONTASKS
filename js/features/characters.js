import { CATEGORIES, CSV_TO_APP_CATEGORY } from '../core/config.js';
import { STATE, save, ACTIVITY } from '../core/state.js';
import { clamp, escapeHTML } from '../core/utils.js';
import { openLightbox } from '../ui/lightbox.js';
import { toast } from '../ui/toast.js';

export async function loadCharactersFromCSV() {
  const path = "assets/Cyberpunk App.csv";
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`CSV fetch failed: ${res.status} ${res.statusText}`);
      throw new Error("csv missing");
    }
    const text = await res.text();
    console.log("CSV loaded successfully, length:", text.length);

    const { header, rows } = parseCSV(text);
    console.log("CSV parsed - headers:", header);
    console.log("CSV parsed - rows:", rows.length);

    const idx = {
      cat: header.findIndex(h => h && /category/i.test(h.trim())),
      img: header.findIndex(h => h && /image/i.test(h.trim())),
      name: header.findIndex(h => h && /name.*title|title.*name|name/i.test(h.trim())),
      rarity: header.findIndex(h => h && /rarity/i.test(h.trim()))
    };

    if (idx.cat === -1) throw new Error("Category column not found in CSV");
    if (idx.name === -1) throw new Error("Name/Title column not found in CSV");

    const byCat = {};
    let processedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const cols = rows[i];
      if (!cols || !cols.length) continue;

      const csvCategory = cols[idx.cat] ? cols[idx.cat].toString().trim() : "";
      const rawName = cols[idx.name] ? cols[idx.name].toString().trim() : "";
      const rawImg = cols[idx.img] ? cols[idx.img].toString().trim() : "";
      const rawRarity = cols[idx.rarity] ? cols[idx.rarity].toString().trim() : "R";

      if (!csvCategory || csvCategory === "Unknown") continue;

      const cat = CSV_TO_APP_CATEGORY[csvCategory] || csvCategory;
      const categoryLower = cat.toLowerCase().replace(/\s+/g, '-');

      let chosen;
      if (rawImg) {
        chosen = `assets/characters/${categoryLower}/${rawImg}`;
      } else {
        chosen = `assets/characters/${categoryLower}/${categoryLower}-${1 + Math.floor(Math.random() * 3)}.png`;
      }

      const character = {
        category: cat,
        image: chosen,
        name: rawName || `${cat} Ally`,
        rarity: rawRarity || "R"
      };

      if (!byCat[cat]) byCat[cat] = [];
      byCat[cat].push(character);
      processedCount++;
    }

    console.log(`✓ Successfully processed ${processedCount} characters from CSV`);
    return byCat;

  } catch (e) {
    console.error("❌ CSV loading failed with error:", e);
    return generateFallbackCharacters();
  }
}

export function makeSessionCharacters(pool) {
  const chosen = {};
  for (const cat of CATEGORIES) {
    const list = pool[cat] || [];
    if (list.length) {
      chosen[cat] = list[Math.floor(Math.random() * list.length)];
    } else {
      chosen[cat] = {
        category: cat,
        image: defaultPortraitForCategory(cat),
        name: `${cat} Ally`,
        rarity: "R"
      };
    }
  }
  return chosen;
}

export function renderCharacters() {
  ensureLockedCharCSS();
  const grid = document.getElementById("chars-grid");
  const empty = document.getElementById("chars-empty");
  if (!grid) return;

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
          <div class="progress" aria-label="XP"><div style="width:${Math.round(ch.xp / ch.xpToNext * 100)}%"></div></div>
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
  if (empty) empty.style.display = "none";

  // Wire up character actions
  setupCharacterActions(grid);
}

export function unlockCharacterMaybe(category, xpGained) {
  if (!STATE.characters[category]) {
    const pick = window.SESSION_CHAR?.[category] || {
      name: `${category} Ally`,
      image: defaultPortraitForCategory(category),
      rarity: "R",
      category
    };
    STATE.characters[category] = {
      name: pick.name,
      rarity: pick.rarity,
      category,
      level: 1,
      bond: 0,
      xp: 0,
      xpToNext: 100,
      image: pick.image
    };
    
    // Add to activity
    import('../core/state.js').then(({ ACTIVITY }) => {
      ACTIVITY.unshift({
        when: new Date().toISOString(),
        title: `Found ${pick.name}`,
        xp: 0,
        kind: "character_found"
      });
      STATE.activity = ACTIVITY.slice(0, 100);
    });
    
    toast(`🎉 <strong>Unlocked</strong>: ${pick.name} (<span class="pink">${pick.rarity}</span>)`);
  }
  
  const ch = STATE.characters[category];
  if (ch) {
    ch.xp += Math.floor(xpGained * 0.6);
    ch.bond = clamp(ch.bond + Math.floor(xpGained * 0.2), 0, 100);
    while (ch.xp >= ch.xpToNext) {
      ch.xp -= ch.xpToNext;
      ch.level++;
      ch.xpToNext = Math.round(ch.xpToNext * 1.25);
      toast(`⬆️ <strong>${ch.name}</strong> reached <span class="yellow">Lv.${ch.level}</span>`);
    }
    save();
  }
}

// Helper functions
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

function generateFallbackCharacters() {
  const byCat = {};
  for (const cat of CATEGORIES) {
    const slug = cat.toLowerCase().replace(/\s+/g, '-');
    byCat[cat] = [1, 2, 3].map(n => ({
      category: cat,
      image: `assets/characters/${slug}/${slug}-${n}.png`,
      name: `${cat} Operative ${n}`,
      rarity: ["R", "SR", "SSR"][n - 1] || "R"
    }));
  }
  return byCat;
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

function isUnlocked(cat) {
  return !!STATE.characters[cat];
}

function setupCharacterActions(grid) {
  grid.querySelectorAll("[data-chat]").forEach(b => b.addEventListener("click", () => {
    const cat = b.getAttribute("data-chat");
    const ch = STATE.characters[cat];
    const lines = [
      `"Stay sharp. Every checkbox is a blade."`,
      `"Neon nights favor the disciplined."`,
      `"Your grind fuels our power core."`,
      `"Focus fire: one task at a time."`
    ];
    openLightbox(`<h3>${escapeHTML(ch.name)} · Chat</h3><p class="muted">${lines[Math.floor(Math.random() * lines.length)]}</p>`);
  }));

  grid.querySelectorAll("[data-train]").forEach(b => b.addEventListener("click", () => {
    const cat = b.getAttribute("data-train");
    const ch = STATE.characters[cat];
    ch.xp += 20;
    toast(`🏋️ Trained <strong>${escapeHTML(ch.name)}</strong> (+20 XP)`);
    while (ch.xp >= ch.xpToNext) {
      ch.xp -= ch.xpToNext;
      ch.level++;
      ch.xpToNext = Math.round(ch.xpToNext * 1.25);
      toast(`⬆️ ${escapeHTML(ch.name)} Lv.${ch.level}`);
    }
    save();
    renderCharacters();
  }));

  grid.querySelectorAll("[data-gift]").forEach(b => b.addEventListener("click", () => {
    const cat = b.getAttribute("data-gift");
    const ch = STATE.characters[cat];
    ch.bond = clamp(ch.bond + 5, 0, 100);
    toast(`🎁 Bond with <strong>${escapeHTML(ch.name)}</strong> +5`);
    save();
    renderCharacters();
  }));
}
