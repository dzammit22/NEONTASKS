import { initTabs } from './ui/tabs.js';
import { setupAddDialog } from './ui/dialogs.js'; // Note: your file is dialog.js but import says dialogs.js
import { setupTaskToolbar, renderTasks } from './features/tasks.js';
import { setupCalendar, renderCalendar } from './features/calendar.js';
import { setupConfig, setupReset } from './features/config.js'; // Missing setupConfig import
import { renderSummary } from './features/summary.js';
import { renderCharacters } from './features/characters.js'; // Missing import
import { renderBoss } from './features/boss.js'; // Missing import
import { loadCharactersFromCSV, makeSessionCharacters } from './features/characters.js';
import { save, STATE } from './core/state.js';
import { CATEGORIES } from './core/config.js';
import { uid, todayStr } from './core/utils.js';

// Global variables that need to be accessible
let CHAR_POOL = {};
let SESSION_CHAR = {};

// Make them globally accessible for debugging
window.CHAR_POOL = CHAR_POOL;
window.SESSION_CHAR = SESSION_CHAR;

document.addEventListener('DOMContentLoaded', async () => {
  // Setup all modules
  initTabs(); // Note: your tabs.js exports setupTabs but main.js calls initTabs
  setupAddDialog();
  setupTaskToolbar();
  setupCalendar();
  setupConfig(); // Missing from your main.js
  setupReset();
  
  // Setup quick create form
  setupQuickCreate();

  // Load characters
  CHAR_POOL = await loadCharactersFromCSV();
  SESSION_CHAR = makeSessionCharacters(CHAR_POOL);
  
  // Update global references
  window.CHAR_POOL = CHAR_POOL;
  window.SESSION_CHAR = SESSION_CHAR;

  renderAll();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
});

// Quick create form handler - missing from modular version
function setupQuickCreate() {
  document.addEventListener("submit", (e) => {
    if (e.target && e.target.id === "quick-form") {
      e.preventDefault();
      const t = {
        id: uid(),
        title: document.getElementById("q-title").value.trim(),
        due: document.getElementById("q-due").value || null,
        priority: document.getElementById("q-priority").value,
        category: document.getElementById("q-category").value,
        notes: document.getElementById("q-notes").value.trim(),
        type: "oneoff",
        start: null,
        end: null,
        repeat: null,
        estimate: 1,
        done: false,
        createdAt: new Date().toISOString()
      };
      
      if (!t.title) {
        document.getElementById("q-title").reportValidity();
        return;
      }
      
      STATE.tasks.push(t);
      save();
      
      // Import toast function
      import('./ui/toast.js').then(({ toast }) => {
        toast(`<strong class="cyan">Task created</strong>: ${escapeHTML(t.title)}`);
      });
      
      e.target.reset();
      renderAll();
    }
  });

  // Populate category dropdown
  const qCat = document.getElementById("q-category");
  if (qCat) {
    qCat.innerHTML = CATEGORIES.map(c => `<option>${c}</option>`).join("");
  }
}

// Centralized render function
function renderAll() {
  renderSummary();
  renderTasks();
  renderCalendar();
  renderCharacters();
  renderBoss();
  renderHeaderPower();
}

// Header power bar rendering - missing from modular version
function renderHeaderPower() {
  const pctEl = document.getElementById("power-perc");
  const bar = document.getElementById("powerbar-inner");
  if (!pctEl || !bar) return;
  
  const pct = Math.min(100, Math.round((STATE.power % STATE.config.bossTarget) / STATE.config.bossTarget * 100));
  pctEl.textContent = `${pct}%`;
  bar.style.width = `${pct}%`;
}

// Export utilities that other modules might need
export { renderAll, CHAR_POOL, SESSION_CHAR };
