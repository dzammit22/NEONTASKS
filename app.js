/* NEON/TASKS v0.12.2 — full app
   - JSON/CSV character loader (robust)
   - Summary tiles + recent activity (single-line clamp)
   - Tasks list with tidy wrapping, green/red action buttons
   - Calendar with neon dots + lightbox day view
   - Characters with locked placeholders, train/chat/gift
   - Boss with power meter
   - Data controls: export/import completed, full backup export/import (merge or replace)
*/

(() => {
  "use strict";

  // ---------- Constants ----------
  const LS_KEY = "neon_tasks_v07";
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
  let SESSION_CHAR = {};
  let CHAR_POOL = {};
  let ACTIVITY = [];
  let CHAR_SOURCE_INFO = {source:"default", path:null, error:null};

  const STATE = loadState();
  document.addEventListener("DOMContentLoaded", init);

  function loadState() {
    let s;
    try { s = JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { s = {}; }
    return {
      tasks: s.tasks || [],
      characters: s.characters || {},
      config: s.config || deepClone(DEFAULT_CONFIG),
      power: s.power || 0,
      calendarCursor: s.calendarCursor || todayStr().slice(0,7),
      seedVersion: s.seedVersion || 0,
      meta: s.meta || { installedAt: Date.now(), completedCount: 0 },
      activity: s.activity || []
    };
  }
  function save() { localStorage.setItem(LS_KEY, JSON.stringify(STATE)); renderHeaderPower(); }
  ACTIVITY = STATE.activity || [];

  // ---------- Utilities ----------
  const deepClone = (o)=> JSON.parse(JSON.stringify(o));
  const uid = ()=> Math.random().toString(36).slice(2)+Date.now().toString(36);
  const clamp = (n,min,max)=> Math.max(min, Math.min(max, n));
  const todayStr = ()=> new Date().toISOString().slice(0,10);
  const dateStamp = ()=> new Date().toISOString().slice(0,10).replace(/-/g,"");
  function fmtDate(iso){ if(!iso) return "—"; const d = new Date(iso+"T00:00:00"); return d.toLocaleDateString(undefined,{month:"short", day:"numeric"}); }
  const startOfWeek = (d)=>{ const dt = new Date(d); const day = dt.getDay(); const diff = (day+6)%7; dt.setDate(dt.getDate()-diff); return dt; };
  const endOfWeek = (d)=>{ const s = startOfWeek(d); const e = new Date(s); e.setDate(e.getDate()+6); return e; };
  const inRange = (dateIso, a, b)=> { const d = new Date(dateIso+"T00:00:00"); return d >= new Date(a) && d <= new Date(b); };
  const priorityScore = (p)=> STATE.config.weights.priority[p] ?? 1;
  const escapeHTML = (s)=> (s||"").replace(/[&<>"']/g, m=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const ellipsize = (s, max)=> (String(s||"").length > max ? String(s).slice(0, max - 1) + "…" : String(s||""));

  // ---------- Portraits & Locks ----------
  function defaultPortraitForCategory(cat){
    const color = {Fitness:"#23ffd9",Home:"#a26bff",Finance:"#ffe066",Work:"#ff33cc",Rose:"#ff6ad5",Skills:"#66ccff",Other:"#66ff99"}[cat]||"#6bf";
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
  const isUnlocked = (cat)=> !!STATE.characters[cat];
  function placeholderPortraitForCategory(cat){
    const color = {Fitness:"#23ffd9",Home:"#a26bff",Finance:"#ffe066",Work:"#ff33cc",Rose:"#ff6ad5",Skills:"#66ccff",Other:"#66ff99"}[cat]||"#6bf";
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
  <g filter='url(#glow)'><rect x='275' y='240' width='90' height='70' rx='12' fill='none' stroke='${color}' stroke-width='4'/>
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
        color:#def; text-shadow:0 0 12px rgba(123,200,255,.6); font-weight:700; letter-spacing:.4px;
        background: radial-gradient(ellipse at center, rgba(17,23,43,.25), rgba(17,23,43,.0) 55%);
        pointer-events:none;
      }
      .char-card.locked .btn{ opacity:.5; pointer-events:none; }
    `;
    document.head.appendChild(style);
  }

  // ---------- Data loading (JSON first, CSV fallback) ----------
  function stripBOM(s){ return s && s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s; }
  function parseCSV(text) {
    text = stripBOM(text).replace(/\r\n/g, '\n');
    const delimiter = (text.indexOf(';\n') > -1 || text.indexOf('";"') > -1) ? ';' : ',';
    const rows = []; let row=[], cell='', inQuotes=false;
    for (let i=0;i<text.length;i++){
      const ch = text[i];
      if (inQuotes){ if(ch === '"'){ if(text[i+1] === '"'){ cell+='"'; i++; } else inQuotes=false; } else cell += ch; }
      else { if(ch === '"') inQuotes = true; else if(ch === delimiter){ row.push(cell); cell=''; }
        else if(ch === '\n'){ row.push(cell); rows.push(row); row=[]; cell=''; } else cell += ch; }
    }
    row.push(cell); rows.push(row);
    while (rows.length && rows[rows.length - 1].every(x => (x||"").trim() === '')) rows.pop();
    const header = rows.shift().map(h => (h||"").trim());
    return { header, rows };
  }
  function normalizeImageName(raw, categoryLower) {
    if (!raw) return null;
    let s = String(raw).trim().replace(/^[“”"']+/, '').replace(/[“”"']+$/, '');
    s = s.split('/').pop().split('\\').pop().trim().replace(/[.\s]+$/g, '');
    if (!s) return null;
    if (!/\.(png|jpg|jpeg|webp|gif)$/i.test(s)) s += '.png';
    const canon = new RegExp(`^${categoryLower}-([1-3])\\.(png|jpg|jpeg|webp|gif)$`, 'i');
    if (canon.test(s)) return s;
    const numMatch = s.match(/([1-3])(?!\d)/);
    if (numMatch) return `${categoryLower}-${numMatch[1]}.png`;
    return null;
  }
  async function fetchJSONIfOk(path){ const r=await fetch(path,{cache:"no-store"}); if(!r.ok) throw new Error(`${path} → ${r.status}`); return r.json(); }
  async function fetchTextIfOk(path){ const r=await fetch(path,{cache:"no-store"}); if(!r.ok) throw new Error(`${path} → ${r.status}`); return r.text(); }

  async function loadCharacterPool(){
    const jsonCandidates = ["assets/characters.json","assets/characters/index.json","assets/Characters.json","assets/Characters/index.json"];
    for(const p of jsonCandidates){
      try{
        const data = await fetchJSONIfOk(p);
        if (isValidCharacterJSON(data)) {
          CHAR_SOURCE_INFO = { source:"json", path:p, error:null };
          return normaliseCharacterJSONToPool(data);
        }
      }catch(_){}
    }
    const csvCandidates = [
      "assets/Cyberpunk App.csv","assets/Cyberpunk%20App.csv","assets/cyberpunk app.csv","assets/cyberpunk%20app.csv",
      "assets/characters.csv","assets/data/characters.csv","assets/Data/characters.csv"
    ];
    for(const p of csvCandidates){
      try{
        const text = await fetchTextIfOk(p);
        CHAR_SOURCE_INFO = { source:"csv", path:p, error:null };
        return parseCharacterCSVToPool(text);
      }catch(_){}
    }
    CHAR_SOURCE_INFO = { source:"default", path:null, error:"No JSON/CSV found" };
    toast("⚠️ Character data not found; using defaults");
    return makeDefaultPool();
  }
  function isValidCharacterJSON(data){
    if(!data) return false;
    if(Array.isArray(data)) return data.every(x=>x && x.category && x.image);
    if(typeof data === "object"){ const k=Object.keys(data); return k.length>0 && k.every(key => Array.isArray(data[key])); }
    return false;
  }
  function normaliseCharacterJSONToPool(data){
    const pool = {};
    if(Array.isArray(data)){
      for(const x of data){
        const cat = (CSV_TO_APP_CATEGORY[x.category] || x.category || "Other").trim();
        (pool[cat] ||= []).push({ category:cat, image:x.image, name:(x.name||`${cat} Ally`).trim(), rarity:(x.rarity||"R").trim() });
      }
    } else {
      for(const [k, arr] of Object.entries(data)){
        const cat = (CSV_TO_APP_CATEGORY[k] || k).trim();
        pool[cat] = (arr||[]).map(x=>({ category:cat, image:x.image, name:(x.name||`${cat} Ally`).trim(), rarity:(x.rarity||"R").trim() }));
      }
    }
    return pool;
  }
  function parseCharacterCSVToPool(text){
    const { header, rows } = parseCSV(text);
    const find = (names)=> header.findIndex(h => names.some(n => new RegExp(`^${n}$`, "i").test(h)));
    const idx = { cat: find(["category","cat"]), img: find(["image","img","file","filename","path"]), name: find(["name","title","codename"]), rarity: find(["rarity","grade","tier"]) };
    if (idx.cat === -1) throw new Error("Category column not found");
    const byCat = {};
    for(const cols of rows){
      if (!cols || !cols.length) continue;
      const rawCat = (cols[idx.cat] || "Other").trim();
      const cat = (CSV_TO_APP_CATEGORY[rawCat] || rawCat).trim();
      const categoryLower = cat.toLowerCase().replace(/\s+/g, '-');
      const rawImg = idx.img >= 0 ? cols[idx.img] : "";
      const normalized = normalizeImageName(rawImg, categoryLower);
      const chosen = normalized ? `assets/characters/${categoryLower}/${normalized}` : `assets/characters/${categoryLower}/${categoryLower}-${1 + Math.floor(Math.random()*3)}.png`;
      (byCat[cat] ||= []).push({
        category: cat,
        image: chosen,
        name: (idx.name >= 0 ? cols[idx.name] : "").trim() || `${cat} Ally`,
        rarity: (idx.rarity >= 0 ? cols[idx.rarity] : "").trim() || "R"
      });
    }
    return byCat;
  }
  function makeDefaultPool(){
    const byCat = {};
    for(const cat of CATEGORIES){
      const slug = cat.toLowerCase().replace(/\s+/g, '-');
      byCat[cat] = [1,2,3].map(n=>({ category:cat, image:`assets/characters/${slug}/${slug}-${n}.png`, name:`${cat} Operative ${n}`, rarity:["R","SR","SSR"][n-1]||"R" }));
    }
    return byCat;
  }

  // ---------- App Init ----------
  async function init(){
    const qCat = document.getElementById("q-category");
    if (qCat) qCat.innerHTML = CATEGORIES.map(c=>`<option>${c}</option>`).join("");
    setupTabs(); setupAddDialog(); setupTaskToolbar(); setupCalendar(); setupConfig(); setupReset();
    CHAR_POOL = await loadCharacterPool();
    SESSION_CHAR = makeSessionCharacters(CHAR_POOL);
    renderAll();
    if("serviceWorker" in navigator){ navigator.serviceWorker.register("./service-worker.js").catch(()=>{}); }
  }
  function renderAll(){ renderHeaderPower(); renderSummary(); renderTasks(); renderCalendar(); renderCharacters(); renderBoss(); }

  // ---------- Toasts & Lightbox ----------
  function toast(html){ const layer = document.getElementById("toast-layer"); if(!layer) return; const t = document.createElement("div"); t.className = "toast"; t.innerHTML = html; layer.appendChild(t); setTimeout(()=>{ t.remove(); }, 2300); }
  function openLightbox(html){ const dlg = document.getElementById("lightbox"); const cont = document.getElementById("lightbox-content"); const close = document.getElementById("lightbox-close"); if(!dlg||!cont||!close) return; cont.innerHTML = html; dlg.showModal(); close.onclick = ()=> dlg.close(); }

  // ---------- Tabs ----------
  function setupTabs(){
    const tabs = document.querySelectorAll(".tabs .tab");
    tabs.forEach(btn=>{
      btn.addEventListener("click", ()=>{
        tabs.forEach(b=>b.setAttribute("aria-selected","false")); btn.setAttribute("aria-selected","true");
        const id = btn.dataset.tab;
        document.querySelectorAll("main > section").forEach(s=> s.hidden = !s.id.endsWith(id));
        if(id==="tasks") renderTasks(); if(id==="summary") renderSummary(); if(id==="characters") renderCharacters();
        if(id==="calendar") renderCalendar(); if(id==="boss") renderBoss();
      });
    });
  }

  // ---------- Power & XP ----------
  function computeTaskXP(t){
    const pr = priorityScore(t.priority);
    const est = Number(t.estimate || 0);
    const streak = STATE.config.weights.streak;
    let base = pr*10 + est*STATE.config.weights.estHour*5;
    switch(STATE.config.scale){ case "Square root": base = Math.sqrt(base)*12; break; case "Log": base = Math.log10(base+1)*24; break; }
    const streakLevel = (STATE.meta.completedCount % 7); base += streak * streakLevel * 2;
    return Math.max(1, Math.round(base));
  }
  function addPower(xp){ STATE.power += xp; save(); }
  function renderHeaderPower(){ const pctEl = document.getElementById("power-perc"); const bar = document.getElementById("powerbar-inner"); if(!pctEl||!bar) return; const pct = clamp(Math.round((STATE.power % STATE.config.bossTarget)/STATE.config.bossTarget*100),0,100); pctEl.textContent = `${pct}%`; bar.style.width = `${pct}%`; }

  // ---------- Activity ----------
  function addActivity(title, xp=0, kind="generic"){ const entry = { when:new Date().toISOString(), title, xp, kind }; ACTIVITY.unshift(entry); ACTIVITY = ACTIVITY.slice(0,100); STATE.activity = ACTIVITY; save(); }

  // ---------- Summary ----------
  function makeSessionCharacters(pool){ const chosen={}; for(const cat of CATEGORIES){ const list = pool[cat]||[]; chosen[cat] = list.length? list[Math.floor(Math.random()*list.length)] : {category:cat,image:defaultPortraitForCategory(cat),name:`${cat} Ally`,rarity:"R"}; } return chosen; }
  function renderSummary(){
    ensureLockedCharCSS();
    const section = document.getElementById("view-summary"); const grid = document.getElementById("summary-grid"); if(!section||!grid) return;
    const cats = CATEGORIES.filter(c=>c!=="Other");
    grid.innerHTML = cats.map(cat=>{
      const unlocked = isUnlocked(cat);
      const portrait = unlocked ? (STATE.characters[cat]?.image || defaultPortraitForCategory(cat)) : placeholderPortraitForCategory(cat);
      return `<button class="tile ${unlocked? "" : "locked"}" data-cat="${cat}"><img alt="" src="${portrait}"><div class="label">${cat}</div></button>`;
    }).join("");
    grid.querySelectorAll(".tile").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const cat = btn.dataset.cat;
        if(isUnlocked(cat)){ const ch = STATE.characters[cat]; openLightbox(`<h3>${escapeHTML(ch.name)}</h3><img src="${ch.image || defaultPortraitForCategory(cat)}" alt="${cat} portrait" style="max-width:100%;border-radius:12px" />`); }
        else openLightbox(`<h3>${cat} Character Locked</h3><p class="muted">Complete a <strong>${cat}</strong> task to unlock this ally.</p>`);
      });
    });
    if (!document.getElementById("summary-activity-space")){ const s=document.createElement("style"); s.id="summary-activity-space"; s.textContent=`#view-summary{display:grid;gap:18px}.summary-grid{margin-bottom:6px}`; document.head.appendChild(s); }
    let act=document.getElementById("summary-activity"); if(!act){act=document.createElement("div"); act.id="summary-activity"; act.className="card"; section.appendChild(act);}
    const recent=(STATE.activity||[]).slice(0,3); const iconFor=k=>({character_found:"🎉",task_completed:"⚡",boss_win:"🧨",boss_loss:"💀"})[k]||"•"; const TITLE_MAX=48;
    act.innerHTML = `<div class="group-head"><strong>Recent activity</strong><span class="muted">${recent.length?"":"No recent actions yet"}</span></div>
      <div class="activity-list" role="list">${
        recent.map(e=>{ const d=new Date(e.when); const when=d.toLocaleString(undefined,{month:"short",day:"numeric"}); const full=escapeHTML(e.title); const short=escapeHTML(ellipsize(e.title,TITLE_MAX));
          return `<div class="activity-row" role="listitem"><span class="a-icn">${iconFor(e.kind)}</span><span class="a-text" title="${full}">${short}</span><time class="a-date">${when}</time></div>`; }).join("")
      }</div>`;
  }

  // ---------- Quick Create ----------
  document.addEventListener("submit",(e)=>{
    if(e.target && e.target.id==="quick-form"){
      e.preventDefault();
      const t = {
        id:uid(),
        title:document.getElementById("q-title").value.trim(),
        due:document.getElementById("q-due").value||null,
        priority:document.getElementById("q-priority").value,
        category:document.getElementById("q-category").value,
        notes:document.getElementById("q-notes").value.trim(),
        type:"oneoff", start:null, end:null, repeat:null, estimate:1, done:false, createdAt:new Date().toISOString()
      };
      if(!t.title){ document.getElementById("q-title").reportValidity(); return; }
      STATE.tasks.push(t); save();
      toast(`<strong class="cyan">Task created</strong>: ${escapeHTML(t.title)}`);
      e.target.reset(); renderTasks(); renderCalendar(); renderSummary();
    }
  });

  // ---------- Tasks ----------
  function setupTaskToolbar(){
    const s=document.getElementById("task-search"); const sort=document.getElementById("task-sort");
    if(s) s.addEventListener("input",()=>renderTasks());
    if(sort) sort.addEventListener("change",()=>renderTasks());
    document.querySelectorAll(".toolbar .chip[data-scope]").forEach(ch=>{
      ch.addEventListener("click",()=>{ document.querySelectorAll(".toolbar .chip[data-scope]").forEach(c=>c.setAttribute("aria-pressed","false")); ch.setAttribute("aria-pressed","true"); renderTasks(); });
    });
    const wrap=document.getElementById("task-categories");
    if(wrap){
      wrap.innerHTML=['All',...CATEGORIES].map(c=>`<button class="chip" data-cat="${c}" aria-pressed="${c==='All'}">${c}</button>`).join("");
      wrap.querySelectorAll(".chip").forEach(btn=>btn.addEventListener("click",()=>{ wrap.querySelectorAll(".chip").forEach(b=>b.setAttribute("aria-pressed","false")); btn.setAttribute("aria-pressed","true"); renderTasks(); }));
    }
  }
  function renderTasks(){
    const groupsEl=document.getElementById("task-groups"); if(!groupsEl) return;
    const search=(document.getElementById("task-search")?.value||"").toLowerCase();
    const sort=document.getElementById("task-sort")?.value||"priority";
    const scopeBtn=document.querySelector('.toolbar .chip[aria-pressed="true"][data-scope]'); const scope=scopeBtn?.dataset.scope||"today";
    const activeCatBtn=document.querySelector('#task-categories .chip[aria-pressed="true"]'); const catFilter=activeCatBtn?activeCatBtn.dataset.cat:"All";
    const now=new Date(); const start=startOfWeek(now); const end=endOfWeek(now);
    const filtered=STATE.tasks.filter(t=>{
      if(catFilter!=="All" && t.category!==catFilter) return false;
      if(search && !(t.title.toLowerCase().includes(search) || (t.notes||"").toLowerCase().includes(search))) return false;
      if(scope==="today"){ return (t.due ? t.due===todayStr() : true); }
      if(scope==="week"){ return (t.due ? inRange(t.due,start,end) : true); }
      return true;
    });

    const doneCount=STATE.tasks.filter(t=>t.done).length;
    const todayCount=STATE.tasks.filter(t=>t.due===todayStr()&&!t.done).length;
    const statDone=document.getElementById("stat-done"); const statToday=document.getElementById("stat-today"); const statTotal=document.getElementById("stat-total");
    if(statDone) statDone.textContent=`Done: ${doneCount}`; if(statToday) statToday.textContent=`Due Today: ${todayCount}`; if(statTotal) statTotal.textContent=`Total: ${STATE.tasks.length}`;

    let sortFn; if(sort==="priority") sortFn=(a,b)=>priorityScore(b.priority)-priorityScore(a.priority);
    else if(sort==="due") sortFn=(a,b)=>(a.due||"9999").localeCompare(b.due||"9999"); else sortFn=(a,b)=>(a.createdAt||"").localeCompare(b.createdAt||"");
    filtered.sort(sortFn);

    const map=new Map(); for(const t of filtered){ const key=t.due||"No date"; if(!map.has(key)) map.set(key,[]); map.get(key).push(t); }

    if(filtered.length===0){ groupsEl.innerHTML=`<div class="card muted">No tasks match your filters.</div>`; return; }

    groupsEl.innerHTML=[...map.entries()].map(([k,arr])=>{
      const label=k==="No date"?"No date":`${fmtDate(k)} (${k})`;
      return `<div class="group card"><div class="group-head"><strong>${label}</strong><span class="muted">${arr.length} task(s)</span></div><div class="group-body">${arr.map(renderTaskCard).join("")}</div></div>`;
    }).join("");

    groupsEl.querySelectorAll(".task").forEach(card=>{
      card.querySelector(".btn-done").addEventListener("click",()=>{ completeTask(card.dataset.id); card.classList.add("zap"); setTimeout(()=>renderTasks(),620); });
      card.querySelector(".btn-del").addEventListener("click",()=>{ if(confirm("Delete this task?")){ deleteTask(card.dataset.id); renderTasks(); renderCalendar(); } });
      let sx=0,ex=0; card.addEventListener("touchstart",e=>{sx=e.changedTouches[0].screenX;},{passive:true});
      card.addEventListener("touchend",e=>{ex=e.changedTouches[0].screenX; const dx=ex-sx;
        if(dx>60){ completeTask(card.dataset.id); card.classList.add("zap"); setTimeout(()=>renderTasks(),620); }
        else if(dx<-60){ if(confirm("Delete this task?")){ deleteTask(card.dataset.id); renderTasks(); renderCalendar(); } }
      },{passive:true});
    });
  }
  function renderTaskCard(t){
    const color = PRIORITY_COLORS[t.priority]||"#9cf"; const done=t.done?"done":"";
    return `<div class="task ${done}" data-id="${t.id}">
      <div class="p-dot" style="color:${color}"></div>
      <div>
        <div class="title">${escapeHTML(t.title)}</div>
        <div class="meta">
          <span class="pill">${t.category}</span>
          <span class="pill">Priority: ${t.priority}</span>
          <span class="pill">Due: ${fmtDate(t.due)}</span>
          ${t.type!=="oneoff"?`<span class="pill">${t.type}</span>`:""}
          ${t.estimate?`<span class="pill">~${t.estimate}h</span>`:""}
        </div>
        ${t.notes?`<div class="notes">${escapeHTML(t.notes)}</div>`:""}
      </div>
      <div class="actions">
        <button class="btn btn-done">Done</button>
        <button class="btn btn-del">Delete</button>
      </div>
      <div class="hint"><span>← Delete</span><span>Done →</span></div>
    </div>`;
  }
  function completeTask(id){
    const t=STATE.tasks.find(x=>x.id===id); if(!t||t.done) return;
    t.done=true; t.completedAt=new Date().toISOString(); STATE.meta.completedCount++;
    const xp=computeTaskXP(t); addPower(xp); addActivity(`Completed: ${t.title}`,xp,"task_completed"); unlockCharacterMaybe(t.category,xp);
    toast(`⚡ <strong>Completed</strong>: ${escapeHTML(t.title)} <span class="muted">(+${xp} XP)</span>`); save();
    renderCharacters(); renderBoss(); renderCalendar(); renderSummary();
  }
  const deleteTask=(id)=>{ STATE.tasks = STATE.tasks.filter(x=>x.id!==id); save(); };

  // ---------- Add Dialog ----------
  let selectedAddCategory = CATEGORIES[0];
  function setupAddDialog(){
    const dlg=document.getElementById("add-dialog"); const openBtn=document.getElementById("fab-add"); if(!dlg||!openBtn) return;
    const cancelBtn=document.getElementById("add-cancel"); const confirmBtn=document.getElementById("add-confirm");
    const pills=document.getElementById("a-category-pills"); const prev=document.getElementById("a-character-preview");
    if(pills){
      pills.innerHTML=CATEGORIES.map((c,i)=>`<button type="button" class="chip" data-cat="${c}" aria-pressed="${i===0}">${c}</button>`).join("");
      const updatePreview=()=>{ const character=SESSION_CHAR[selectedAddCategory]; const img=character?.image||defaultPortraitForCategory(selectedAddCategory);
        if(prev) prev.innerHTML=`<img src="${img}" alt="${selectedAddCategory} preview" style="max-width:100%;max-height:110px;border-radius:10px" onerror="this.src='${defaultPortraitForCategory(selectedAddCategory)}';" />`; };
      pills.querySelectorAll(".chip").forEach(btn=>btn.addEventListener("click",()=>{ pills.querySelectorAll(".chip").forEach(b=>b.setAttribute("aria-pressed","false")); btn.setAttribute("aria-pressed","true"); selectedAddCategory=btn.dataset.cat; updatePreview(); }));
      if(prev) prev.innerHTML=`<div class="muted">Character preview will appear here</div>`;
      openBtn.addEventListener("click",()=>{ dlg.showModal(); selectedAddCategory=CATEGORIES[0]; updatePreview(); });
    }
    if(cancelBtn) cancelBtn.addEventListener("click",()=>dlg.close());
    const clearBtn=document.getElementById("add-clear"); if(clearBtn) clearBtn.addEventListener("click",()=>document.getElementById("add-form").reset());
    if(confirmBtn){
      confirmBtn.addEventListener("click",(e)=>{
        e.preventDefault();
        const title=document.getElementById("a-title").value.trim(); if(!title){ document.getElementById("a-title").reportValidity(); return; }
        const t={ id:uid(), title, category:selectedAddCategory, priority:document.getElementById("a-priority").value, type:document.getElementById("a-type").value,
          start:document.getElementById("a-start").value||null, end:document.getElementById("a-end").value||null, estimate:Number(document.getElementById("a-est").value||0),
          repeat:Number(document.getElementById("a-repeat").value||0)||null, notes:document.getElementById("a-notes").value.trim(),
          due:(document.getElementById("a-end").value||document.getElementById("a-start").value||null), done:false, createdAt:new Date().toISOString() };
        STATE.tasks.push(t); save(); dlg.close(); toast(`<strong class="cyan">Task added</strong>: ${escapeHTML(t.title)}`); renderTasks(); renderCalendar(); renderSummary();
      });
    }
  }

  // ---------- Calendar ----------
  function setupCalendar(){
    const prev=document.getElementById("cal-prev"); const next=document.getElementById("cal-next"); const today=document.getElementById("cal-today"); const gen=document.getElementById("cal-generate");
    if(prev) prev.addEventListener("click",()=>shiftMonth(-1)); if(next) next.addEventListener("click",()=>shiftMonth(1));
    if(today) today.addEventListener("click",()=>{ STATE.calendarCursor=todayStr().slice(0,7); save(); renderCalendar(); });
    if(gen) gen.addEventListener("click",()=>{ generateRecurring(); renderCalendar(); });
  }
  function ensureCalendarCSS(){
    if(document.getElementById("cal-dot-style")) return;
    const style=document.createElement("style"); style.id="cal-dot-style";
    style.textContent=`
    #calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:12px}
    #calendar-grid .day{position:relative;height:96px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);padding:8px 10px 10px;overflow:hidden}
    #calendar-grid .day[aria-disabled="true"]{visibility:hidden}
    #calendar-grid .d-num{position:absolute;top:8px;left:10px;font:600 12px/1 system-ui,ui-sans-serif,-apple-system,Segoe UI,Roboto,Arial;color:#8ea3c7;letter-spacing:.4px;opacity:.9}
    #calendar-grid .today .d-num{color:#fff;text-shadow:0 0 10px rgba(111,210,255,.9)}
    #calendar-grid .cal-dots{position:absolute;left:8px;right:8px;bottom:8px;display:grid;grid-template-columns:repeat(8,1fr);gap:6px}
    #calendar-grid .cal-dot{width:10px;height:10px;border-radius:50%;filter:drop-shadow(0 0 4px currentColor) drop-shadow(0 0 8px currentColor);opacity:.95}
    #calendar-grid .cal-over{font-weight:600;font-size:10px;color:#c7d7ff;opacity:.8;text-align:right;align-self:center}
    @media (max-width:480px){#calendar-grid{gap:10px}#calendar-grid .day{height:82px}#calendar-grid .cal-dots{grid-template-columns:repeat(7,1fr);gap:5px}}
    `;
    document.head.appendChild(style);
  }
  function shiftMonth(delta){ const [y,m]=STATE.calendarCursor.split("-").map(Number); const d=new Date(y,m-1+delta,1); STATE.calendarCursor=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; save(); renderCalendar(); }
  function renderCalendar(){
    ensureCalendarCSS(); const grid=document.getElementById("calendar-grid"); const title=document.getElementById("cal-title"); if(!grid||!title) return;
    const [y,m]=STATE.calendarCursor.split("-").map(Number); const first=new Date(y,m-1,1); title.textContent=first.toLocaleString(undefined,{month:"long",year:"numeric"});
    const startDay=(first.getDay()+6)%7; const daysInMonth=new Date(y,m,0).getDate(); const todayISO=todayStr(); const cells=[];
    for(let i=0;i<startDay;i++) cells.push({blank:true});
    for(let d=1; d<=daysInMonth; d++){ const iso=`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`; const dayTasks=STATE.tasks.filter(t=>t.due===iso); cells.push({date:iso,tasks:dayTasks,isToday:iso===todayISO}); }
    grid.innerHTML=cells.map(c=>{
      if(c.blank) return `<div class="day" aria-disabled="true"></div>`;
      const MAX_DOTS=14; const dots=[]; const tt=[]; const tasks=c.tasks.slice(0,MAX_DOTS);
      for(const t of tasks){ const color=PRIORITY_COLORS[t.priority]||"#7dd3ff"; dots.push(`<span class="cal-dot" style="color:${color};background:${color}" title="${escapeHTML(t.title)}"></span>`); tt.push(`${t.priority} · ${t.title}`); }
      const overflow=c.tasks.length-MAX_DOTS;
      return `<button class="day ${c.isToday?'today':''}" data-date="${c.date}" aria-label="${c.date} has ${c.tasks.length} task(s)" title="${c.tasks.length?tt.join('\n'):'No tasks'}">
        <span class="d-num">${c.date.slice(-2)}</span><div class="cal-dots">${dots.join("")}${overflow>0?`<span class="cal-over" title="+${overflow} more">+${overflow}</span>`:""}</div></button>`;
    }).join("");
    grid.querySelectorAll(".day[data-date]").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const date=btn.dataset.date; const list=STATE.tasks.filter(t=>t.due===date);
        if(list.length===0){ openLightbox(`<div class="muted">No tasks on ${date}</div>`); return; }
        const html=`<h3>${date} · Tasks</h3>` + list.map(renderTaskCard).join(""); openLightbox(html);
        const box=document.getElementById("lightbox");
        if(!box) return;
        box.querySelectorAll(".task .btn-done").forEach(b=>b.addEventListener("click",()=>{ const id=b.closest(".task").dataset.id; completeTask(id); setTimeout(()=>{ renderCalendar(); renderTasks(); },50); }));
        box.querySelectorAll(".task .btn-del").forEach(b=>b.addEventListener("click",()=>{ const id=b.closest(".task").dataset.id; if(confirm("Delete this task?")){ deleteTask(id); renderCalendar(); renderTasks(); } }));
      });
    });
  }
  function generateRecurring(){
    const horizon=new Date(); horizon.setDate(horizon.getDate()+60); const futureIso=horizon.toISOString().slice(0,10);
    const repeats=STATE.tasks.filter(t=>t.type==="repeat"&&t.repeat&&t.start); let created=0;
    for(const base of repeats){
      const start=new Date(base.start+"T00:00:00");
      for(let d=new Date(start); d<=horizon; d.setDate(d.getDate()+base.repeat)){
        const iso=d.toISOString().slice(0,10);
        if(iso<todayStr()||iso>futureIso) continue;
        const already=STATE.tasks.some(t=>t.title===base.title && t.due===iso);
        if(!already){ STATE.tasks.push({...base,id:uid(),due:iso,done:false,createdAt:new Date().toISOString()}); created++; }
      }
    }
    save(); toast(created?`Generated <strong>${created}</strong> task(s)`:`No new recurring tasks found`);
  }

  // ---------- Characters ----------
  function unlockCharacterMaybe(category, xpGained){
    if(!STATE.characters[category]){
      const pick=SESSION_CHAR[category] || {name:`${category} Ally`, image:defaultPortraitForCategory(category), rarity:"R", category};
      STATE.characters[category]={ name:pick.name, rarity:pick.rarity, category, level:1, bond:0, xp:0, xpToNext:100, image:pick.image };
      addActivity(`Found ${pick.name}`,0,"character_found"); toast(`🎉 <strong>Unlocked</strong>: ${pick.name} (<span class="pink">${pick.rarity}</span>)`);
    }
    const ch=STATE.characters[category];
    if(ch){
      ch.xp += Math.floor(xpGained*0.6);
      ch.bond = clamp(ch.bond + Math.floor(xpGained*0.2), 0, 100);
      while(ch.xp >= ch.xpToNext){ ch.xp -= ch.xpToNext; ch.level++; ch.xpToNext=Math.round(ch.xpToNext*1.25); toast(`⬆️ <strong>${ch.name}</strong> reached <span class="yellow">Lv.${ch.level}</span>`); }
      save();
    }
  }
  function renderCharacters(){
    ensureLockedCharCSS(); const grid=document.getElementById("chars-grid"); const empty=document.getElementById("chars-empty"); if(!grid) return;
    const items=CATEGORIES.map(cat=>{
      if(isUnlocked(cat)){
        const ch=STATE.characters[cat]; const imagePath=ch.image||defaultPortraitForCategory(cat);
        return `<div class="char-card"><div class="char-portrait"><img alt="${escapeHTML(ch.name)} portrait" src="${imagePath}" onerror="this.src='${defaultPortraitForCategory(cat)}';"></div>
          <div class="char-body">
            <div class="flex" style="justify-content:space-between"><div><strong>${escapeHTML(ch.name)}</strong> <span class="muted">(${ch.rarity})</span></div><div class="muted">${cat}</div></div>
            <div>Level: <strong>${ch.level}</strong> · Bond: <strong>${ch.bond}%</strong></div>
            <div class="progress" aria-label="XP"><div style="width:${Math.round(ch.xp/ch.xpToNext*100)}%"></div></div>
            <div class="flex"><button class="btn" data-chat="${cat}">Chat</button><button class="btn" data-train="${cat}">Train</button><button class="btn" data-gift="${cat}">Gift</button></div>
          </div></div>`;
      } else {
        const imagePath=placeholderPortraitForCategory(cat);
        return `<div class="char-card locked" data-locked="${cat}">
          <div class="char-portrait"><img alt="${cat} locked placeholder" src="${imagePath}"><div class="lock-overlay">Complete a ${cat} task to unlock</div></div>
          <div class="char-body">
            <div class="flex" style="justify-content:space-between"><div><strong>${cat} Ally</strong> <span class="muted">(Locked)</span></div><div class="muted">${cat}</div></div>
            <div class="muted">No XP yet. Earn XP by completing ${cat} tasks.</div>
            <div class="progress" aria-label="XP"><div style="width:0%"></div></div>
            <div class="flex"><button class="btn" disabled>Chat</button><button class="btn" disabled>Train</button><button class="btn" disabled>Gift</button></div>
          </div></div>`;
      }
    });
    grid.innerHTML=items.join(""); if(empty) empty.style.display="none";
    grid.querySelectorAll("[data-chat]").forEach(b=> b.addEventListener("click",()=>{ const cat=b.getAttribute("data-chat"); const ch=STATE.characters[cat];
      const lines=[`"Stay sharp. Every checkbox is a blade."`,`"Neon nights favor the disciplined."`,`"Your grind fuels our power core."`,`"Focus fire: one task at a time."`];
      openLightbox(`<h3>${escapeHTML(ch.name)} · Chat</h3><p class="muted">${lines[Math.floor(Math.random()*lines.length)]}</p>`); }));
    grid.querySelectorAll("[data-train]").forEach(b=> b.addEventListener("click",()=>{ const cat=b.getAttribute("data-train"); const ch=STATE.characters[cat];
      ch.xp+=20; toast(`🏋️ Trained <strong>${escapeHTML(ch.name)}</strong> (+20 XP)`); while(ch.xp>=ch.xpToNext){ ch.xp-=ch.xpToNext; ch.level++; ch.xpToNext=Math.round(ch.xpToNext*1.25); toast(`⬆️ ${escapeHTML(ch.name)} Lv.${ch.level}`); } save(); renderCharacters(); }));
    grid.querySelectorAll("[data-gift]").forEach(b=> b.addEventListener("click",()=>{ const cat=b.getAttribute("data-gift"); const ch=STATE.characters[cat]; ch.bond=clamp(ch.bond+5,0,100); toast(`🎁 Bond with <strong>${escapeHTML(ch.name)}</strong> +5`); save(); renderCharacters(); }));
  }

  // ---------- Boss ----------
  function renderBoss(){
    const targetEl=document.getElementById("boss-target"); const metaEl=document.getElementById("boss-meta"); const chanceEl=document.getElementById("boss-chance");
    const inner=document.getElementById("party-inner"); const perc=document.getElementById("party-perc");
    const power=STATE.power % STATE.config.bossTarget; const pct=clamp(Math.round(power/STATE.config.bossTarget*100),0,100);
    if(targetEl) targetEl.textContent=STATE.config.bossTarget; if(metaEl) metaEl.textContent=`Power ${power} / ${STATE.config.bossTarget}`;
    if(chanceEl) chanceEl.textContent=`${Math.min(99,Math.max(1,Math.round(pct*0.9)))}%`; if(inner) inner.style.width=`${pct}%`; if(perc) perc.textContent=`${pct}%`;
    const btn=document.getElementById("btn-simulate"); const res=document.getElementById("boss-result");
    if(btn&&res){ btn.onclick=()=>{ const rng=Math.random()*100; const winChance=Math.min(99,Math.max(1,Math.round(pct*0.9))); const win=rng<winChance;
      if(win){ addActivity("Defeated the monthly boss!",0,"boss_win"); toast("🧨 <strong>Boss defeated!</strong>"); res.innerHTML=`<div class="green">Victory! Your team crushed the boss.</div>`; }
      else { addActivity("Lost to the monthly boss…",0,"boss_loss"); res.innerHTML=`<div class="muted">Close! Train up and try again.</div>`; }
      renderSummary(); }; }
    const list=document.getElementById("activity-list"); if(list){ const byKind={}; for(const a of STATE.activity){ byKind[a.kind]=(byKind[a.kind]||0)+1; }
      list.innerHTML=Object.entries(byKind).map(([k,v])=>`<div>${k}: <strong>${v}</strong></div>`).join("") || `<div class="muted">No activity yet.</div>`; }
  }

  // ---------- Config + Import/Export ----------
  function setupConfig(){
    const preset=document.getElementById("xp-preset"); const scale=document.getElementById("xp-scale");
    const target=document.getElementById("boss-target-input"); const apply=document.getElementById("apply-target");
    if(preset){ preset.value=STATE.config.xpPreset; preset.addEventListener("change",()=>{ STATE.config.xpPreset=preset.value;
      if(preset.value==="Aggressive"){ STATE.config.weights.priority={Low:1,Medium:3,High:5}; STATE.config.weights.estHour=2; }
      else if(preset.value==="Gentle"){ STATE.config.weights.priority={Low:1,Medium:2,High:2}; STATE.config.weights.estHour=0.5; }
      else { STATE.config.weights.priority=deepClone(DEFAULT_CONFIG.weights.priority); STATE.config.weights.estHour=1; } save(); }); }
    if(scale){ scale.value=STATE.config.scale; scale.addEventListener("change",()=>{ STATE.config.scale=scale.value; save(); }); }
    if(target){ target.value=STATE.config.bossTarget; }
    if(apply){ apply.addEventListener("click",()=>{ const v=Number(target.value||0); if(v>=10){ STATE.config.bossTarget=v; save(); renderHeaderPower(); renderBoss(); toast("Applied boss target"); } }); }

    // completed-only
    const exportCompletedBtn=document.getElementById("export-completed");
    const importCompletedBtn=document.getElementById("import-completed");
    const importCompletedFile=document.getElementById("import-completed-file");
    if(exportCompletedBtn) exportCompletedBtn.addEventListener("click", exportCompletedTasksJSON);
    if(importCompletedBtn&&importCompletedFile){
      importCompletedBtn.addEventListener("click",()=>importCompletedFile.click());
      importCompletedFile.addEventListener("change",async ()=>{ const file=importCompletedFile.files?.[0]; if(!file) return;
        try{ const text=await file.text(); const parsed=JSON.parse(text); const added=importCompletedTasksFromJSON(parsed);
          toast(`📥 Imported <strong>${added}</strong> completed task(s)`); renderAll();
        }catch(e){ console.error(e); toast(`<span class="danger">Import failed</span>`); } finally { importCompletedFile.value=""; } });
    }

    // full backup
    const exportFullBtn=document.getElementById("export-full");
    const importFullBtn=document.getElementById("import-full");
    const importFullFile=document.getElementById("import-full-file");
    if(exportFullBtn) exportFullBtn.addEventListener("click", exportFullBackupJSON);
    if(importFullBtn&&importFullFile){
      importFullBtn.addEventListener("click",()=>importFullFile.click());
      importFullFile.addEventListener("change",async ()=>{ const file=importFullFile.files?.[0]; if(!file) return;
        try{ const text=await file.text(); const parsed=JSON.parse(text); const replace=confirm("Import FULL backup:\n\nOK = Replace current data\nCancel = Merge with current data");
          const result=importFullBackupFromJSON(parsed,{replace});
          toast(`📥 Full import: ${replace?'replaced':'merged'} (${result.addedTasks} task(s), ${result.charUpdates} character(s), ${result.activityAdded} activity)`); renderAll();
        }catch(e){ console.error(e); toast(`<span class="danger">Full import failed</span>`); } finally { importFullFile.value=""; } });
    }

    // optional diagnostics button if present
    const diag=document.getElementById("diagnose-data");
    if(diag) diag.addEventListener("click",()=>{ const msg=CHAR_SOURCE_INFO.source==="default" ? "Characters: DEFAULT (no JSON/CSV found)" : `Characters: ${CHAR_SOURCE_INFO.source.toUpperCase()} (${CHAR_SOURCE_INFO.path})`; openLightbox(`<h3>Diagnostics</h3><pre>${msg}</pre>`); });
  }

  // Completed-only import/export
  function exportCompletedTasksJSON(){
    const list=STATE.tasks.filter(t=>t.done).map(t=>({id:t.id,title:t.title,category:t.category,priority:t.priority,type:t.type||"oneoff",
      estimate:Number(t.estimate||0),notes:t.notes||"",due:t.due||null,createdAt:t.createdAt||null,completedAt:t.completedAt||t.createdAt||new Date().toISOString()}))
      .sort((a,b)=>(a.completedAt||"").localeCompare(b.completedAt||""));
    downloadJSON({version:"neon-tasks/completed-v1",exportedAt:new Date().toISOString(),items:list},`completed_tasks_${dateStamp()}.json`);
    toast(`📤 Exported <strong>${list.length}</strong> completed task(s)`);
  }
  function importCompletedTasksFromJSON(payload){
    const items=Array.isArray(payload)?payload:(Array.isArray(payload?.items)?payload.items:[]); let added=0;
    const has=new Set(STATE.tasks.filter(t=>t.done).map(t=>`${t.title}__${t.completedAt||t.createdAt||""}`));
    for(const r of items){
      const title=String(r.title||"").trim(); if(!title) continue;
      const completedAt=r.completedAt||r.completed_at||null; const key=`${title}__${completedAt||""}`; if(has.has(key)) continue;
      const t={ id:uid(), title, category:CATEGORIES.includes(r.category)?r.category:"Other", priority:["Low","Medium","High"].includes(r.priority)?r.priority:"Low",
        type:r.type||"oneoff", estimate:Number(r.estimate||0), notes:String(r.notes||""), start:null,end:null,repeat:null, due:r.due||null, done:true,
        createdAt:r.createdAt||completedAt||new Date().toISOString(), completedAt:completedAt||new Date().toISOString() };
      STATE.tasks.push(t); has.add(key); added++;
    }
    save(); return added;
  }

  // Full backup import/export
  function exportFullBackupJSON(){
    const payload={ version:"neon-tasks/full-v1", exportedAt:new Date().toISOString(), state:{
      tasks:STATE.tasks, characters:STATE.characters, config:STATE.config, power:STATE.power, calendarCursor:STATE.calendarCursor,
      meta:STATE.meta, activity:STATE.activity, seedVersion:STATE.seedVersion
    }};
    downloadJSON(payload,`neontasks_backup_${dateStamp()}.json`); toast("📤 Exported FULL backup");
  }
  function importFullBackupFromJSON(payload,{replace}={replace:false}){
    const src=payload?.state||payload; if(!src||typeof src!=="object") throw new Error("Invalid backup file");
    const asArray=x=>Array.isArray(x)?x:[]; const asObject=x=>x&&typeof x==="object"?x:{}; const asNumber=(x,d=0)=>Number.isFinite(Number(x))?Number(x):d; const asString=(x,d="")=>(typeof x==="string"&&x)?x:d;
    if(replace){
      STATE.tasks=asArray(src.tasks); STATE.characters=asObject(src.characters); STATE.config={...deepClone(DEFAULT_CONFIG),...asObject(src.config)};
      STATE.power=asNumber(src.power,0); STATE.calendarCursor=asString(src.calendarCursor,todayStr().slice(0,7));
      STATE.meta={installedAt:Date.now(),completedCount:0,...asObject(src.meta)}; STATE.activity=asArray(src.activity); STATE.seedVersion=asNumber(src.seedVersion,0);
      ACTIVITY=STATE.activity; save(); return {addedTasks:STATE.tasks.length,charUpdates:Object.keys(STATE.characters).length,activityAdded:STATE.activity.length};
    }
    const existingKeys=new Set(STATE.tasks.map(t=>(t.id?`id:${t.id}`:`tk:${t.title}__${t.createdAt||""}`))); let addedTasks=0;
    for(const t of asArray(src.tasks)){
      const key=t.id?`id:${t.id}`:`tk:${t.title}__${t.createdAt||""}`; if(existingKeys.has(key)){
        const loc=STATE.tasks.find(x=>(x.id&&x.id===t.id)||(!x.id&&x.title===t.title&&x.createdAt===t.createdAt));
        if(loc&&t.done&&!loc.done){ loc.done=true; loc.completedAt=t.completedAt||loc.completedAt||new Date().toISOString(); }
        continue;
      }
      STATE.tasks.push(t); existingKeys.add(key); addedTasks++;
    }
    let charUpdates=0; const incomingChars=asObject(src.characters);
    for(const [cat,inc] of Object.entries(incomingChars)){
      const cur=STATE.characters[cat];
      if(!cur){ STATE.characters[cat]=inc; charUpdates++; continue; }
      const merged={ name:cur.name||inc.name, rarity:cur.rarity||inc.rarity, category:cat, level:Math.max(cur.level||1,inc.level||1), bond:Math.max(cur.bond||0,inc.bond||0),
        xp:Math.max(cur.xp||0,inc.xp||0), xpToNext:Math.max(cur.xpToNext||100,inc.xpToNext||100), image:cur.image||inc.image };
      STATE.characters[cat]=merged; charUpdates++;
    }
    STATE.config={...deepClone(DEFAULT_CONFIG),...STATE.config,...asObject(src.config)};
    STATE.power=Math.max(STATE.power||0,asNumber(src.power,0));
    STATE.calendarCursor=STATE.calendarCursor||asString(src.calendarCursor,todayStr().slice(0,7));
    STATE.meta={ installedAt:Math.min(STATE.meta?.installedAt||Date.now(),asNumber(src.meta?.installedAt||Date.now())), completedCount:Math.max(STATE.meta?.completedCount||0,asNumber(src.meta?.completedCount||0)) };
    const actKeys=new Set((STATE.activity||[]).map(a=>`${a.when}__${a.title}`)); let activityAdded=0;
    for(const a of asArray(src.activity)){ const key=`${a.when}__${a.title}`; if(actKeys.has(key)) continue; (STATE.activity ||= []).push(a); actKeys.add(key); activityAdded++; }
    ACTIVITY=STATE.activity; STATE.seedVersion=Math.max(STATE.seedVersion||0,asNumber(src.seedVersion,0)); save();
    return {addedTasks,charUpdates,activityAdded};
  }
  function downloadJSON(obj, filename){ const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

  // ---------- Reset / Seed ----------
  function setupReset(){
    const dlg=document.getElementById("confirm-reset"); const open=document.getElementById("reset-all"); const yes=document.getElementById("reset-confirm-btn"); const no=document.getElementById("reset-cancel-btn"); const seed=document.getElementById("seed-demo");
    if(open){ open.addEventListener("click",()=>dlg?.showModal()); } if(no){ no.addEventListener("click",()=>dlg?.close()); }
    if(yes){ yes.addEventListener("click",()=>{ localStorage.removeItem(LS_KEY); location.reload(); }); }
    if(seed){ seed.addEventListener("click",()=>{ seedDemo(); toast("Seeded demo data"); renderAll(); }); }
  }
  function seedDemo(){
    if(STATE.seedVersion >= 1) return;
    const now=new Date(); const iso=d=>d.toISOString().slice(0,10);
    const t1=new Date(now); t1.setDate(now.getDate()+0);
    const t2=new Date(now); t2.setDate(now.getDate()+1);
    const t3=new Date(now); t3.setDate(now.getDate()+2);
    STATE.tasks.push(
      { id:uid(), title:"Daily stretch", category:"Fitness", priority:"Low", type:"repeat", start:iso(now), end:null, estimate:1, repeat:1, notes:"5 min", due:iso(t1), done:false, createdAt:new Date().toISOString() },
      { id:uid(), title:"Clean apartment", category:"Home", priority:"Medium", type:"oneoff", start:null, end:null, estimate:2, repeat:null, notes:"bathroom focus", due:iso(t2), done:false, createdAt:new Date().toISOString() },
      { id:uid(), title:"Budget review", category:"Finance", priority:"High", type:"oneoff", start:null, end:null, estimate:1, repeat:null, notes:"YNAB sync", due:iso(t3), done:false, createdAt:new Date().toISOString() }
    );
    addActivity("Found Aki — The Crimson Striker",0,"character_found");
    addActivity("Completed: Daily stretch",7,"task_completed");
    addActivity("Found Cinderjaw — The Blue‑Flame Outlaw",0,"character_found");
    STATE.seedVersion=1; save();
  }

})();
