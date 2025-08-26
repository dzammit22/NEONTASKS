import { STATE, save } from '../core/state.js';
import { CATEGORIES, PRIORITY_COLORS } from '../core/config.js';
import { todayStr, escapeHTML, fmtDate, uid } from '../core/utils.js';
import { openLightbox } from '../ui/lightbox.js';
import { toast } from '../ui/toast.js';

export function setupCalendar() {
  document.getElementById("cal-prev")?.addEventListener("click", () => shiftMonth(-1));
  document.getElementById("cal-next")?.addEventListener("click", () => shiftMonth(1));
  document.getElementById("cal-today")?.addEventListener("click", () => {
    STATE.calendarCursor = todayStr().slice(0, 7);
    save();
    renderCalendar();
  });
  document.getElementById("cal-generate")?.addEventListener("click", () => {
    generateRecurring();
    renderCalendar();
  });
}

function shiftMonth(delta) {
  const [y, m] = STATE.calendarCursor.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  STATE.calendarCursor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  save();
  renderCalendar();
}

export function renderCalendar() {
  ensureCalendarCSS();
  const grid = document.getElementById("calendar-grid");
  const title = document.getElementById("cal-title");
  if (!grid || !title) return;

  const [y, m] = STATE.calendarCursor.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  title.textContent = first.toLocaleString(undefined, { month: "long", year: "numeric" });

  const startDay = (first.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(y, m, 0).getDate();

  const todayISO = todayStr();
  const cells = [];
  
  // Empty cells for days before month start
  for (let i = 0; i < startDay; i++) cells.push({ blank: true });
  
  // Days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayTasks = STATE.tasks.filter(t => t.due === iso);
    cells.push({ date: iso, tasks: dayTasks, isToday: iso === todayISO });
  }

  grid.innerHTML = cells.map(c => {
    if (c.blank) return `<div class="day" aria-disabled="true"></div>`;
    
    const MAX_DOTS = 14;
    const dots = [];
    const taskTitles = [];
    const tasks = c.tasks.slice(0, MAX_DOTS);
    
    for (const t of tasks) {
      const color = PRIORITY_COLORS[t.priority] || "#7dd3ff";
      dots.push(`<span class="cal-dot" style="color:${color};background:${color}" title="${escapeHTML(t.title)}"></span>`);
      taskTitles.push(`${t.priority} · ${t.title}`);
    }
    
    const overflow = c.tasks.length - MAX_DOTS;
    
    return `<button class="day ${c.isToday ? 'today' : ''}" data-date="${c.date}"
              aria-label="${c.date} has ${c.tasks.length} task(s)"
              title="${c.tasks.length ? taskTitles.join('\n') : 'No tasks'}">
      <span class="d-num">${c.date.slice(-2)}</span>
      <div class="cal-dots">
        ${dots.join("")}
        ${overflow > 0 ? `<span class="cal-over" title="+${overflow} more">+${overflow}</span>` : ""}
      </div>
    </button>`;
  }).join("");

  // Add click handlers for calendar days
  grid.querySelectorAll(".day[data-date]").forEach(btn => {
    btn.addEventListener("click", () => {
      const date = btn.dataset.date;
      const list = STATE.tasks.filter(t => t.due === date);
      
      if (list.length === 0) {
        openLightbox(`<div class="muted">No tasks on ${date}</div>`);
        return;
      }
      
      const html = `<h3>${date} · Tasks</h3>` + list.map(renderTaskCardForLightbox).join("");
      openLightbox(html);
      
      // Add handlers for task actions in lightbox
      const box = document.getElementById("lightbox");
      if (!box) return;
      
      box.querySelectorAll(".task .btn-done").forEach(b => {
        b.addEventListener("click", () => {
          const id = b.closest(".task").dataset.id;
          import('./tasks.js').then(({ completeTask }) => {
            completeTask(id);
            setTimeout(() => {
              renderCalendar();
              import('./tasks.js').then(({ renderTasks }) => {
                renderTasks();
              });
            }, 50);
          });
        });
      });
      
      box.querySelectorAll(".task .btn-del").forEach(b => {
        b.addEventListener("click", () => {
          const id = b.closest(".task").dataset.id;
          if (confirm("Delete this task?")) {
            import('./tasks.js').then(({ deleteTask }) => {
              deleteTask(id);
              renderCalendar();
              import('./tasks.js').then(({ renderTasks }) => {
                renderTasks();
              });
            });
          }
        });
      });
    });
  });
}

function renderTaskCardForLightbox(t) {
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
  </div>`;
}

function generateRecurring() {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 60);
  const futureIso = horizon.toISOString().slice(0, 10);
  const repeats = STATE.tasks.filter(t => t.type === "repeat" && t.repeat && t.start);
  let created = 0;
  
  for (const base of repeats) {
    const start = new Date(base.start + "T00:00:00");
    for (let d = new Date(start); d <= horizon; d.setDate(d.getDate() + base.repeat)) {
      const iso = d.toISOString().slice(0, 10);
      if (iso < todayStr() || iso > futureIso) continue;
      
      const already = STATE.tasks.some(t => t.title === base.title && t.due === iso);
      if (!already) {
        STATE.tasks.push({
          ...base,
          id: uid(),
          due: iso,
          done: false,
          createdAt: new Date().toISOString()
        });
        created++;
      }
    }
  }
  
  save();
  toast(created ? `Generated <strong>${created}</strong> task(s)` : `No new recurring tasks found`);
}

function ensureCalendarCSS() {
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
