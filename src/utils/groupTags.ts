import { slugifyStr } from "./slugify";
import type { TagGroupConfig } from "./tagGroups";

type Tag = {
  tag: string;
  tagName: string;
};

export type TagGroup = {
  name: string;
  tags: Tag[];
};

/**
 * Buckets unique tags into the configured groups by slug match.
 * Any tag not covered by `groups` is collected under `otherLabel`.
 * Empty groups are dropped.
 */
export function groupTags(
  tags: Tag[],
  groups: TagGroupConfig[],
  otherLabel = "Other"
): TagGroup[] {
  const assigned = new Set<string>();

  const grouped = groups
    .map(group => {
      const slugs = new Set(group.tags.map(slugifyStr));
      const matched = tags.filter(t => slugs.has(t.tag));
      matched.forEach(t => assigned.add(t.tag));
      return { name: group.name, tags: matched };
    })
    .filter(group => group.tags.length > 0);

  const leftover = tags.filter(t => !assigned.has(t.tag));
  if (leftover.length > 0) {
    grouped.push({ name: otherLabel, tags: leftover });
  }

  return grouped;
}
