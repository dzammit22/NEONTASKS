export function openLightbox(html) {
  const dlg = document.getElementById("lightbox");
  const cont = document.getElementById("lightbox-content");
  const close = document.getElementById("lightbox-close");

  if (!dlg || !cont || !close) return;

  cont.innerHTML = html;
  dlg.showModal();

  close.onclick = () => dlg.close();
}
