const COUNTER_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRg6U5A19DZTEL_wBCTjAYE4UNLKCh0AqaYfoGCrK-R4sqr2gaW-ORKHGxLixV82Owaqb3piZYVlrej/pub?gid=824403967&single=true&output=csv";
const FIRST_GOAL = 200;
const AUTO_ROTATE_MS = 7000;

let approvedComments = [];
let currentComment = 0;
let rotationTimer = null;
let userPaused = false;
let hoverPaused = false;
let focusPaused = false;

function parseCsvRows(csv) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const next = csv[index + 1];

    if (character === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function parsePublicFeed(csv) {
  const rows = parseCsvRows(csv.replace(/^\uFEFF/, ""));
  const countValue = rows[0]?.[1]?.trim() ?? "";
  const count = Number.parseInt(countValue, 10);
  const commentsHeaderIndex = rows.findIndex(
    (row) => row[0]?.trim().toLowerCase() === "approved comments",
  );
  const comments = commentsHeaderIndex < 0
    ? []
    : rows
        .slice(commentsHeaderIndex + 1)
        .map((row) => row[0]?.trim() ?? "")
        .filter(Boolean)
        .map((value) => {
          const separator = value.indexOf("||");
          if (separator < 0) return { text: value, name: "" };
          return {
            text: value.slice(0, separator).trim(),
            name: value.slice(separator + 2).trim(),
          };
        })
        .filter((comment) => comment.text);

  return {
    count: Number.isFinite(count) && count >= 0 ? count : null,
    comments,
  };
}

function renderSupporterCount(count) {
  const countEl = document.querySelector("#supporter-count");
  const fillEl = document.querySelector("#meter-fill");
  const progressEl = document.querySelector('[role="progressbar"]');
  const statusEl = document.querySelector("#count-status");

  if (!countEl || !fillEl || !progressEl || !statusEl) return;

  countEl.textContent = count.toLocaleString("en-US");
  const progress = Math.min((count / FIRST_GOAL) * 100, 100);
  fillEl.style.width = `${progress}%`;
  progressEl.setAttribute("aria-valuenow", String(Math.min(count, FIRST_GOAL)));
  statusEl.textContent = "Live public count";
}

function showCounterFallback() {
  const countEl = document.querySelector("#supporter-count");
  const fillEl = document.querySelector("#meter-fill");
  const progressEl = document.querySelector('[role="progressbar"]');
  const statusEl = document.querySelector("#count-status");
  if (countEl) countEl.textContent = "—";
  if (fillEl) fillEl.style.width = "0%";
  if (progressEl) progressEl.setAttribute("aria-valuenow", "0");
  if (statusEl) statusEl.textContent = "Count temporarily unavailable";
}

function stopRotation() {
  if (rotationTimer) window.clearInterval(rotationTimer);
  rotationTimer = null;
}

function startRotation() {
  stopRotation();
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (
    approvedComments.length < 2 ||
    userPaused ||
    hoverPaused ||
    focusPaused ||
    reducedMotion
  ) return;
  rotationTimer = window.setInterval(() => showComment(currentComment + 1), AUTO_ROTATE_MS);
}

function showComment(index) {
  if (!approvedComments.length) return;
  currentComment = (index + approvedComments.length) % approvedComments.length;
  const comment = approvedComments[currentComment];
  const textEl = document.querySelector("#quote-text");
  const attributionEl = document.querySelector("#quote-attribution");
  const indicatorEl = document.querySelector("#quote-indicator");
  const previousEl = document.querySelector("#quote-prev");
  const nextEl = document.querySelector("#quote-next");

  if (textEl) textEl.textContent = comment.text;
  if (attributionEl) {
    attributionEl.textContent = comment.name
      ? `— ${comment.name}`
      : "— Anonymous Orinda resident";
  }
  if (indicatorEl) indicatorEl.textContent = `${currentComment + 1} of ${approvedComments.length}`;
  if (previousEl) previousEl.disabled = approvedComments.length < 2;
  if (nextEl) nextEl.disabled = approvedComments.length < 2;
}

function renderComments(comments) {
  const carousel = document.querySelector("#quote-carousel");
  const controls = document.querySelector("#quote-controls");
  const toggle = document.querySelector("#quote-toggle");
  if (!carousel || !controls) return;

  approvedComments = comments;
  currentComment = 0;
  controls.hidden = comments.length === 0;
  carousel.dataset.state = comments.length ? "ready" : "empty";

  if (!comments.length) {
    stopRotation();
    const textEl = document.querySelector("#quote-text");
    const attributionEl = document.querySelector("#quote-attribution");
    if (textEl) textEl.textContent = "Approved comments will appear here as neighbors choose to share them.";
    if (attributionEl) attributionEl.textContent = "Community comments are reviewed before publication.";
    return;
  }

  if (toggle) {
    toggle.textContent = "Pause rotation";
    toggle.setAttribute("aria-pressed", "false");
  }
  userPaused = false;
  showComment(0);
  startRotation();
}

function wireCarousel() {
  const carousel = document.querySelector("#quote-carousel");
  const previousEl = document.querySelector("#quote-prev");
  const nextEl = document.querySelector("#quote-next");
  const toggle = document.querySelector("#quote-toggle");
  if (!carousel || !previousEl || !nextEl || !toggle) return;

  previousEl.addEventListener("click", () => {
    showComment(currentComment - 1);
    startRotation();
  });
  nextEl.addEventListener("click", () => {
    showComment(currentComment + 1);
    startRotation();
  });
  toggle.addEventListener("click", () => {
    userPaused = !userPaused;
    toggle.textContent = userPaused ? "Resume rotation" : "Pause rotation";
    toggle.setAttribute("aria-pressed", String(userPaused));
    startRotation();
  });
  carousel.addEventListener("mouseenter", () => {
    hoverPaused = true;
    stopRotation();
  });
  carousel.addEventListener("mouseleave", () => {
    hoverPaused = false;
    startRotation();
  });
  carousel.addEventListener("focusin", () => {
    focusPaused = true;
    stopRotation();
  });
  carousel.addEventListener("focusout", (event) => {
    if (!carousel.contains(event.relatedTarget)) {
      focusPaused = false;
      startRotation();
    }
  });
}

async function loadPublicFeed() {
  try {
    const response = await fetch(COUNTER_URL, {
      cache: "no-store",
      headers: { Accept: "text/csv" },
    });
    if (!response.ok) throw new Error(`Public feed request failed: ${response.status}`);

    const feed = parsePublicFeed(await response.text());
    if (feed.count === null) throw new Error("Public count was not numeric");
    renderSupporterCount(feed.count);
    renderComments(feed.comments);
  } catch (error) {
    console.warn("Unable to load the public supporter feed.", error);
    showCounterFallback();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  wireCarousel();
  loadPublicFeed();
});
