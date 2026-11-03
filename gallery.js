const gallery = document.getElementById("gallery");
const viewer = document.getElementById("viewer");
const viewerImg = document.getElementById("viewer-img");
const viewerCaption = document.getElementById("viewer-caption");
const viewerLabel = document.getElementById("viewer-label");
const viewerDesc = document.getElementById("viewer-desc");
const viewerDescText = document.getElementById("viewer-desc-text");
const descToggle = document.getElementById("desc-toggle");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const TOP_ROW = 3; // featured pieces hung alone on the first row

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

const walls = [document.createElement("div"), document.createElement("div")];
walls.forEach(w => { w.className = "wall"; gallery.appendChild(w); });

ARTWORKS.forEach((art, i) => {
  const piece = document.createElement("figure");
  piece.className = "piece";
  piece.style.setProperty("--ratio", (art.w / art.h).toFixed(4));

  const name = escapeHtml(art.name);
  const title = escapeHtml(art.title || "Untitled");
  piece.innerHTML = `
    <button type="button" aria-label="View ${title} by ${name}, age ${art.age}">
      <img src="images/${art.image}" alt="${title} by ${name}" width="${art.w}" height="${art.h}" loading="lazy">
    </button>
    <figcaption class="label">
      <span class="artist">${name}, ${art.age}</span>
      <span class="title">${title}</span>
    </figcaption>`;

  const button = piece.querySelector("button");
  const img = piece.querySelector("img");

  // Gentle 3D tilt that follows the mouse
  if (finePointer) {
    button.addEventListener("mousemove", e => {
      const r = button.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      button.style.setProperty("--ty", (px * 8).toFixed(2) + "deg");
      button.style.setProperty("--tx", (py * -8).toFixed(2) + "deg");
    });
    button.addEventListener("mouseleave", () => {
      button.style.setProperty("--tx", "0deg");
      button.style.setProperty("--ty", "0deg");
    });
  }

  button.addEventListener("click", () => openViewer(img, art));
  walls[i < TOP_ROW ? 0 : 1].appendChild(piece);
});

// Full screen: the image grows from its place on the wall to fill the screen
let source = null;

function fitRect(img) {
  const pad = window.innerWidth < 700 ? 16 : 48;
  const maxW = window.innerWidth - pad * 2;
  const maxH = window.innerHeight - pad * 2 - 80; // room for the caption below
  const ratio = img.naturalWidth / img.naturalHeight || 1;
  let w = maxW, h = w / ratio;
  if (h > maxH) { h = maxH; w = h * ratio; }
  return { left: (window.innerWidth - w) / 2, top: (window.innerHeight - h) / 2 - 36, width: w, height: h };
}

function placeCaption(r) {
  viewerCaption.style.top = r.top + r.height + 16 + "px"; // just under the painting
}

function setRect(el, r) {
  Object.assign(el.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
}

function placeAt(from, to) {
  // Image sits at its final size; a transform makes it look like it is at "from"
  const s = from.width / to.width;
  viewerImg.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${s})`;
}

function showDescription(show) {
  viewer.classList.toggle("show-desc", show);
  descToggle.textContent = show ? "Hide description" : "Read description";
  descToggle.setAttribute("aria-expanded", String(show));
  if (show) viewerDesc.scrollTop = 0;
}

function openViewer(img, art) {
  source = img;
  const from = img.getBoundingClientRect();
  const to = fitRect(img);
  viewerImg.src = img.currentSrc || img.src;
  viewerImg.alt = img.alt;
  viewerImg.style.transition = "none";
  setRect(viewerImg, to);
  setRect(viewerDesc, to);
  placeCaption(to);
  placeAt(from, to);
  viewerImg.style.visibility = "visible";
  img.style.visibility = "hidden";

  viewerLabel.innerHTML = `${escapeHtml(art.name)}, ${art.age}${art.title ? ` &middot; <em>${escapeHtml(art.title)}</em>` : ""}`;
  viewerDescText.innerHTML = (art.statement || "").split("\n\n").map(p => `<p>${escapeHtml(p)}</p>`).join("");
  descToggle.hidden = !art.statement;
  showDescription(false);
  viewer.setAttribute("aria-hidden", "false");

  viewerImg.getBoundingClientRect(); // commit the starting position
  viewerImg.style.transition = "";
  viewer.classList.add("open");
  viewerImg.style.transform = "none";
}

function closeViewer() {
  if (!source) return;
  const img = source;
  source = null;
  showDescription(false);
  const to = viewerImg.getBoundingClientRect();
  placeAt(img.getBoundingClientRect(), to);
  viewer.classList.remove("open");
  viewer.setAttribute("aria-hidden", "true");
  viewerImg.addEventListener("transitionend", () => {
    viewerImg.style.visibility = "hidden";
    img.style.visibility = "";
  }, { once: true });
}

viewer.addEventListener("click", closeViewer);
// The description and its toggle should not close the viewer
viewerDesc.addEventListener("click", e => e.stopPropagation());
descToggle.addEventListener("click", e => {
  e.stopPropagation();
  showDescription(!viewer.classList.contains("show-desc"));
});
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (viewer.classList.contains("show-desc")) showDescription(false);
  else closeViewer();
});
window.addEventListener("resize", () => {
  if (source) {
    const to = fitRect(source);
    setRect(viewerImg, to);
    setRect(viewerDesc, to);
    placeCaption(to);
  }
});
window.addEventListener("scroll", () => { if (source) closeViewer(); }, { passive: true });
