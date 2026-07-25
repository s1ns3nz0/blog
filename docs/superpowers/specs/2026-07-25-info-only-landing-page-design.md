# Info-Only Landing Page

## Problem

The landing page (`src/pages/index.astro`) currently shows a hero section plus Featured/Recent Posts listings and an "All posts" link. The request is to turn `/` into a pure info/contact page — hero framing kept, but with an about-style intro instead of post listings. `/about` is untouched and stays as a separate page with its own (slightly different) content. `/posts`, `/tags`, `/archives` are untouched and remain reachable via the top nav.

## Design

### Landing page content (`src/pages/index.astro`)

Keep:
- The `<Header>`, the `#hero` section wrapper, site title ("Known Unknowns"), RSS icon link.
- The `Socials` component render (already lists GitHub/Mail/LinkedIn from `config.socials` — these are the "contact points").
- `<Footer>`.

Replace the bio paragraph with:

> "Hi, I'm s1ns3nz0. New tools and techniques come out faster than I can absorb them, so this blog is where I write down the known unknowns — things I'm learning, debugging stories, and notes I wish I'd found earlier."

Remove:
- The "explore and find what interests you: tags page" paragraph/link (Tags and Posts are already in the top nav — redundant on an info-only landing page).
- The Featured section entirely.
- The Recent Posts section entirely.
- The "All posts" `LinkButton` + `IconArrowRight` at the bottom.

Net effect: `index.astro` no longer touches the posts collection at all. It drops imports it no longer needs: `getCollection`, `getSortedPosts`, `getRecentPosts`, `Card`, `LinkButton`, `Pagination`, `PaginationInfo`, `IconArrowRight`, and the `postsConfig` destructure. The `<script>` block handling `backUrl` storage stays (unrelated to posts).

### Dead-code removal

Since the landing page no longer renders a Recent Posts pager, `src/pages/page/[...page].astro` (built specifically to serve `/page/2`, `/page/3`, ... for that section) has zero incoming links from anywhere in the app and becomes dead code. Removing it:

- Delete `src/pages/page/[...page].astro`.
- Delete `src/utils/getRecentPosts.ts` (only consumer was the landing page and the now-deleted route).
- Delete the "if breadcrumb is Home > Page > [N]" special case added to `src/components/Breadcrumb.astro` (added specifically to label that route; with the route gone, the case is unreachable).

Keep:
- `src/components/Pagination.astro` and its exported `PaginationInfo` type — still used by `src/pages/posts/[...page].astro` and `src/pages/tags/[tag]/[...page].astro`, both untouched by this change.

## Testing

- `pnpm run build` succeeds.
- `dist/index.html` has hero content (title, RSS link, new bio text, Socials links) and no `#featured`, `#recent-posts`, or "All posts" markup.
- `dist/page/` does not exist (route removed, and it was already producing nothing today).
- `dist/about/index.html` unchanged in content/behavior (not touched by this work).
- `dist/posts/index.html`, `dist/posts/2/index.html` (if it exists) and `dist/tags/*` pagination still render correctly (regression check on the retained `Pagination.astro`/`PaginationInfo`).
- Breadcrumb on `/posts/2` still renders "Posts (page 2)" as before (regression check that removing the `page` case didn't disturb the adjacent `posts`/`tags` cases in `Breadcrumb.astro`).
