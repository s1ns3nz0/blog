# Landing Page Pagination & Tag Group Reorg Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pager to the landing page's Recent Posts section (new `/page/N` routes) and reorganize `TAG_GROUPS` so newly-added tags aren't dumped into "Other".

**Architecture:** `Pagination.astro`'s prop type is loosened from Astro's internal `Page<T>` to a small local `PaginationInfo` type so it can be driven by a hand-built object (for landing page 1) as well as Astro's real `paginate()` (for `/page/2`, `/page/3`, ...). A new `getRecentPosts` util centralizes "sorted, non-featured posts" so both routes compute the exact same list. `index.astro` keeps rendering page 1 in place (unchanged URL: `/`); a new `src/pages/page/[...page].astro` route (mirroring the existing `src/pages/posts/[...page].astro` pattern) serves pages 2+, and overrides its own "prev" link on page 2 to point back at `/` since Astro's `paginate()` doesn't know page 1 lives outside its own directory.

**Tech Stack:** Astro 7 (content collections, `paginate()`), no test runner in this repo — verification is via `pnpm run build` (runs `astro check` + `astro build`) plus manual inspection of generated `dist/` output.

---

### Task 1: Extract `getRecentPosts` util

**Files:**
- Create: `src/utils/getRecentPosts.ts`

- [ ] **Step 1: Write the util**

```ts
import type { CollectionEntry } from "astro:content";
import { getSortedPosts } from "./getSortedPosts";

/**
 * Sorted posts with data.featured falsy — the set shown under
 * "Recent Posts" on the landing page and paginated at /page/N.
 */
export function getRecentPosts(posts: CollectionEntry<"posts">[]) {
  return getSortedPosts(posts).filter(({ data }) => !data.featured);
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec astro check`
Expected: no errors mentioning `getRecentPosts.ts`

- [ ] **Step 3: Commit**

```bash
git add src/utils/getRecentPosts.ts
git commit -m "add(utils): extract getRecentPosts helper"
```

---

### Task 2: Loosen `Pagination.astro`'s prop type

**Files:**
- Modify: `src/components/Pagination.astro`

**Context:** Currently typed `page: Page<CollectionEntry<"posts">>` (from `astro`/`astro:content`), but the component only ever reads `page.currentPage`, `page.lastPage`, `page.url.prev`, `page.url.next`. Narrowing the prop type to exactly those fields lets both a hand-built page-1 object (Task 3) and Astro's real `Page` objects (already used by `/posts` and the new `/page/N` route) satisfy it — a real `Page<T>` has strictly more fields, so it's still assignable.

- [ ] **Step 1: Replace the type import and Props type**

In `src/components/Pagination.astro`, replace:

```astro
---
import type { Page } from "astro";
import type { CollectionEntry } from "astro:content";
import IconArrowLeft from "@/assets/icons/IconArrowLeft.svg";
import IconArrowRight from "@/assets/icons/IconArrowRight.svg";
import LinkButton from "./LinkButton.astro";
import { useTranslations } from "@/i18n";

type Props = {
  page: Page<CollectionEntry<"posts">>;
};
```

with:

```astro
---
import IconArrowLeft from "@/assets/icons/IconArrowLeft.svg";
import IconArrowRight from "@/assets/icons/IconArrowRight.svg";
import LinkButton from "./LinkButton.astro";
import { useTranslations } from "@/i18n";

export type PaginationInfo = {
  currentPage: number;
  lastPage: number;
  url: {
    prev?: string;
    next?: string;
  };
};

type Props = {
  page: PaginationInfo;
};
```

The rest of the file (markup, `const { page } = Astro.props;`, etc.) is unchanged.

- [ ] **Step 2: Typecheck existing caller still compiles**

Run: `pnpm exec astro check`
Expected: no errors — `src/pages/posts/[...page].astro` still passes a real `Page<CollectionEntry<"posts">>`, which structurally satisfies `PaginationInfo`.

- [ ] **Step 3: Commit**

```bash
git add src/components/Pagination.astro
git commit -m "refactor(pagination): decouple Pagination props from Astro's Page<T>"
```

---

### Task 3: Paginate the landing page's Recent Posts (page 1 at `/`)

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Update imports and computed values**

