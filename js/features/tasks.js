import { STATE, save, ACTIVITY } from '../core/state.js';
import { uid, todayStr, escapeHTML, fmtDate, clamp } from '../core/utils.js';
import { PRIORITY_COLORS, CATEGORIES } from '../core/config.js';
import { toast } from '../ui/toast.js';
import { unlockCharacterMaybe } from './characters.js';

export function setupTaskToolbar() {
  const s = document.getElementById("task-search");
  const sort = document.getElementById("task-sort");

  if (s) s.addEventListener("input", renderTasks);
  if (sort) sort.addEventListener("change", renderTasks);

  const chips = document.querySelectorAll(".toolbar .chip[data-scope]");
  chips.forEach(ch =>
    ch.addEventListener("click", () => {
      chips.forEach(c => c.setAttribute("aria-pressed", "false"));
      ch.setAttribute("aria-pressed", "true");
      renderTasks();
    })
  );

  const wrap = document.getElementById("task-categories");
  if (wrap) {
    wrap.innerHTML = ['All', ...CATEGORIES].map(c =>
      `<button class="chip" data-cat="${c}" aria-pressed="${c === 'All'}">${c}</button>`
    ).join("");
    wrap.querySelectorAll(".chip").forEach(btn =>
      btn.addEventListener("click", () => {
        wrap.querySelectorAll(".chip").forEach(b => b.setAttribute("aria-pressed", "false"));
        btn.setAttribute("aria-pressed", "true");
        renderTasks();
      })
    );
  }
}

export function renderTasks() {
  const el = document.getElementById("task-groups");
  if (!el) return;

  const search = (document.getElementById("task-search")?.value || "").toLowerCase();
  const sort = document.getElementById("task-sort")?.value || "priority";
  const scope = document.querySelector('.toolbar .chip[aria-pressed="true"][data-scope]')?.dataset.scope || "today";
  const cat = document.querySelector('#task-categories .chip[aria-pressed="true"]')?.dataset.cat || "All";

  const now = new Date();
  const todayISO = todayStr();
  const startOfWeek = getStartOfWeek(now);
  const endOfWeek = getEndOfWeek(now);

  const filtered = STATE.tasks.filter(t => {
    if (cat !== "All" && t.category !== cat) return false;
    if (search && ![t.title, t.notes || ""].some(f => f.toLowerCase().includes(search))) return false;
    
    if (scope === "today") return t.due === todayISO || !t.due;
    if (scope === "week") return t.due ? isInRange(t.due, startOfWeek, endOfWeek) : true;
    return true;
  });

  // Update stats
  const doneCount = STATE.tasks.filter(t => t.done).length;
  const todayCount = STATE.tasks.filter(t => t.due === todayISO && !t.done).length;
  const statDone = document.getElementById("stat-done");
  const statToday = document.getElementById("stat-today");
  const statTotal = document.getElementById("stat-total");
  
  if (statDone) statDone.textContent = `Done: ${doneCount}`;
  if (statToday) statToday.textContent = `Due Today: ${todayCount}`;
  if (statTotal) statTotal.textContent = `Total: ${STATE.tasks.length}`;

  // Sorting
  filtered.sort((a, b) => {
    if (sort === "priority") return priorityScore(b.priority) - priorityScore(a.priority);
    if (sort === "due") return (a.due || "9999").localeCompare(b.due || "9999");
    return (a.createdAt || "").localeCompare(b.createdAt || "");
  });

  if (!filtered.length) {
    el.innerHTML = `<div class="card muted">No tasks match your filters.</div>`;
    return;
  }

  // Group by due date
  const groups = new Map();
  for (const t of filtered) {
    const key = t.due || "No date";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }

  el.innerHTML = [...groups.entries()].map(([k, arr]) => {
    const label = k === "No date" ? "No date" : `${fmtDate(k)} (${k})`;
    return `<div class="group card">
      <div class="group-head">
        <strong>${label}</strong>
        <span class="muted">${arr.length} task(s)</span>
      </div>
      <div class="group-body">
        ${arr.map(renderTaskCard).join("")}
      </div>
    </div>`;
  }).join("");

  // Add event handlers
  el.querySelectorAll(".task").forEach(card => {
    const completeBtn = card.querySelector(".btn-done");
    const deleteBtn = card.querySelector(".btn-del");
    
    if (completeBtn) {
      completeBtn.addEventListener("click", () => {
        completeTask(card.dataset.id);
        card.classList.add("zap");
        setTimeout(() => renderTasks(), 620);
      });
    }
    
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        if (confirm("Delete this task?")) {
          deleteTask(card.dataset.id);
          renderTasks();
          
          // Re-render calendar if available
          import('./calendar.js').then(({ renderCalendar }) => {
            renderCalendar();
          }).catch(() => {});
        }
      });
    }

    // Mobile swipe support
    let startX = 0, endX = 0;
    card.addEventListener("touchstart", e => {
      startX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    card.addEventListener("touchend", e => {
      endX = e.changedTouches[0].screenX;
      const deltaX = endX - startX;
      
      if (deltaX > 60) {
        completeTask(card.dataset.id);
        card.classList.add("zap");
        setTimeout(() => renderTasks(), 620);
      } else if (deltaX < -60) {
        if (confirm("Delete this task?")) {
          deleteTask(card.dataset.id);
          renderTasks();
        }
      }
    }, { passive: true });
  });
}

