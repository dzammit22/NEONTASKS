import { STATE, save } from '../core/state.js';
import { CATEGORIES, PRIORITY_COLORS } from '../core/config.js';
import { todayStr, escapeHTML } from '../core/utils.js';

export function setupCalendar() {
  document.getElementById("cal-prev")?.addEventListener("click", () => shiftMonth(-1));
  document.getElementById("cal-next")?.addEventListener("click", () => shiftMonth(1));
  document.getElementById("cal-today")?.addEventListener("click", () => {
    STATE.calendarCursor = todayStr().slice(0, 7);
    save();
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
  const grid = document.getElementById("calendar-grid");
  const title = document.getElementById("cal-title");
  if (!grid || !title) return;

  const [y, m] = STATE.calendarCursor.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const startDay = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();

  const todayISO = todayStr();
  title.textContent = first.toLocaleString(undefined, { month: "long", year: "numeric" });

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const tasks = STATE.tasks.filter(t => t.due === iso);
    cells.push({ date: iso, tasks, isToday: iso === todayISO });
  }

  grid.innerHTML = cells.map(c => {
    if (!c) return `<div class="day" aria-disabled="true"></div>`;
    const dots = c.tasks.slice(0, 8).map(t => {
      const color = PRIORITY_COLORS[t.priority] || "#8ef";
      return `<span class="cal-dot" style="background:${color}" title="${escapeHTML(t.title)}"></span>`;
    }).join("");
    return `
      <div class="day${c.isToday ? " today" : ""}">
        <div class="d-num">${new Date(c.date).getDate()}</div>
        <div class="cal-dots">${dots}</div>
      </div>`;
  }).join("");
}
