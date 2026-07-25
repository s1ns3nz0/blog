# Info-Only Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/` into an info/contact-only landing page (hero framing + short bio + Socials), removing the Featured/Recent Posts/All-posts sections, and delete the now-dead `/page/N` pagination route that existed only to serve the landing page's Recent Posts pager.

**Architecture:** `src/pages/index.astro` stops touching the posts collection entirely — no more `getCollection`, `getSortedPosts`, `getRecentPosts`, `Card`, `Pagination`. The hero section keeps its title/RSS/Socials but gets a new, shorter bio paragraph and drops the "explore tags page" link. `src/pages/page/[...page].astro`, `src/utils/getRecentPosts.ts`, and the `/page/N`-specific breadcrumb case are deleted since nothing links to that route anymore. `src/components/Pagination.astro` (and its `PaginationInfo` type) stay untouched — `/posts` and `/tags/[tag]` still use them.

**Tech Stack:** Astro 7. No test runner in this repo — verification is via `pnpm run build` (runs `astro check` + `astro build`) plus inspecting `dist/` output.

---

### Task 1: Strip post listings from the landing page

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Replace the entire file**

Replace the full contents of `src/pages/index.astro` with:

```astro
---
import { getRelativeLocaleUrl } from "astro:i18n";
import IconRss from "@/assets/icons/IconRss.svg";
import Layout from "@/layouts/Layout.astro";
import Header from "@/components/Header.astro";
import Footer from "@/components/Footer.astro";
import Socials from "@/components/Socials.astro";
import { useTranslations } from "@/i18n";
import config from "@/config";

const { socials } = config;

const locale = Astro.currentLocale ?? config.site.lang;
const t = useTranslations(locale);

const homePath = getRelativeLocaleUrl(locale, "");
---

<Layout>
  <Header />
  <main
    id="main-content"
    data-layout="index"
    data-home-path={homePath}
    class="app-layout"
  >
    <section id="hero" class="pt-10 pb-8">
      <div class="flex items-center gap-3">
        <p class="text-muted-foreground font-mono text-sm tracking-wide">
          s1ns3nz0 / field notes
        </p>
        <a
          target="_blank"
          href={`${import.meta.env.BASE_URL.replace(/\/?$/, "/")}rss.xml`}
          class="inline-flex items-center"
          aria-label="RSS Feed"
          title="RSS Feed"
        >
          <IconRss
            width={16}
            height={16}
            class="stroke-accent stroke-3 rtl:-rotate-90"
          />
          <span class="sr-only">RSS Feed</span>
        </a>
      </div>
      <h1
        class="hollow-fill my-4 text-6xl leading-[0.95] font-extrabold tracking-tight sm:my-6 sm:text-8xl"
      >
        <span class="block">Known</span>
        <span class="text-hollow block">Unknowns</span>
      </h1>

      <p>
        Hi, I'm <strong>s1ns3nz0</strong>. New tools and techniques come out
        faster than I can absorb them, so this blog is where I write down the
        known unknowns — things I'm learning, debugging stories, and notes I
        wish I'd found earlier.
      </p>
      {
        socials.length > 0 && (
          <div class="mt-1 flex max-sm:flex-col sm:items-center">
            <div class="me-2 mb-1 whitespace-nowrap sm:mb-0">
              {t.home.socialLinks}:
            </div>
            <Socials />
          </div>
        )
      }
    </section>
  </main>
  <Footer />
</Layout>

<script>
  document.addEventListener("astro:page-load", () => {
    const indexLayout = (document.querySelector("#main-content") as HTMLElement)
      ?.dataset;
    const baseRoot = import.meta.env.BASE_URL.replace(/\/?$/, "/");
    if (indexLayout?.layout) {
      sessionStorage.setItem("backUrl", indexLayout.homePath ?? baseRoot);
    }
  });
</script>
```

Note: the hero `<section>`'s `border-border border-b` classes are dropped along with `pt-10 pb-8` staying — that border existed to visually separate the hero from the Featured/Recent Posts sections below it; with those sections gone, a border with nothing under it would look like a stray line above empty space.

