/**
 * Drives the /launch scene from scroll position: stage state, sky layer
 * fades, parallax, telemetry, and the altitude meter. Also applies the
 * ?for=<audience> overrides. Only known audience ids from the page's own
 * JSON are used; the query value is never written into the DOM.
 */

type Audience = { id: string; label: string; subline: string; priority: string[] };

const root = document.documentElement;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const sections = Array.from(
  document.querySelectorAll<HTMLElement>("main [data-stage]")
);
const fades: [string, HTMLElement | null][] = [
  ["--day", document.getElementById("ship")],
  ["--space", document.getElementById("operate")],
  ["--light", document.getElementById("summary")],
];
const hudT = document.querySelector<HTMLElement>("[data-hud-t]");
const hudAlt = document.querySelector<HTMLElement>("[data-hud-alt]");
const hudStage = document.querySelector<HTMLElement>("[data-hud-stage]");
const meterLinks = Array.from(
  document.querySelectorAll<HTMLAnchorElement>("[data-meter]")
);

const clamp = (v: number) => Math.min(1, Math.max(0, v));

function formatT(seconds: number): string {
  const sign = seconds < 0 ? "-" : "+";
  const s = Math.abs(Math.round(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `T${sign}${mm}:${ss}`;
}

function update() {
  const vh = window.innerHeight;
  const max = document.documentElement.scrollHeight - vh;
  const progress = max > 0 ? clamp(window.scrollY / max) : 0;

  // Current stage: last section whose top has crossed mid-screen.
  let current = sections[0];
  for (const s of sections) {
    if (s.getBoundingClientRect().top < vh * 0.5) current = s;
  }
  const stage = current?.dataset.stage ?? "build";
  root.dataset.stage = stage;
  root.toggleAttribute("data-launched", window.scrollY > 40);

  // Each sky layer fades in as its section rises into view.
  for (const [prop, el] of fades) {
    if (!el) continue;
    const top = el.getBoundingClientRect().top;
    root.style.setProperty(prop, clamp((vh - top) / (vh * 0.7)).toFixed(3));
  }

  if (reduceMotion.matches) root.style.removeProperty("--y");
  else root.style.setProperty("--y", String(Math.round(window.scrollY)));

  if (hudT) hudT.textContent = formatT(-10 + progress * 550);
  if (hudAlt) {
    const km = progress * progress * 420;
    hudAlt.textContent = km < 10 ? km.toFixed(1) : String(Math.round(km));
  }
  if (hudStage) hudStage.textContent = current?.dataset.label ?? "";

  for (const link of meterLinks) {
    if (link.dataset.meter === stage) link.setAttribute("aria-current", "step");
    else link.removeAttribute("aria-current");
  }
}

let queued = false;
function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    update();
  });
}

function applyAudience() {
  const id = new URLSearchParams(window.location.search).get("for");
  if (!id) return;
  const json = document.getElementById("launch-audiences")?.textContent;
  if (!json) return;
  const audience = (JSON.parse(json) as Audience[]).find(a => a.id === id);
  if (!audience) return;

  document.querySelectorAll<HTMLElement>("[data-subline]").forEach(el => {
    el.textContent = audience.subline;
  });
  document.querySelectorAll<HTMLElement>("[data-audience-label]").forEach(el => {
    el.textContent = `Prepared for ${audience.label}`;
    el.hidden = false;
  });
  document.querySelectorAll<HTMLElement>("[data-card-id]").forEach(card => {
    const rank = audience.priority.indexOf(card.dataset.cardId ?? "");
    card.style.order = String(rank === -1 ? 100 : rank);
  });
}

applyAudience();
update();
window.addEventListener("scroll", schedule, { passive: true });
window.addEventListener("resize", schedule);
reduceMotion.addEventListener("change", schedule);
