# Landing Page Pagination & Tag Group Reorg

## 1. Landing page pagination

### Problem
The landing page (`src/pages/index.astro`) shows only the first `postsConfig.perIndex` (default 4) non-featured posts under "Recent Posts", with a static link to `/posts` for the rest. There's no way to page through recent posts without leaving the landing page context.

### Design
Add a new route `src/pages/page/[page].astro` using Astro's `paginate()` over `recentPosts` (posts where `data.featured` is falsy), with `pageSize: config.posts.perIndex`.

- `/` (existing `index.astro`, unchanged structure): hero + Featured section (all featured posts, unpaginated) + Recent Posts section (page 1 slice) + `Pagination` component + "All posts" link to `/posts`.
- `/page/2`, `/page/3`, ...: Header + Breadcrumb-equivalent + Recent Posts heading + paginated slice + `Pagination` component. No hero, no Featured section, no "All posts" link — avoids duplicate content across pages and keeps subpages focused on their one job (paging recent posts).

Reuses the existing `Pagination.astro` component (same one `/posts` already uses), so prev/next styling and a11y labels stay consistent site-wide.

`index.astro`'s own recent-posts slice logic (`recentPosts.slice(0, perIndex)`) is replaced by consuming page 1 of the same `paginate()` result set, so both routes derive from one source of truth for what's "page 1."

### Alternatives considered
- Catch-all root route (`src/pages/[...page].astro` serving `/`, `/2`, `/3`) — rejected: non-standard numeric top-level paths, risk of colliding with future top-level page slugs.
- Client-side JS toggle, no new URLs — rejected: pages must be independently linkable/bookmarkable and work without JS.

## 2. Tag group reorg

### Problem
`src/utils/tagGroups.ts` defines `TAG_GROUPS`, consumed by both the tags index page and the sidebar nav (via `groupTags()`). Since the last update, 7 tags across 3 new posts aren't covered by any group and fall into the "Other" bucket: `Microservices`, `NIST SP 800-204`, `NIST SP 800-204D`, `NIST SP 800-218`, `SSDF`, `CI/CD`, `CI/CD Security`.

Also found: `relationship-between-nist-sp-800-218-and-sp-800-204-d.md` has a tag `CI/CD ` (trailing space) — slugifies fine (no URL collision with `CI/CD Security`) but the stray space shows up wherever the raw label (`tagName`) is rendered. Fix: trim to `CI/CD`.

### Design
Update `TAG_GROUPS` in `src/utils/tagGroups.ts`:

- **New group "Software Supply Chain & DevSecOps"**: `DevSecOps` (moved from "DoD & DevSecOps"), `CNCF` (moved from "NIST & Compliance"), `SSDF`, `NIST SP 800-218`, `NIST SP 800-204`, `NIST SP 800-204D`, `Microservices`, `CI/CD`, `CI/CD Security`.
- **"DoD & DevSecOps" renamed to "DoD & Military"**: keeps `DoD`, `DoDD 3000.09`, `Army FM 3-60` — pure military-doctrine tags, no longer mixed with the generic `DevSecOps` tag.
- **"NIST & Compliance"**: unchanged except `CNCF` removed (moved above). Keeps `NIST`, `NIST SP 800-30`, `NIST SP 800-37(RMF)`, `NIST SP 800-39`, `NIST SP 800-53`, `FIPS 199&200`, `OSCAL`, `OSCAL Compass`, `Risk`, `Contribution`.
- **"Site"**: unchanged (`meta`, `dev`).

Fix the `CI/CD ` → `CI/CD` typo in `src/content/posts/relationship-between-nist-sp-800-218-and-sp-800-204-d.md` frontmatter.

No changes needed to `groupTags.ts`, the tags index page, or the sidebar nav — both already consume `TAG_GROUPS` generically.

### Alternatives considered
- Append new tags into existing groups without moving/renaming anything — rejected: keeps "DoD & DevSecOps" topically muddled (military doctrine + generic term) and buries the new NIST DevSecOps document series inside a compliance-framework group that's really about RMF/risk.

## Testing
- `pnpm run build` succeeds, generates `/`, `/page/2` (and further pages if recent-post count warrants).
- Manually verify: `/` shows featured + page-1 recent posts + pager (if >perIndex recent posts exist) + all-posts link; `/page/2` shows only recent-posts pager content; tags index page and sidebar reflect new grouping; no tag lands in "Other" unless genuinely new/unclassified; `CI/CD` tag pill renders without trailing whitespace.

### Known data gap
All 13 existing posts currently have `featured: true`, so `recentPosts` is empty and both the Recent Posts section and its new pager render nothing today. This is expected and out of scope for this change — the pager will show content once posts start being marked `featured: false`. `paginate()` naturally produces zero pages for an empty set, so `/page/2` etc. simply 404 until then; no special-casing needed.
