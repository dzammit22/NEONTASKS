import { initTabs } from './ui/tabs.js';
import { setupAddDialog } from './ui/dialogs.js';
import { setupTaskToolbar } from './features/tasks.js';
import { setupCalendar } from './features/calendar.js';
import { setupReset } from './features/config.js';
import { renderAll } from './features/summary.js';
import { loadCharactersFromCSV, makeSessionCharacters } from './features/characters.js';
import { save, STATE } from './core/state.js';

document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupAddDialog();
  setupTaskToolbar();
  setupCalendar();
  setupReset();

  CHAR_POOL = await loadCharactersFromCSV();
  SESSION_CHAR = makeSessionCharacters(CHAR_POOL);
  
  renderAll();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
});
