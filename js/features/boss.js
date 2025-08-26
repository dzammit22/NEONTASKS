import { STATE, save, ACTIVITY } from '../core/state.js';
import { clamp } from '../core/utils.js';
import { toast } from '../ui/toast.js';

export function renderBoss() {
  const targetEl = document.getElementById("boss-target");
  const metaEl = document.getElementById("boss-meta");
  const chanceEl = document.getElementById("boss-chance");
  const inner = document.getElementById("party-inner");
  const perc = document.getElementById("party-perc");
  
  const power = STATE.power % STATE.config.bossTarget;
  const pct = clamp(Math.round(power / STATE.config.bossTarget * 100), 0, 100);
  
  if (targetEl) targetEl.textContent = STATE.config.bossTarget;
  if (metaEl) metaEl.textContent = `Power ${power} / ${STATE.config.bossTarget}`;
  if (chanceEl) chanceEl.textContent = `${Math.min(99, Math.max(1, Math.round(pct * 0.9)))}%`;
  if (inner) inner.style.width = `${pct}%`;
  if (perc) perc.textContent = `${pct}%`;

  const btn = document.getElementById("btn-simulate");
  const res = document.getElementById("boss-result");
  
  if (btn && res) {
    btn.onclick = () => {
      const rng = Math.random() * 100;
      const winChance = Math.min(99, Math.max(1, Math.round(pct * 0.9)));
      const win = rng < winChance;
      
      if (win) {
        addActivity("Defeated the monthly boss!", 0, "boss_win");
        toast("🧨 <strong>Boss defeated!</strong>");
        res.innerHTML = `<div class="green">Victory! Your team crushed the boss.</div>`;
      } else {
        addActivity("Lost to the monthly boss…", 0, "boss_loss");
        res.innerHTML = `<div class="muted">Close! Train up and try again.</div>`;
      }
      
      // Re-render summary to update activity
      import('./summary.js').then(({ renderSummary }) => {
        renderSummary();
      });
    };
  }

  // Activity breakdown
  const list = document.getElementById("activity-list");
  if (list) {
    const byKind = {};
    for (const a of STATE.activity) {
      byKind[a.kind] = (byKind[a.kind] || 0) + 1;
    }
    list.innerHTML = Object.entries(byKind).map(([k, v]) => 
      `<div>${k}: <strong>${v}</strong></div>`
    ).join("") || `<div class="muted">No activity yet.</div>`;
  }
}

function addActivity(title, xp = 0, kind = "generic") {
  const entry = { when: new Date().toISOString(), title, xp, kind };
  ACTIVITY.unshift(entry);
  // Keep only last 100 activities
  const trimmed = ACTIVITY.slice(0, 100);
  STATE.activity = trimmed;
  save();
}
