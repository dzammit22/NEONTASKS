export function toast(html, duration = 2300) {
  const layer = document.getElementById("toast-layer");
  if (!layer) return;

  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = html;
  layer.appendChild(el);

  setTimeout(() => {
    el.remove();
  }, duration);
}
