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
  ossPriority?: string[];
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

const orbitHead = document.querySelector<HTMLElement>("#summary [data-stage-head]");

function update() {
  const vh = window.innerHeight;
  // Flight progress runs from the pad (0) to orbit insertion (1), reached
  // when the summary heading crosses mid-screen.
  const orbitAt = orbitHead
    ? orbitHead.getBoundingClientRect().top + window.scrollY - vh * 0.5
    : 1;
  const progress = orbitAt > 0 ? clamp(window.scrollY / orbitAt) : 0;

  // Current stage: the last stage whose title has risen to the rocket's
  // nose, so a stage "arrives" (and separates) only once its fault clears.
  const arriveAt = rocketTop(vh);
  let current = sections[0];
  for (const s of sections) {
    if (stageTitle(s).getBoundingClientRect().top < arriveAt) current = s;
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
  // Blue daytime sky: day has risen and space has not yet taken over.
  const sky = Number(root.style.getPropertyValue("--day")) * (1 - Number(root.style.getPropertyValue("--space")));
  root.toggleAttribute("data-daylight", sky > 0.5);

  updateAnomalies(vh);

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

/** Top of the rocket's nose in the viewport (layout box, ignores shake). */
const rocketEl = document.querySelector<HTMLElement>(".rocket");
function rocketTop(vh: number) {
  return rocketEl ? vh * 0.5 - rocketEl.offsetHeight / 2 : vh * 0.5;
}
/** A stage's title (Build, Deploy...), falling back to its head or section. */
function stageTitle(el: HTMLElement) {
  const head = el.querySelector<HTMLElement>("[data-stage-head]") ?? el;
  return head.querySelector<HTMLElement>("h2") ?? head;
}

// In-flight anomalies: a fault is active from the moment its transit gap
// reaches mid-screen until the next stage's title rises to the rocket's
// nose. The callout then turns green and steps through the resolution
// lines while that stage's cards scroll by, until their bottom passes
// mid-screen. Orbit has no cards: its green line shows briefly.
const transits = Array.from(document.querySelectorAll<HTMLElement>("[data-transit], [data-notes]"));
const callout = document.querySelector<HTMLElement>("[data-callout]");
const calloutTitle = document.querySelector<HTMLElement>("[data-callout-title]");
const calloutText = document.querySelector<HTMLElement>("[data-callout-text]");
const passed = new Set<string>();
let anomaliesPrimed = false; // first pass records position silently (e.g. reload mid-page)
let calloutTimer: number | undefined;
let recoverTimer: number | undefined;
let greenOn = false; // callout is showing a stage's green window

function showCallout(state: "caution" | "resolved" | "idle", title = "", text = "") {
  if (!callout || !calloutTitle || !calloutText) return;
  if (callout.dataset.state === state && calloutText.textContent === text) return;
  callout.dataset.state = state;
  calloutTitle.textContent = title;
  calloutText.textContent = text;
}

function updateAnomalies(vh: number) {
  const mid = vh * 0.5;
  const nose = rocketTop(vh);
  let active: HTMLElement | undefined;
  let green: { t: HTMLElement; line: string; label: string } | undefined;
  for (const t of transits) {
    const section = t.parentElement ?? t;
    const top = t.getBoundingClientRect().top;
    const title = stageTitle(section).getBoundingClientRect().top;
    const id = t.dataset.transit ?? "";
    const lines = (t.dataset.resolution ?? "").split("|");
    const isPast = title <= nose;
    if (top < mid && !isPast && t.dataset.transit) active = t;

    // Green window: title at the nose until the cards' bottom passes mid.
    const log = section.querySelector<HTMLElement>(".stage-log");
    if (isPast && log) {
      const bottom = log.getBoundingClientRect().bottom;
      if (bottom > mid) {
        const span = bottom - title - (mid - nose);
        const progress = span > 0 ? (nose - title) / span : 0;
        const step = Math.min(lines.length - 1, Math.floor(progress * lines.length));
        green = { t, line: lines[step], label: t.dataset.calloutLabel ?? "✓ Resolved" };
      }
    }

    if (isPast && !passed.has(id)) {
      passed.add(id);
      if (!anomaliesPrimed) continue;
      if (!t.dataset.transit) continue;
      // Just cleared this gap: recovery pulse on the rocket.
      root.setAttribute("data-recovered", "");
      window.clearTimeout(recoverTimer);
      recoverTimer = window.setTimeout(() => root.removeAttribute("data-recovered"), 1200);
      if (!log) {
        showCallout("resolved", "✓ Resolved", lines[0]);
        window.clearTimeout(calloutTimer);
        calloutTimer = window.setTimeout(() => showCallout("idle"), 1800);
      }
    } else if (!isPast) {
      passed.delete(id);
    }
  }
  anomaliesPrimed = true;
  if (active) {
    window.clearTimeout(calloutTimer);
    greenOn = false;
    root.dataset.fault = active.dataset.motion;
    showCallout("caution", "⚠ Master caution", active.dataset.caution ?? "");
    return;
  }
  delete root.dataset.fault;
  if (green) {
    window.clearTimeout(calloutTimer);
    greenOn = true;
    showCallout("resolved", green.label, green.line);
  } else if (callout?.dataset.state === "caution" || greenOn) {
    greenOn = false;
    showCallout("idle");
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
  const ossPriority = audience.ossPriority ?? [];
  document.querySelectorAll<HTMLElement>("[data-oss-id]").forEach(entry => {
    const rank = ossPriority.indexOf(entry.dataset.ossId ?? "");
    entry.style.order = String(rank === -1 ? 100 : rank);
  });
  return audience.id;
}

/** Summary detail dialogs: [data-open-dialog="<id>"] opens <dialog id>. */
function setupDetailDialogs() {
  document.querySelectorAll<HTMLElement>("[data-open-dialog]").forEach(button => {
    const dialog = document.getElementById(button.dataset.openDialog ?? "");
    if (!(dialog instanceof HTMLDialogElement)) return;
    button.addEventListener("click", () => dialog.showModal());
    dialog.querySelector("[data-close-dialog]")?.addEventListener("click", () => dialog.close());
    // A click that lands on the dialog box itself (not its content) is the backdrop.
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
  });
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

// Summary cards and "How I work" lines rise into place once, staggered per group.
function setupReveal() {
  const items = document.querySelectorAll<HTMLElement>("[data-reveal]");
  if (reduceMotion.matches || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(
    entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        el.setAttribute("data-reveal", "in");
        io.unobserve(el);
        // Hand transitions back to the element's own styles (card hover).
        el.addEventListener("transitionend", () => el.removeAttribute("data-reveal"), { once: true });
      }
    },
    { rootMargin: "0px 0px -10% 0px" }
  );
  items.forEach(el => {
    const i = Array.from(el.parentElement?.querySelectorAll(":scope > [data-reveal]") ?? []).indexOf(el);
    el.style.setProperty("--reveal-delay", `${i * 0.1}s`);
    el.setAttribute("data-reveal", "out");
    io.observe(el);
  });
}

setupReveal();
setupAssistant(applyAudience());
setupDetailDialogs();
update();
window.addEventListener("scroll", schedule, { passive: true });
window.addEventListener("resize", schedule);
reduceMotion.addEventListener("change", schedule);
