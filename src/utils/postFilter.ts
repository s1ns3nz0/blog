import type { CollectionEntry } from "astro:content";
import config from "@/config";

/**
 * Determines whether a post is eligible to be built and reachable by direct URL.
 *
 * - Excludes drafts always
 * - In production, excludes scheduled posts until `pubDatetime` minus the configured margin
 * - In dev, always shows non-draft posts to make authoring easier
 *
 * Does NOT exclude `unlisted` posts: those still build and stay reachable at
 * their URL, they're just kept out of listings/tags/search/RSS. Callers that
 * render a browsable list must additionally filter `!data.unlisted` on top
 * of this (see posts/index.astro, archives, tags, rss.xml, Sidebar).
 */
export function postFilter({ data }: CollectionEntry<"posts">) {
  const isPublishTimePassed =
    Date.now() >
    new Date(data.pubDatetime).getTime() - config.posts.scheduledPostMargin;
  return !data.draft && (import.meta.env.DEV || isPublishTimePassed);
}
