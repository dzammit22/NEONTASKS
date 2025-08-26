import { STATE, save, ACTIVITY, LS_KEY } from '../core/state.js';
import { DEFAULT_CONFIG, CATEGORIES } from '../core/config.js';
import { deepClone, uid, todayStr } from '../core/utils.js';
import { toast } from '../ui/toast.js';

export function setupConfig() {
  const preset = document.getElementById("xp-preset");
  const scale = document.getElementById("xp-scale");
  const target = document.getElementById("boss-target-input");
  const apply = document.getElementById("apply-target");
  
  if (preset) { 
    preset.value = STATE.config.xpPreset; 
    preset.addEventListener("change", () => {
      STATE.config.xpPreset = preset.value;
      if (preset.value === "Aggressive") {
        STATE.config.weights.priority = { Low: 1, Medium: 3, High: 5 };
        STATE.config.weights.estHour = 2;
      } else if (preset.value === "Gentle") {
        STATE.config.weights.priority = { Low: 1, Medium: 2, High: 2 };
        STATE.config.weights.estHour = 0.5;
      } else {
        STATE.config.weights.priority = deepClone(DEFAULT_CONFIG.weights.priority);
        STATE.config.weights.estHour = 1;
      }
      save();
    });
  }
  
  if (scale) { 
    scale.value = STATE.config.scale; 
    scale.addEventListener("change", () => {
      STATE.config.scale = scale.value;
      save();
    }); 
  }
  
  if (target) target.value = STATE.config.bossTarget;
  
  if (apply) { 
    apply.addEventListener("click", () => { 
      const v = Number(target.value || 0); 
      if (v >= 10) { 
        STATE.config.bossTarget = v; 
        save();
        
        // Re-render header power and boss
        import('../main.js').then(({ renderAll }) => {
          renderAll();
        }).catch(() => {
          // Fallback if import fails
          const powerEl = document.getElementById("power-perc");
          const barEl = document.getElementById("powerbar-inner");
          if (powerEl && barEl) {
            const pct = Math.min(100, Math.round((STATE.power % STATE.config.bossTarget) / STATE.config.bossTarget * 100));
            powerEl.textContent = `${pct}%`;
            barEl.style.width = `${pct}%`;
          }
        });
        
        toast("Applied boss target"); 
      } 
    }); 
  }

  // Import/Export setup
  setupImportExport();
}

export function setupReset() {
  const dlg = document.getElementById("confirm-reset");
  const open = document.getElementById("reset-all");
  const yes = document.getElementById("reset-confirm-btn");
  const no = document.getElementById("reset-cancel-btn");
  const seed = document.getElementById("seed-demo");
  
  if (open) open.addEventListener("click", () => dlg?.showModal());
  if (no) no.addEventListener("click", () => dlg?.close());
  if (yes) {
    yes.addEventListener("click", () => {
      localStorage.removeItem(LS_KEY);
      location.reload();
    });
  }
  if (seed) {
    seed.addEventListener("click", () => {
      seedDemo();
      toast("Seeded demo data");
      // Re-render everything
      import('../main.js').then(({ renderAll }) => {
        renderAll();
      });
    });
  }
}

function setupImportExport() {
  const exportBtn = document.getElementById("export-completed");
  const importBtn = document.getElementById("import-completed");
  const importFile = document.getElementById("import-completed-file");
  
  if (exportBtn) {
    exportBtn.textContent = "Export Full Backup";
    exportBtn.addEventListener("click", exportFullBackup);
  }
  
  if (importBtn && importFile) {
    importBtn.textContent = "Import Full Backup";
    
    importBtn.addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", async () => {
      const file = importFile.files?.[0];
      if (!file) return;
      
      const confirmed = confirm(
        "⚠️ FULL BACKUP IMPORT ⚠️\n\n" +
        "This will COMPLETELY REPLACE all your current data including:\n" +
        "• All tasks (completed and pending)\n" +
        "• All unlocked characters and their levels\n" +
        "• All power and XP\n" +
        "• All settings and configuration\n" +
        "• All activity history\n\n" +
        "Are you sure you want to proceed?\n\n" +
        "(Consider exporting your current data first as a backup)"
      );
      
      if (!confirmed) {
        importFile.value = "";
        return;
      }
      
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        
        if (parsed.version && parsed.version.includes('neon-tasks-full-backup')) {
          importFullBackup(parsed);
          toast(`📥 <strong>Full backup imported successfully!</strong>`);
        } else if (parsed.version && parsed.version.includes('neon-tasks/v1')) {
          const added = importCompletedTasksFromJSON(parsed);
          toast(`📥 Imported <strong>${added}</strong> completed task(s) (legacy format)`);
        } else if (Array.isArray(parsed)) {
          const added = importCompletedTasksFromJSON(parsed);
          toast(`📥 Imported <strong>${added}</strong> completed task(s)`);
        } else {
          throw new Error("Unrecognized backup format");
        }
        
        // Re-render everything
        import('../main.js').then(({ renderAll }) => {
          renderAll();
        });
        
      } catch (e) {
        console.error("Import error:", e);
        toast(`<span class="danger">Import failed: ${e.message}</span>`);
      } finally {
        importFile.value = "";
      }
    });
  }
}

