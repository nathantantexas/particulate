const gallery = document.getElementById("gallery");
const viewer = document.getElementById("viewer");
const viewerImg = document.getElementById("viewer-img");
const viewerCaption = document.getElementById("viewer-caption");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

// Small fixed pseudo-random offsets so the collage looks the same on every visit
function jitter(i, salt) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

const pieces = ARTWORKS.map((art, i) => {
  const piece = document.createElement("figure");
  piece.className = "piece";
  // Landscapes fill their column; portraits shrink a bit and drift left or right
  const portrait = art.h > art.w * 1.05;
  const width = portrait ? 74 + jitter(i, 4) * 10 : 92 + jitter(i, 4) * 8;
  piece.style.setProperty("--w", width.toFixed(1) + "%");
  piece.style.setProperty("--ml", ((100 - width) * (jitter(i, 5) * 0.5 + 0.5)).toFixed(1) + "%");
  piece.style.setProperty("--rot", (jitter(i, 1) * 2.2).toFixed(2) + "deg");
  piece.style.setProperty("--dx", (jitter(i, 2) * 14).toFixed(0) + "px");
  piece.style.setProperty("--dy", (jitter(i, 3) * 22).toFixed(0) + "px");

  const name = escapeHtml(art.name);
  const title = escapeHtml(art.title || "Artwork");
  piece.innerHTML = `
    <button type="button" aria-label="View ${title} by ${name}, age ${art.age}">
      <img src="images/${art.image}" alt="${title} by ${name}" width="${art.w}" height="${art.h}" loading="lazy">
    </button>
    <figcaption class="caption">${art.name} <span>&middot; ${art.age}</span></figcaption>`;

  const button = piece.querySelector("button");
  const img = piece.querySelector("img");

  // 3D tilt that follows the mouse
  if (finePointer) {
    button.addEventListener("mousemove", e => {
      const r = button.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      button.style.setProperty("--ty", (px * 10).toFixed(2) + "deg");
      button.style.setProperty("--tx", (py * -10).toFixed(2) + "deg");
    });
    button.addEventListener("mouseleave", () => {
      button.style.setProperty("--tx", "0deg");
      button.style.setProperty("--ty", "0deg");
    });
  }

  button.addEventListener("click", () => openViewer(img, art));
  return { piece, art, width };
});

// Deal each piece into whichever column is currently shortest, so the
// mix of tall and wide pieces balances out instead of forming a grid
let columnCount = 0;
function layout() {
  const n = window.innerWidth >= 1000 ? 3 : window.innerWidth >= 560 ? 2 : 1;
  if (n === columnCount) return;
  columnCount = n;
  const columns = Array.from({ length: n }, () => {
    const col = document.createElement("div");
    col.className = "column";
    return col;
  });
  const heights = columns.map((_, c) => (c === 1 ? 0.45 : 0));
  pieces.forEach(({ piece, art, width }) => {
    const c = heights.indexOf(Math.min(...heights));
    columns[c].appendChild(piece);
    heights[c] += (width / 100) * (art.h / art.w) + 0.35;
  });
  gallery.replaceChildren(...columns);
}
layout();

// Full screen: the image grows from its spot in the collage to fill the screen
let source = null;

function fitRect(img) {
  const pad = window.innerWidth < 700 ? 16 : 48;
  const maxW = window.innerWidth - pad * 2;
  const maxH = window.innerHeight - pad * 2 - 40;
  const ratio = img.naturalWidth / img.naturalHeight || 1;
  let w = maxW, h = w / ratio;
  if (h > maxH) { h = maxH; w = h * ratio; }
  return { left: (window.innerWidth - w) / 2, top: (window.innerHeight - h) / 2 - 16, width: w, height: h };
}

function placeAt(from, to) {
  // Image sits at its final size; a transform makes it look like it is at "from"
  const s = from.width / to.width;
  viewerImg.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${s})`;
}

function openViewer(img, art) {
  source = img;
  const from = img.getBoundingClientRect();
  const to = fitRect(img);
  viewerImg.src = img.currentSrc || img.src;
  viewerImg.alt = img.alt;
  Object.assign(viewerImg.style, {
    left: to.left + "px", top: to.top + "px",
    width: to.width + "px", height: to.height + "px",
    transition: "none"
  });
  placeAt(from, to);
  viewerImg.style.visibility = "visible";
  img.style.visibility = "hidden";
  viewerCaption.innerHTML = `${escapeHtml(art.name)}, ${art.age}${art.title ? ` &middot; <em>${escapeHtml(art.title)}</em>` : ""}`;
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
document.addEventListener("keydown", e => { if (e.key === "Escape") closeViewer(); });
window.addEventListener("resize", () => {
  layout();
  if (source) {
    const to = fitRect(source);
    Object.assign(viewerImg.style, { left: to.left + "px", top: to.top + "px", width: to.width + "px", height: to.height + "px" });
  }
});
window.addEventListener("scroll", () => { if (source) closeViewer(); }, { passive: true });
