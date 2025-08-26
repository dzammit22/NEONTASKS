import { STATE, save } from '../core/state.js';
import { uid, todayStr, escapeHTML, fmtDate } from '../core/utils.js';
import { PRIORITY_COLORS, CATEGORIES } from '../core/config.js';

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

  const filtered = STATE.tasks.filter(t => {
    if (cat !== "All" && t.category !== cat) return false;
    if (search && ![t.title, t.notes || ""].some(f => f.toLowerCase().includes(search))) return false;
    if (scope === "today") return t.due === todayISO;
    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    if (sort === "priority") return priorityScore(b.priority) - priorityScore(a.priority);
    if (sort === "due") return (a.due || "").localeCompare(b.due || "");
    return (a.createdAt || "").localeCompare(b.createdAt || "");
  });

  if (!filtered.length) {
    el.innerHTML = `<div class="card muted">No tasks match your filters.</div>`;
    return;
  }

  // Group by due date
  const groups = {};
  for (const t of filtered) {
    const key = t.due || "No date";
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }

  el.innerHTML = Object.entries(groups).map(([k, arr]) => {
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
        <span class="pill">Due: ${fmtDate(t.due)}</span>
      </div>
      ${t.notes ? `<div class="notes">${escapeHTML(t.notes)}</div>` : ""}
    </div>
    <div class="actions">
      <button class="btn btn-done">Done</button>
      <button class="btn btn-del">Delete</button>
    </div>
  </div>`;
}

function priorityScore(p) {
  return STATE.config.weights.priority[p] ?? 1;
}