function renderTaskCard(t) {
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
        ${t.type !== "oneoff" ? `<span class="pill">${t.type}</span>` : ""}
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

export function completeTask(id) {
  const t = STATE.tasks.find(x => x.id === id);
  if (!t || t.done) return;
  
  t.done = true;
  t.completedAt = new Date().toISOString();
  STATE.meta.completedCount++;
  
  const xp = computeTaskXP(t);
  addPower(xp);
  addActivity(`Completed: ${t.title}`, xp, "task_completed");
  unlockCharacterMaybe(t.category, xp);
  
  toast(`⚡ <strong>Completed</strong>: ${escapeHTML(t.title)} <span class="muted">(+${xp} XP)</span>`);
  save();
  
  // Re-render other components
  import('./characters.js').then(({ renderCharacters }) => {
    renderCharacters();
  }).catch(() => {});
  
  import('./boss.js').then(({ renderBoss }) => {
    renderBoss();
  }).catch(() => {});
  
  import('./calendar.js').then(({ renderCalendar }) => {
    renderCalendar();
  }).catch(() => {});
  
  import('./summary.js').then(({ renderSummary }) => {
    renderSummary();
  }).catch(() => {});
}

export function deleteTask(id) {
  STATE.tasks = STATE.tasks.filter(x => x.id !== id);
  save();
}

function priorityScore(p) {
  return STATE.config.weights.priority[p] ?? 1;
}

function computeTaskXP(t) {
  const pr = priorityScore(t.priority);
  const est = Number(t.estimate || 0);
  const streak = STATE.config.weights.streak;
  let base = pr * 10 + est * STATE.config.weights.estHour * 5;
  
  switch (STATE.config.scale) {
    case "Square root": base = Math.sqrt(base) * 12; break;
    case "Log": base = Math.log10(base + 1) * 24; break;
  }
  
  const streakLevel = (STATE.meta.completedCount % 7);
  base += streak * streakLevel * 2;
  return Math.max(1, Math.round(base));
}

function addPower(xp) {
  STATE.power += xp;
  save();
  renderHeaderPower();
}

function renderHeaderPower() {
  const pctEl = document.getElementById("power-perc");
  const bar = document.getElementById("powerbar-inner");
  if (!pctEl || !bar) return;
  
  const pct = clamp(Math.round((STATE.power % STATE.config.bossTarget) / STATE.config.bossTarget * 100), 0, 100);
  pctEl.textContent = `${pct}%`;
  bar.style.width = `${pct}%`;
}

function addActivity(title, xp = 0, kind = "generic") {
  const entry = { when: new Date().toISOString(), title, xp, kind };
  ACTIVITY.unshift(entry);
  STATE.activity = ACTIVITY.slice(0, 100);
  save();
}

// Date utility functions
function getStartOfWeek(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = (day + 6) % 7;
  dt.setDate(dt.getDate() - diff);
  return dt;
}

function getEndOfWeek(d) {
  const s = getStartOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  return e;
}

function isInRange(dateIso, a, b) {
  const d = new Date(dateIso + "T00:00:00");
  return d >= new Date(a) && d <= new Date(b);
}