Replace:

```astro
import Card from "@/components/Card.astro";
import LinkButton from "@/components/LinkButton.astro";
import { getSortedPosts } from "@/utils/getSortedPosts";
import { useTranslations } from "@/i18n";
import config from "@/config";

const { socials, posts: postsConfig } = config;

const locale = Astro.currentLocale ?? config.site.lang;
const t = useTranslations(locale);

const posts = await getCollection("posts");
const sortedPosts = getSortedPosts(posts);
const featuredPosts = sortedPosts.filter(({ data }) => data.featured);
const recentPosts = sortedPosts.filter(({ data }) => !data.featured);
const homePath = getRelativeLocaleUrl(locale, "");
```

with:

```astro
import Card from "@/components/Card.astro";
import LinkButton from "@/components/LinkButton.astro";
import Pagination from "@/components/Pagination.astro";
import type { PaginationInfo } from "@/components/Pagination.astro";
import { getSortedPosts } from "@/utils/getSortedPosts";
import { getRecentPosts } from "@/utils/getRecentPosts";
import { useTranslations } from "@/i18n";
import config from "@/config";

const { socials, posts: postsConfig } = config;

const locale = Astro.currentLocale ?? config.site.lang;
const t = useTranslations(locale);

const posts = await getCollection("posts");
const sortedPosts = getSortedPosts(posts);
const featuredPosts = sortedPosts.filter(({ data }) => data.featured);
const recentPosts = getRecentPosts(posts);
const homePath = getRelativeLocaleUrl(locale, "");

const recentPageInfo: PaginationInfo = {
  currentPage: 1,
  lastPage: Math.max(1, Math.ceil(recentPosts.length / postsConfig.perIndex)),
  url: {
    next:
      recentPosts.length > postsConfig.perIndex
        ? getRelativeLocaleUrl(locale, "page/2")
        : undefined,
  },
};
```

- [ ] **Step 2: Render the pager under the Recent Posts list**

Replace:

```astro
    {
      recentPosts.length > 0 && (
        <section id="recent-posts" class="pt-12 pb-6">
          <h2 class="text-2xl font-semibold tracking-wide">
            {t.home.recentPosts}
          </h2>
          <ul>
            {recentPosts.slice(0, postsConfig.perIndex).map(data => (
              <Card variant="h3" {...data} />
            ))}
          </ul>
        </section>
      )
    }
```

with:

```astro
    {
      recentPosts.length > 0 && (
        <section id="recent-posts" class="pt-12 pb-6">
          <h2 class="text-2xl font-semibold tracking-wide">
            {t.home.recentPosts}
          </h2>
          <ul>
            {recentPosts.slice(0, postsConfig.perIndex).map(data => (
              <Card variant="h3" {...data} />
            ))}
          </ul>
          <Pagination page={recentPageInfo} />
        </section>
      )
    }
```

- [ ] **Step 3: Build and verify**

Run: `pnpm run build`
Expected: build succeeds; since `recentPosts` is currently empty (all 13 posts are `featured: true`), the Recent Posts section and pager don't render at all — check `dist/index.html` has no `id="recent-posts"`:

