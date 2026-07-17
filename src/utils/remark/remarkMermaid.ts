import { visit } from "unist-util-visit";
import type { Root } from "mdast";

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Rewrites ```mermaid fences into a raw <pre class="mermaid"> node so Shiki
 * skips it (no syntax highlighting spans in the way) and the client-side
 * mermaid.js runtime in src/scripts/mermaid.ts can render it into an SVG.
 */
export function remarkMermaid() {
  return (tree: Root) => {
    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== "mermaid" || !parent || index === undefined) return;

      parent.children[index] = {
        type: "html",
        value: `<pre class="mermaid not-prose">${escapeHtml(node.value)}</pre>`,
      };
    });
  };
}
