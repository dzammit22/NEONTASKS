import { STATE, save } from '../core/state.js';
import { CATEGORIES } from '../core/config.js';
import { uid } from '../core/utils.js';

export function setupAddDialog() {
  const dlg = document.getElementById("add-dialog");
  const openBtn = document.getElementById("fab-add");
  const confirmBtn = document.getElementById("add-confirm");
  const pills = document.getElementById("a-category-pills");

  let selectedCategory = CATEGORIES[0];

  // Pills
  if (pills) {
    pills.innerHTML = CATEGORIES.map((c, i) =>
      `<button type="button" class="chip" data-cat="${c}" aria-pressed="${i === 0}">${c}</button>`
    ).join("");

    pills.querySelectorAll(".chip").forEach(btn => {
      btn.addEventListener("click", () => {
        pills.querySelectorAll(".chip").forEach(b => b.setAttribute("aria-pressed", "false"));
        btn.setAttribute("aria-pressed", "true");
        selectedCategory = btn.dataset.cat;
      });
    });
  }

  openBtn?.addEventListener("click", () => dlg?.showModal());
  document.getElementById("add-cancel")?.addEventListener("click", () => dlg?.close());

  confirmBtn?.addEventListener("click", e => {
    e.preventDefault();
    const title = document.getElementById("a-title").value.trim();
    if (!title) return document.getElementById("a-title").reportValidity();

    const t = {
      id: uid(),
      title,
      category: selectedCategory,
      priority: document.getElementById("a-priority").value,
      type: document.getElementById("a-type").value,
      start: document.getElementById("a-start").value || null,
      end: document.getElementById("a-end").value || null,
      estimate: Number(document.getElementById("a-est").value || 0),
      repeat: Number(document.getElementById("a-repeat").value || 0) || null,
      notes: document.getElementById("a-notes").value.trim(),
      due: document.getElementById("a-end").value || document.getElementById("a-start").value || null,
      done: false,
      createdAt: new Date().toISOString()
    };

    STATE.tasks.push(t);
    save();
    dlg?.close();
    window.dispatchEvent(new Event("task-added")); // Optional trigger
  });
}
