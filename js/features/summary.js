import { STATE } from '../core/state.js';
import { CATEGORIES } from '../core/config.js';
import { escapeHTML, ellipsize, fmtDate } from '../core/utils.js';

export function renderAll() {
  renderSummary();
  // Call renderTasks, renderCalendar, etc. from other modules here if needed
}

export function renderSummary() {
  const section = document.getElementById("view-summary");
  const grid = document.getElementById("summary-grid");

  const cats = CATEGORIES.filter(c => c !== "Other");
  grid.innerHTML = cats.map(cat => {
    const unlocked = STATE.characters[cat];
    return `
      <button class="tile ${unlocked ? "" : "locked"}" data-cat="${cat}" aria-label="${cat}">
        <img alt="" src="${unlocked?.image || 'placeholder.png'}">
        <div class="label">${cat}</div>
      </button>`;
  }).join("");

  // Render activity
  const recent = STATE.activity.slice(0, 3);
  const act = document.getElementById("summary-activity");
  if (act) {
    act.innerHTML = `
      <div class="group-head">
        <strong>Recent activity</strong>
        <span class="muted">${recent.length ? "" : "No recent actions yet"}</span>
      </div>
      <div class="activity-list">
        ${recent.map(e => {
          const when = fmtDate(e.when.slice(0, 10));
          return `<div class="activity-row">
            <span class="a-icn">•</span>
            <span class="a-text">${escapeHTML(ellipsize(e.title, 48))}</span>
            <time class="a-date">${when}</time>
          </div>`;
        }).join("")}
      </div>`;
  }
}
