const COUNTER_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRg6U5A19DZTEL_wBCTjAYE4UNLKCh0AqaYfoGCrK-R4sqr2gaW-ORKHGxLixV82Owaqb3piZYVlrej/pub?gid=824403967&single=true&output=csv";
const FIRST_GOAL = 100;

function parseSupporterCount(csv) {
  const rows = csv
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/)
    .map((row) => row.split(","));

  // The public sheet is intentionally just: Supporters,<number>.
  // Keep the parser conservative so unexpected content cannot become a count.
  const value = rows[0]?.[1]?.replace(/^"|"$/g, "").trim() ?? "";
  const count = Number.parseInt(value, 10);
  return Number.isFinite(count) && count >= 0 ? count : null;
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
  const statusEl = document.querySelector("#count-status");
  if (statusEl) statusEl.textContent = "Count temporarily unavailable";
}

async function loadSupporterCount() {
  try {
    const response = await fetch(COUNTER_URL, {
      cache: "no-store",
      headers: { Accept: "text/csv" },
    });
    if (!response.ok) throw new Error(`Counter request failed: ${response.status}`);

    const count = parseSupporterCount(await response.text());
    if (count === null) throw new Error("Counter data was not numeric");
    renderSupporterCount(count);
  } catch (error) {
    console.warn("Unable to load the public supporter count.", error);
    showCounterFallback();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadSupporterCount();
});
