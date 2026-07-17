import mermaid from "mermaid";

function currentTheme(): "dark" | "default" {
  return document.firstElementChild?.getAttribute("data-theme") === "dark"
    ? "dark"
    : "default";
}

let renderedTheme: "dark" | "default" | null = null;

async function render(): Promise<void> {
  const nodes = document.querySelectorAll<HTMLElement>(
    "pre.mermaid:not([data-processed])"
  );

  const theme = currentTheme();
  const themeChanged = renderedTheme !== null && renderedTheme !== theme;
  renderedTheme = theme;

  // Re-render everything when the theme flips so diagrams pick up new colors.
  const targets = themeChanged
    ? document.querySelectorAll<HTMLElement>("pre.mermaid")
    : nodes;

  if (themeChanged) {
    targets.forEach(node => {
      node.removeAttribute("data-processed");
      const source = node.dataset.mermaidSource;
      if (source) node.textContent = source;
    });
  }

  if (!targets.length) return;

  targets.forEach(node => {
    if (!node.dataset.mermaidSource) {
      node.dataset.mermaidSource = node.textContent ?? "";
    }
  });

  mermaid.initialize({ startOnLoad: false, theme });
  await mermaid.run({ nodes: targets });
}

render();

document.addEventListener("astro:after-swap", render);

new MutationObserver(() => render()).observe(document.documentElement, {
  attributeFilter: ["data-theme"],
});
