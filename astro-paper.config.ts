import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    // Update when attaching a custom domain.
    url: "https://blog-psi-opal-13.vercel.app/",
    title: "s1ns3nz0 | Known Unknowns",
    description: "Tech articles by s1ns3nz0 — writing down the known unknowns.",
    author: "s1ns3nz0",
    profile: "https://github.com/s1ns3nz0",
    ogImage: "default-og.jpg",
    lang: "en",
    timezone: "Asia/Seoul",
    dir: "ltr",
  },
  posts: {
    perPage: 8,
    perIndex: 5,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: { enabled: false },
    search: "pagefind",
  },
  nav: {
    // Pinned tags appear as "Groups" at the top of the left sidebar,
    // acting as top-level post sections, e.g. ["dev", "retrospect"].
    pinnedTags: ["meta"],
  },
  giscus: {
    // To enable comments: make the GitHub repo public, turn on Discussions,
    // install https://github.com/apps/giscus, then copy repo/repoId/categoryId
    // from https://giscus.app/ and set enabled: true.
    enabled: false,
    repo: "",
    repoId: "",
    category: "Announcements",
    categoryId: "",
    mapping: "pathname",
    lang: "en",
  },
  socials: [
    { name: "github", url: "https://github.com/s1ns3nz0" },
    { name: "mail", url: "mailto:fjybjinsu2388@gmail.com" },
  ],
  shareLinks: [
    { name: "x", url: "https://x.com/intent/post?url=" },
    { name: "telegram", url: "https://t.me/share/url?url=" },
    { name: "mail", url: "mailto:?subject=See%20this%20post&body=" },
  ],
});
