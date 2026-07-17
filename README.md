# Known Unknowns

Personal tech blog of **s1ns3nz0**, inspired by [junsong.xyz](https://junsong.xyz/).

Built with [Astro](https://astro.build/) on the [AstroPaper](https://github.com/satnaing/astro-paper) theme (MIT), customized with:

- **Image-card post feed** — thumbnail, tag chips, date, and reading time per post; thumbnails are auto-generated OG images unless a post provides its own.
- **Tag-driven navigation instead of a sidebar** — every tag gets a feed at `/tags/<tag>/`, the `/tags/` page lists all tags with counts, and main tags can be pinned into the header nav.
- **Reading time** — CJK-aware estimate (Korean/English mixed posts supported).
- **giscus comments** — GitHub Discussions-backed, disabled until configured.
- Pagefind search, RSS, sitemap, dark mode, dynamic OG images (from AstroPaper).

## Development

```sh
pnpm install
pnpm dev       # http://localhost:4321
pnpm build     # type-check + build + pagefind index
```

Requires Node ≥ 22.12.

## Writing a post

```sh
pnpm new-post "My Post Title"
```

Copies `hello-world.md` as a template into `src/content/posts/my-post-title.md`, swapping in the title you passed and `pubDatetime` set to the current time (KST, `+09:00`). Everything else (`description`, `tags`, `featured`, body) is copied as-is — edit it to fit the new post.

Or create the file manually:

```md
---
title: My Post
description: One-line summary shown on the card and in search results.
pubDatetime: 2026-07-17T21:00:00+09:00
tags:
  - dev
---

Content here.
```

Optional frontmatter: `featured: true` (pinned to the Featured section on home), `draft: true`, `modDatetime`, `ogImage` (custom thumbnail/share image).

## Configuration

Everything lives in `astro-paper.config.ts`:

- `site.url` — **update after connecting to Vercel** (or when attaching a custom domain).
- `nav.pinnedTags` — tags promoted into the header nav, e.g. `["dev", "retrospect"]`. These replace a sidebar as top-level post groups.
- `giscus` — comments. To enable:
  1. Make this repo public on GitHub and enable **Discussions**.
  2. Install the [giscus app](https://github.com/apps/giscus) on the repo.
  3. On [giscus.app](https://giscus.app/), select the repo and copy `repoId`, `category`, `categoryId`.
  4. Fill them in and set `enabled: true`.

## Deploy (Vercel)

1. Push this repo to GitHub.
2. On [vercel.com](https://vercel.com/), **Add New → Project**, import the repo. Vercel auto-detects Astro; no settings needed.
3. After the first deploy, copy the assigned URL into `site.url` in `astro-paper.config.ts` and push again (fixes RSS/OG/sitemap absolute URLs).

## License

Theme: [AstroPaper](https://github.com/satnaing/astro-paper), MIT (see `LICENSE`). Post content © s1ns3nz0.