function exportFullBackup() {
  const fullBackup = {
    version: "neon-tasks-full-backup/v1",
    exportedAt: new Date().toISOString(),
    appVersion: "0.11",
    data: {
      tasks: STATE.tasks || [],
      characters: STATE.characters || {},
      config: STATE.config || deepClone(DEFAULT_CONFIG),
      power: STATE.power || 0,
      calendarCursor: STATE.calendarCursor || todayStr().slice(0, 7),
      seedVersion: STATE.seedVersion || 0,
      meta: STATE.meta || { installedAt: Date.now(), completedCount: 0 },
      activity: STATE.activity || [],
      exportMeta: {
        totalTasks: STATE.tasks?.length || 0,
        completedTasks: STATE.tasks?.filter(t => t.done)?.length || 0,
        unlockedCharacters: Object.keys(STATE.characters || {}).length,
        totalPower: STATE.power || 0,
        lastActivity: STATE.activity?.[0]?.when || null
      }
    }
  };

  const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  a.href = url;
  a.download = `neontasks-backup-${timestamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  
  const stats = fullBackup.data.exportMeta;
  toast(`📤 <strong>Full backup exported</strong><br>
    ${stats.totalTasks} tasks, ${stats.unlockedCharacters} characters, ${stats.totalPower} power`);
}

function importFullBackup(backupData) {
  try {
    if (!backupData || typeof backupData !== 'object') {
      throw new Error("Invalid backup format - not a valid object");
    }
    
    if (!backupData.version || !backupData.version.includes('neon-tasks')) {
      throw new Error("Invalid backup format - missing or incorrect version");
    }
    
    if (!backupData.data) {
      throw new Error("Invalid backup format - no data section found");
    }
    
    const data = backupData.data;
    
    // Import tasks
    if (Array.isArray(data.tasks)) {
      STATE.tasks = data.tasks.map(task => ({
        id: task.id || uid(),
        title: task.title || "Imported Task",
        category: CATEGORIES.includes(task.category) ? task.category : "Other",
        priority: ["Low", "Medium", "High"].includes(task.priority) ? task.priority : "Medium",
        type: task.type || "oneoff",
        start: task.start || null,
        end: task.end || null,
        estimate: Number(task.estimate) || 0,
        repeat: task.repeat || null,
        notes: task.notes || "",
        due: task.due || null,
        done: Boolean(task.done),
        createdAt: task.createdAt || new Date().toISOString(),
        completedAt: task.completedAt || null
      }));
    } else {
      STATE.tasks = [];
    }
    
    // Import characters
    if (data.characters && typeof data.characters === 'object') {
      STATE.characters = {};
      for (const [category, charData] of Object.entries(data.characters)) {
        if (CATEGORIES.includes(category) && charData) {
          STATE.characters[category] = {
            name: charData.name || `${category} Ally`,
            rarity: charData.rarity || "R",
            category: category,
            level: Math.max(1, Number(charData.level) || 1),
            bond: Math.max(0, Math.min(100, Number(charData.bond) || 0)),
            xp: Math.max(0, Number(charData.xp) || 0),
            xpToNext: Math.max(100, Number(charData.xpToNext) || 100),
            image: charData.image || defaultPortraitForCategory(category)
          };
        }
      }
    } else {
      STATE.characters = {};
    }
    
    // Import other data
    STATE.power = Math.max(0, Number(data.power) || 0);
    STATE.calendarCursor = data.calendarCursor || todayStr().slice(0, 7);
    STATE.seedVersion = Number(data.seedVersion) || 0;
    
    if (data.config && typeof data.config === 'object') {
      STATE.config = {
        xpPreset: data.config.xpPreset || "Default",
        scale: data.config.scale || "Linear",
        bossTarget: Math.max(10, Number(data.config.bossTarget) || 300),
        weights: {
          priority: {
            Low: Number(data.config.weights?.priority?.Low) || 1,
            Medium: Number(data.config.weights?.priority?.Medium) || 2,
            High: Number(data.config.weights?.priority?.High) || 3
          },
          estHour: Number(data.config.weights?.estHour) || 1,
          streak: Number(data.config.weights?.streak) || 0.5
        }
      };
    } else {
      STATE.config = deepClone(DEFAULT_CONFIG);
    }
    
    if (data.meta && typeof data.meta === 'object') {
      STATE.meta = {
        installedAt: data.meta.installedAt || Date.now(),
        completedCount: Math.max(0, Number(data.meta.completedCount) || 0)
      };
    } else {
      STATE.meta = { installedAt: Date.now(), completedCount: 0 };
    }
    
    // Import activity
    if (Array.isArray(data.activity)) {
      STATE.activity = data.activity.map(act => ({
        when: act.when || new Date().toISOString(),
        title: act.title || "Imported Activity",
        xp: Number(act.xp) || 0,
        kind: act.kind || "generic"
      })).slice(0, 100);
      
      // Update the global ACTIVITY reference
      ACTIVITY.length = 0;
      ACTIVITY.push(...STATE.activity);
    } else {
      STATE.activity = [];
      ACTIVITY.length = 0;
    }
    
    save();
    
  } catch (error) {
    console.error("Full backup import failed:", error);
    toast(`<span class="danger">Import failed: ${error.message}</span>`);
    throw error;
  }
}

function importCompletedTasksFromJSON(payload) {
  const items = Array.isArray(payload) ? payload : (Array.isArray(payload?.items) ? payload.items : []);
  let added = 0;

  const has = new Set(
    STATE.tasks.filter(t => t.done).map(t => `${t.title}__${t.completedAt || t.createdAt || ""}`)
  );

  for (const r of items) {
    const title = String(r.title || "").trim();
    if (!title) continue;
    const completedAt = r.completedAt || r.completed_at || null;
    const key = `${title}__${completedAt || ""}`;
    if (has.has(key)) continue;

    const t = {
      id: uid(),
      title,
      category: CATEGORIES.includes(r.category) ? r.category : "Other",
      priority: ["Low", "Medium", "High"].includes(r.priority) ? r.priority : "Low",
      type: r.type || "oneoff",
      estimate: Number(r.estimate || 0),
      notes: String(r.notes || ""),
      start: null,
      end: null,
      repeat: null,
      due: r.due || null,
      done: true,
      createdAt: r.createdAt || completedAt || new Date().toISOString(),
      completedAt: completedAt || new Date().toISOString()
    };
    STATE.tasks.push(t);
    has.add(key);
    added++;
  }
  save();
  return added;
}

function seedDemo() {
  if (STATE.seedVersion >= 1) return;
  
  const now = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const t1 = new Date(now); t1.setDate(now.getDate() + 0);
  const t2 = new Date(now); t2.setDate(now.getDate() + 1);
  const t3 = new Date(now); t3.setDate(now.getDate() + 2);
  
  STATE.tasks.push(
    {
      id: uid(),
      title: "Daily stretch",
      category: "Fitness",
      priority: "Low",
      type: "repeat",
      start: iso(now),
      end: null,
      estimate: 1,
      repeat: 1,
      notes: "5 min",
      due: iso(t1),
      done: false,
      createdAt: new Date().toISOString()
    },
    {
      id: uid(),
      title: "Clean apartment",
      category: "Home",
      priority: "Medium",
      type: "oneoff",
      start: null,
      end: null,
      estimate: 2,
      repeat: null,
      notes: "bathroom focus",
      due: iso(t2),
      done: false,
      createdAt: new Date().toISOString()
    },
    {
      id: uid(),
      title: "Budget review",
      category: "Finance",
      priority: "High",
      type: "oneoff",
      start: null,
      end: null,
      estimate: 1,
      repeat: null,
      notes: "YNAB sync",
      due: iso(t3),
      done: false,
      createdAt: new Date().toISOString()
    }
  );
  
  // Add some sample activity
  const addActivity = (title, xp = 0, kind = "generic") => {
    const entry = { when: new Date().toISOString(), title, xp, kind };
    ACTIVITY.unshift(entry);
  };
  
  addActivity("Found Aki — The Crimson Striker", 0, "character_found");
  addActivity("Completed: Daily stretch", 7, "task_completed");
  addActivity("Found Cinderjaw — The Blue‑Flame Outlaw", 0, "character_found");
  
  STATE.activity = ACTIVITY.slice(0, 100);
  STATE.seedVersion = 1;
  save();
}

// Helper function that might be referenced elsewhere
function defaultPortraitForCategory(cat) {
  const color = {
    Fitness: "#23ffd9", Home: "#a26bff", Finance: "#ffe066",
    Work: "#ff33cc", Rose: "#ff6ad5", Skills: "#66ccff", Other: "#66ff99"
  }[cat] || "#6bf";
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