- [ ] **Step 2: Build and verify**

Run: `pnpm run build`
Expected: build succeeds.

Run: `grep -c 'id="featured"\|id="recent-posts"' dist/index.html`
Expected: `0`

Run: `grep -c 'New tools and techniques' dist/index.html`
Expected: `1`

Run: `grep -c 'Known' dist/index.html` (site title still present)
Expected: at least `1`

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(home): make landing page info/contact-only"
```

---

### Task 2: Remove the dead `/page/N` pagination route and its landing-only helpers

**Files:**
- Delete: `src/pages/page/[...page].astro`
- Delete: `src/utils/getRecentPosts.ts`
- Modify: `src/components/Breadcrumb.astro`

**Context:** `src/pages/page/[...page].astro` was built specifically to serve `/page/2`, `/page/3`, etc. for the landing page's Recent Posts pager (removed in Task 1). Nothing links to it anymore, so it's dead code — it would never be reached by a user, and its `getStaticPaths` would just paginate an unused code path. `src/utils/getRecentPosts.ts`'s only consumers were that route and the old `index.astro` (already changed in Task 1) — deleting it too. `src/components/Pagination.astro` and its `PaginationInfo` type are NOT touched — `src/pages/posts/[...page].astro` and `src/pages/tags/[tag]/[...page].astro` still use them.

- [ ] **Step 1: Delete the two files**

```bash
git rm src/pages/page/[...page].astro
git rm src/utils/getRecentPosts.ts
```

- [ ] **Step 2: Remove the now-unreachable breadcrumb case**

In `src/components/Breadcrumb.astro`, remove this block (it existed only to label the now-deleted `/page/N` route):

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

Leave the adjacent `posts` and `tags` blocks untouched.

- [ ] **Step 3: Build and verify no regressions**

Run: `pnpm run build`
Expected: build succeeds, 0 errors.

Run: `test -d dist/page && echo EXISTS || echo ABSENT`
Expected: `ABSENT`

Run: `grep -c 'Posts (page 2)' dist/posts/2/index.html` (only if `dist/posts/2/index.html` exists — check with `test -f dist/posts/2/index.html && echo yes || echo no` first; if `no`, skip this check, it just means there currently aren't enough posts for a second `/posts` page)
Expected (if the file exists): `1` — confirms the adjacent `posts` breadcrumb case still works after removing the `page` case next to it.

- [ ] **Step 4: Commit**

```bash
git add -A src/pages/page src/utils/getRecentPosts.ts src/components/Breadcrumb.astro
git commit -m "chore: remove dead /page/N pagination route"
```

---

### Task 3: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full CI-equivalent check**

Run: `pnpm run lint`
Expected: only the 4 pre-existing `no-console` errors in `scripts/new-post.js` (unrelated to this work — confirm with `git log -1 -- scripts/new-post.js` that it wasn't touched by Tasks 1-2). No new errors.

Run: `pnpm exec prettier --check src/pages/index.astro src/components/Breadcrumb.astro`
Expected: passes (these are the two files this plan actually edited; `src/pages/index.astro` was rewritten from scratch in Task 1 so should be clean, unlike its pre-existing pre-this-plan formatting issue).

Run: `pnpm run build`
Expected: succeeds, 0 errors.

- [ ] **Step 2: Regression spot-check on retained pagination**

Run: `pnpm exec astro check`
Expected: 0 errors (2 pre-existing unrelated `pinnedTags` deprecation hints are fine).

Confirm `src/pages/posts/[...page].astro` and `src/pages/tags/[tag]/[...page].astro` still import and use `Pagination`/`PaginationInfo` without modification: `git diff master -- src/pages/posts src/pages/tags` should be empty (this plan never touches those files).

- [ ] **Step 3: Confirm working tree clean and push**

Run: `git status`
Expected: `nothing to commit, working tree clean`

```bash
git push
```
