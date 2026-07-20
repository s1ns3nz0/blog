import type { CollectionEntry } from "astro:content";
import { getSortedPosts } from "./getSortedPosts";

/**
 * Sorted posts with data.featured falsy — the set shown under
 * "Recent Posts" on the landing page and paginated at /page/N.
 */
export function getRecentPosts(posts: CollectionEntry<"posts">[]) {
  return getSortedPosts(posts).filter(({ data }) => !data.featured);
}
