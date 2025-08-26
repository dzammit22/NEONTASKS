import { renderTasks } from '../features/tasks.js';
import { renderCalendar } from '../features/calendar.js';
import { renderSummary } from '../features/summary.js';

export function setupTabs() {
  const tabs = document.querySelectorAll(".tabs .tab");
  const views = document.querySelectorAll("main > section");

  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(t => t.setAttribute("aria-selected", "false"));
      btn.setAttribute("aria-selected", "true");

      const id = btn.dataset.tab;
      views.forEach(view => view.hidden = !view.id.endsWith(id));

      // Call appropriate render
      if (id === "summary") renderSummary();
      if (id === "tasks") renderTasks();
      if (id === "calendar") renderCalendar();
    });
  });
}
