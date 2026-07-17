---
title: NIST SP 800-30
description: Risk.
pubDatetime: 2026-07-17T22:47:29+09:00
tags:
  - Risk Assessment
  - NIST
featured: true
---

First post. This blog is built with [Astro](https://astro.build/) on the [AstroPaper](https://github.com/satnaing/astro-paper) theme, customized with an image-card post feed and tag-driven navigation.

## Table of contents

## How posts are organized

Every post carries one or more `tags` in its frontmatter, and tags do all the grouping:

- Each tag gets its own feed at `/tags/<tag>/`.
- The [tags page](/tags/) lists every tag with a post count.
- The left sidebar (on wide screens) lists tag groups and all tags with counts. Tags pinned via `nav.pinnedTags` in `astro-paper.config.ts` appear there as top-level groups.

## Writing a post

Drop a markdown file into `src/content/posts/`:

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

That's it — the card thumbnail is generated automatically unless an `ogImage` is provided.
