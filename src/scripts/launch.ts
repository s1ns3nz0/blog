/**
 * Drives the /launch scene from scroll position: stage state, sky layer
 * fades, parallax, telemetry, and the altitude meter. Also applies the
 * ?for=<audience> overrides. Only known audience ids from the page's own
 * JSON are used; the query value is never written into the DOM.
 */

type Audience = {
  id: string;
  label: string;
  subline: string;
  fairing?: string;
  priority: string[];
};

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

const summary = document.getElementById("summary");

function update() {
  const vh = window.innerHeight;
  // Flight progress runs from the pad (0) to orbit insertion (1), reached
  // when the summary's top crosses mid-screen.
  const orbitAt = summary ? summary.offsetTop - vh * 0.5 : 1;
  const progress = orbitAt > 0 ? clamp(window.scrollY / orbitAt) : 0;

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
    const value = clamp((vh - top) / (vh * 0.7));
    root.style.setProperty(prop, value.toFixed(3));
    if (prop === "--light") root.toggleAttribute("data-bright", value > 0.45);
  }

  if (reduceMotion.matches) root.style.removeProperty("--y");
  else root.style.setProperty("--y", String(Math.round(window.scrollY)));

  const inOrbit = stage === "orbit";
  if (hudT) hudT.textContent = formatT(-10 + progress * 550);
  if (hudAlt) {
    const km = inOrbit ? 400 : progress * progress * 400;
    hudAlt.textContent = km < 10 ? km.toFixed(1) : String(Math.round(km));
  }
  if (hudStage) {
    hudStage.textContent = inOrbit ? "Orbit achieved" : (current?.dataset.label ?? "");
  }

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

/** Applies ?for= overrides and returns the matched audience id, if any. */
function applyAudience(): string | undefined {
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
  if (audience.fairing) {
    const fairing = audience.fairing;
    const length = Math.min(48, Math.max(30, fairing.length * 5.2));
    document.querySelectorAll("[data-fairing-label]").forEach(el => {
      el.textContent = fairing;
      el.setAttribute("textLength", String(length)); // mirrors fairingTextLength()
    });
  }
  document.querySelectorAll<HTMLElement>("[data-card-id]").forEach(card => {
    const rank = audience.priority.indexOf(card.dataset.cardId ?? "");
    card.style.order = String(rank === -1 ? 100 : rank);
  });
  return audience.id;
}

/** Satellite assistant: native <dialog>, pre-written answers only (v2). */
function setupAssistant(audienceId: string | undefined) {
  const dialog = document.getElementById("assistant");
  if (!(dialog instanceof HTMLDialogElement)) return;

  // Show this audience's chips, falling back to the default set.
  const items = Array.from(
    dialog.querySelectorAll<HTMLElement>("[data-chip-audiences]")
  );
  const has = (el: HTMLElement, id: string) =>
    (el.dataset.chipAudiences ?? "").split(" ").includes(id);
  const target =
    audienceId && items.some(el => has(el, audienceId)) ? audienceId : "default";
  for (const el of items) el.hidden = !has(el, target);

  document.querySelectorAll("[data-open-assistant]").forEach(button => {
    button.addEventListener("click", () => dialog.showModal());
  });
  dialog.querySelector("[data-close-assistant]")?.addEventListener("click", () => {
    dialog.close();
  });
  // Clicks on the transparent dialog area (outside the panel) close it.
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });

  const chips = Array.from(dialog.querySelectorAll<HTMLButtonElement>("[data-chip]"));
  const answers = Array.from(dialog.querySelectorAll<HTMLElement>("[data-answer]"));
  const empty = dialog.querySelector<HTMLElement>("[data-answer-empty]");
  for (const chip of chips) {
    chip.addEventListener("click", () => {
      const id = chip.dataset.chip;
      for (const c of chips) c.setAttribute("aria-pressed", String(c === chip));
      for (const a of answers) a.hidden = a.dataset.answer !== id;
      if (empty) empty.hidden = true;
    });
  }
}

setupAssistant(applyAudience());
update();
window.addEventListener("scroll", schedule, { passive: true });
window.addEventListener("resize", schedule);
reduceMotion.addEventListener("change", schedule);
