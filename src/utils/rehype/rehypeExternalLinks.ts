import { visit } from "unist-util-visit";
import type { Root, Element } from "hast";

/**
 * Opens links in post content that point off-site in a new tab. Internal
 * links (relative paths, same-origin absolute URLs, mailto:, anchors) are
 * left alone so in-app navigation keeps using view transitions.
 */
export function rehypeExternalLinks(siteUrl: string) {
  const siteHost = new URL(siteUrl).hostname;

  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "a") return;

      const properties = node.properties as Record<string, unknown>;
      const href = properties.href;
      if (typeof href !== "string") return;

      let isExternal: boolean;
      try {
        isExternal = new URL(href, siteUrl).hostname !== siteHost;
      } catch {
        return; // relative path, mailto:, anchor, etc. — leave as internal
      }
      if (!isExternal) return;

      properties.target = "_blank";

      const existingRel = properties.rel;
      const rel = new Set(
        Array.isArray(existingRel)
          ? existingRel.map(String)
          : typeof existingRel === "string"
            ? existingRel.split(/\s+/)
            : []
      );
      rel.add("noopener");
      rel.add("noreferrer");
      properties.rel = [...rel];
    });
  };
}