Run: `grep -c 'id="recent-posts"' dist/index.html`
Expected: `0`

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(home): paginate Recent Posts section"
```

---

### Task 4: Add `/page/N` route for Recent Posts pages 2+

**Files:**
- Create: `src/pages/page/[...page].astro`

- [ ] **Step 1: Write the route**

```astro
---
import type { GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { getRelativeLocaleUrl } from "astro:i18n";
import Layout from "@/layouts/Layout.astro";
import Header from "@/components/Header.astro";
import Breadcrumb from "@/components/Breadcrumb.astro";
import Main from "@/components/Main.astro";
import Card from "@/components/Card.astro";
import Footer from "@/components/Footer.astro";
import Pagination from "@/components/Pagination.astro";
import type { PaginationInfo } from "@/components/Pagination.astro";
import { getRecentPosts } from "@/utils/getRecentPosts";
import { useTranslations } from "@/i18n";
import config from "@/config";

export const getStaticPaths = (async ({ paginate }) => {
  const posts = await getCollection("posts");
  const recentPosts = getRecentPosts(posts);
  // Drop the first page — it's served at "/" by index.astro, not here.
  return paginate(recentPosts, { pageSize: config.posts.perIndex }).slice(1);
}) satisfies GetStaticPaths;

const { page } = Astro.props;

const locale = Astro.currentLocale ?? config.site.lang;
const t = useTranslations(locale);

const pageInfo: PaginationInfo = {
  currentPage: page.currentPage,
  lastPage: page.lastPage,
  url: {
    // Astro's paginate() thinks page 1 lives at "/page" (this directory's
    // own base) since it doesn't know page 1 actually lives at "/".
    prev:
      page.currentPage === 2
        ? getRelativeLocaleUrl(locale, "")
        : (page.url.prev ?? undefined),
    next: page.url.next ?? undefined,
  },
};
---

<Layout title={`${t.home.recentPosts} | ${config.site.title}`}>
  <Header />

  <Breadcrumb />

  <Main pageTitle={t.home.recentPosts}>
    <ul>
      {page.data.map(data => <Card variant="h3" {...data} />)}
    </ul>
  </Main>

  <Pagination page={pageInfo} />

  <Footer noMarginTop={pageInfo.lastPage > 1} />
</Layout>
```

- [ ] **Step 2: Build and verify no pages generated yet (recentPosts is empty)**

Run: `pnpm run build`
Expected: build succeeds; `dist/page/` does not exist (nothing to paginate since all posts are featured today).

Run: `test -d dist/page && echo EXISTS || echo ABSENT`
Expected: `ABSENT`

- [ ] **Step 3: Temporarily verify pagination actually works**

This route can't be exercised by the current content (all posts are `featured: true`). Confirm the logic directly instead of relying on content: temporarily flip one post's `featured` to `false` in a scratch copy, rebuild, inspect, then revert — do NOT commit the content change.

```bash
cp src/content/posts/nist-sp-800-204-series.md /tmp/nist-sp-800-204-series.md.bak
sed -i '' 's/^featured: true$/featured: false/' src/content/posts/nist-sp-800-204-series.md
pnpm run build
```

Run: `grep -c 'recent-posts' dist/index.html`
Expected: `1` (section now renders since recentPosts.length > 0)

Restore the content file:

```bash
cp /tmp/nist-sp-800-204-series.md.bak src/content/posts/nist-sp-800-204-series.md
rm /tmp/nist-sp-800-204-series.md.bak
pnpm run build
```

Run: `git status --short src/content/posts/nist-sp-800-204-series.md`
Expected: empty output (file restored, no diff)

- [ ] **Step 4: Commit**

```bash
git add src/pages/page/
git commit -m "feat(home): add /page/N route for Recent Posts pagination"
```

---

### Task 5: Breadcrumb label for `/page/N`

**Files:**
- Modify: `src/components/Breadcrumb.astro`

**Context:** Without this, `/page/2` renders breadcrumb "Home » Page » 2" (raw untranslated "page" segment). The file already has this exact pattern for `/posts/N` and `/tags/x/N` — add a third case.

- [ ] **Step 1: Add the special case**

In `src/components/Breadcrumb.astro`, after the existing `posts` block:

```astro
// if breadcrumb is Home > Posts > [page] <etc>
// replace Posts with localized "Posts (page number)"
if (breadcrumbList[0] === "posts") {
  breadcrumbList.splice(
    0,
    2,
    `${t.nav.posts} (${t.pagination.page.toLowerCase()} ${breadcrumbList[1] || 1})`
  );
}
```

add:

```astro
// if breadcrumb is Home > Page > [N]
// replace Page > [N] with localized "Recent Posts (page number)"
if (breadcrumbList[0] === "page") {
  breadcrumbList.splice(
    0,
    2,
    `${t.home.recentPosts} (${t.pagination.page.toLowerCase()} ${breadcrumbList[1] || 1})`
  );
}
```

- [ ] **Step 2: Build and verify**

Run: `pnpm run build`
Expected: build succeeds (no content currently reaches `/page/N`, this is a compile/typecheck-only check at this point).

- [ ] **Step 3: Commit**

```bash
git add src/components/Breadcrumb.astro
git commit -m "fix(breadcrumb): label /page/N as Recent Posts (page N)"
```

---

### Task 6: Reorganize `TAG_GROUPS`

**Files:**
- Modify: `src/utils/tagGroups.ts`
- Modify: `src/content/posts/relationship-between-nist-sp-800-218-and-sp-800-204-d.md`

- [ ] **Step 1: Rewrite `TAG_GROUPS`**

Replace the full contents of `src/utils/tagGroups.ts`:

```ts
export type TagGroupConfig = {
  name: string;
  tags: string[];
};

/**
 * Static grouping of tags by theme, shown on the tags index page.
 * Matched against post tags by slug, so entries here can use their
 * original (non-slugified) label from post frontmatter.
 */
export const TAG_GROUPS: TagGroupConfig[] = [
  {
    name: "NIST & Compliance",
    tags: [
      "NIST",
      "NIST SP 800-30",
      "NIST SP 800-37(RMF)",
      "NIST SP 800-39",
      "NIST SP 800-53",
      "FIPS 199&200",
      "OSCAL",
      "OSCAL Compass",
      "Risk",
      "Contribution",
    ],
  },
  {
    name: "Software Supply Chain & DevSecOps",
    tags: [
      "DevSecOps",
      "CNCF",
      "SSDF",
      "NIST SP 800-218",
      "NIST SP 800-204",
      "NIST SP 800-204D",
      "Microservices",
      "CI/CD",
      "CI/CD Security",
    ],
  },
  {
    name: "DoD & Military",
    tags: ["DoD", "DoDD 3000.09", "Army FM 3-60"],
  },
  {
    name: "AI & Threat Ops",
    tags: [
      "AI",
      "AI SOC",
      "SOC",
      "Red Team",
      "F3EAD",
      "threat-modeling",
      "STRIDE",
      "Incident Response",
      "Vulnerability Response",
      "Playbook",
      "CACAO Playbook",
      "OASIS",
      "CISA",
      "Detection",
      "Detection as Code",
    ],
  },
  {
    name: "Site",
    tags: ["meta", "dev"],
  },
];
```

- [ ] **Step 2: Fix the `CI/CD ` trailing-space typo**

In `src/content/posts/relationship-between-nist-sp-800-218-and-sp-800-204-d.md`, in the frontmatter `tags:` list, change:

```yaml
  - CI/CD 
```

to:

```yaml
  - CI/CD
```

- [ ] **Step 3: Build and verify no tag lands in "Other"**

Run: `pnpm run build`
Expected: build succeeds.

Run: `grep -o '>Other<' dist/tags/index.html | head -1`
Expected: no output (empty) — confirms no leftover/unclassified tag group rendered.

Run: `grep -c 'CI/CD ' dist/tags/index.html`
Expected: `0` (no trailing-space label left in the rendered output; note the plain `CI/CD` tag without trailing space will still match `CI/CD` as a substring of `CI/CD Security` — this grep specifically checks for `CI/CD ` followed by a non-`S` boundary is unreliable, so instead visually confirm via Step 4)

- [ ] **Step 4: Manual visual check**

Run: `pnpm run preview &` then open `http://localhost:4321/tags` (or the configured base path) in a browser and confirm:
- A "Software Supply Chain & DevSecOps" group exists with 9 tags.
- "DoD & Military" group has exactly 3 tags (DoD, DoDD 3000.09, Army FM 3-60).
- No "Other" group is present.
- The `CI/CD` tag pill has no visible trailing space/gap.

Stop the preview server (`kill %1` or Ctrl-C).

- [ ] **Step 5: Commit**

```bash
git add src/utils/tagGroups.ts src/content/posts/relationship-between-nist-sp-800-218-and-sp-800-204-d.md
git commit -m "fix(tags): reorganize tag groups, fix CI/CD trailing-space typo"
```

---

### Task 7: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full CI-equivalent check**

Run: `pnpm run lint && pnpm run format:check && pnpm run build`
Expected: all three succeed with no errors.

- [ ] **Step 2: Confirm working tree is clean except intended commits**

Run: `git status`
Expected: `nothing to commit, working tree clean` (all changes from Tasks 1–6 already committed).

- [ ] **Step 3: Push**

```bash
git push
```
