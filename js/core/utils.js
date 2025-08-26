export function deepClone(o) {
  return JSON.parse(JSON.stringify(o));
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function escapeHTML(s) {
  return (s || "").replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  })[m]);
}

export function ellipsize(s, max) {
  s = String(s || "");
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
