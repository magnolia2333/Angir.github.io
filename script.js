const canvas = document.querySelector("#starfield");
const context = canvas.getContext("2d");
const noteForm = document.querySelector("#noteForm");
const noteTitle = document.querySelector("#noteTitle");
const noteTag = document.querySelector("#noteTag");
const noteBody = document.querySelector("#noteBody");
const devlogList = document.querySelector("#devlogList");
const ownerSection = document.querySelector("#owner");
const exportButton = document.querySelector("#exportButton");
const clearButton = document.querySelector("#clearButton");
const lockButton = document.querySelector("#lockButton");
const ownerLock = document.querySelector("#ownerLock");
const ownerKey = document.querySelector("#ownerKey");
const ownerLockStatus = document.querySelector("#ownerLockStatus");
const storageKey = "angir-dev-notes";
const ownerSessionKey = "angir-owner-unlocked";
const ownerPassphrase = "angir-dev";

const defaultNotes = [
  {
    id: "welcome",
    title: "Devlog home base online",
    tag: "Release",
    body:
      "This space is ready for project updates, prototype notes, engine experiments, and itch.io development logs.",
    date: "2026-06-10",
    locked: true,
  },
  {
    id: "feel",
    title: "What I track during a gameplay pass",
    tag: "Prototype",
    body:
      "Player feel, readable feedback, camera rhythm, combat timing, level flow, and the small moments where a mechanic starts to feel intentional.",
    date: "2026-06-10",
    locked: true,
  },
];

let stars = [];
const sparkColors = [
  [53, 212, 255],
  [140, 255, 177],
  [255, 209, 102],
  [255, 95, 165],
  [155, 123, 255],
];

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  stars = Array.from({ length: Math.min(58, Math.floor(window.innerWidth / 18)) }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: -0.08 + Math.random() * 0.16,
    vy: 0.22 + Math.random() * 0.62,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.006 + Math.random() * 0.014,
    size: 1.1 + Math.random() * 2.4,
    rotation: Math.random() * Math.PI,
    alpha: 0.38 + Math.random() * 0.42,
    color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
  }));
}

function drawStars() {
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);

  stars.forEach((star) => {
    star.x += star.vx;
    star.y += star.vy;
    star.pulse += star.pulseSpeed;

    if (star.x < -8) star.x = window.innerWidth + 8;
    if (star.x > window.innerWidth + 8) star.x = -8;
    if (star.y < -8) star.y = window.innerHeight + 8;
    if (star.y > window.innerHeight + 8) star.y = -8;

    const [r, g, b] = star.color;
    const flicker = star.alpha + Math.sin(star.pulse) * 0.18;
    const drift = Math.sin(star.pulse) * 0.9;
    const size = star.size + Math.sin(star.pulse) * 0.25;

    context.globalAlpha = Math.max(0.24, flicker);
    context.fillStyle = `rgba(${r}, ${g}, ${b}, 0.82)`;
    context.fillRect(star.x + drift, star.y, size, size);
  });

  context.globalAlpha = 1;
  requestAnimationFrame(drawStars);
}

function loadNotes() {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
  return [...saved, ...defaultNotes];
}

function saveUserNotes(notes) {
  localStorage.setItem(storageKey, JSON.stringify(notes));
}

function renderNotes() {
  const notes = loadNotes();
  const isOwner = ownerIsUnlocked();

  devlogList.innerHTML = notes
    .map(
      (note) => `
        <article class="devlog-card">
          <div class="devlog-meta">
            <span>${note.date}</span>
            <span>${note.tag}</span>
          </div>
          <h3>${escapeHtml(note.title)}</h3>
          <p>${escapeHtml(note.body)}</p>
          ${
            note.locked || !isOwner
              ? ""
              : `<button class="delete-note" type="button" data-delete="${note.id}">Delete note</button>`
          }
        </article>
      `
    )
    .join("");
}

function ownerIsUnlocked() {
  return sessionStorage.getItem(ownerSessionKey) === "true";
}

function ownerRouteIsActive() {
  return ownerIsUnlocked();
}

function syncOwnerSection() {
  ownerSection.classList.toggle("is-hidden", !ownerRouteIsActive());
}

function setOwnerUnlocked(unlocked) {
  if (unlocked) {
    sessionStorage.setItem(ownerSessionKey, "true");
  } else {
    sessionStorage.removeItem(ownerSessionKey);
  }

  syncOwnerSection();
  noteForm.classList.toggle("is-hidden", !unlocked);
  ownerLock.classList.toggle("is-hidden", unlocked);
  renderNotes();
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return map[character];
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

noteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!ownerIsUnlocked()) return;

  const userNotes = JSON.parse(localStorage.getItem(storageKey) || "[]");
  userNotes.unshift({
    id: crypto.randomUUID(),
    title: noteTitle.value.trim(),
    tag: noteTag.value,
    body: noteBody.value.trim(),
    date: today(),
  });
  saveUserNotes(userNotes);
  noteForm.reset();
  renderNotes();
});

devlogList.addEventListener("click", (event) => {
  const deleteId = event.target.dataset.delete;
  if (!deleteId || !ownerIsUnlocked()) return;

  const userNotes = JSON.parse(localStorage.getItem(storageKey) || "[]");
  saveUserNotes(userNotes.filter((note) => note.id !== deleteId));
  renderNotes();
});

exportButton.addEventListener("click", () => {
  const notes = loadNotes().filter((note) => !note.locked);
  const markdown =
    notes.length === 0
      ? "# Devlog Draft\n\nNo browser notes saved yet."
      : notes
          .map((note) => `# ${note.title}\n\n${note.date} / ${note.tag}\n\n${note.body}`)
          .join("\n\n---\n\n");

  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `angir-devlog-${today()}.md`;
  link.click();
  URL.revokeObjectURL(url);
});

clearButton.addEventListener("click", () => {
  noteForm.reset();
});

lockButton.addEventListener("click", () => {
  noteForm.reset();
  setOwnerUnlocked(false);
  ownerLockStatus.textContent = "Writer locked.";
});

ownerLock.addEventListener("submit", (event) => {
  event.preventDefault();
  if (ownerKey.value === ownerPassphrase) {
    ownerKey.value = "";
    ownerLockStatus.textContent = "";
    setOwnerUnlocked(true);
    ownerSection.scrollIntoView({ behavior: "smooth", block: "start" });
    noteTitle.focus();
    return;
  }

  ownerLockStatus.textContent = "You should know this is backstage.";
  ownerKey.select();
});

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
drawStars();
setOwnerUnlocked(ownerIsUnlocked());
