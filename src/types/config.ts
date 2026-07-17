interface SiteConfig {
  /** Deployed URL of the site, e.g. "https://example.com" */
  url: string;
  /** Blog title shown in header and meta tags */
  title: string;
  /** Short description used in SEO meta and RSS feed */
  description: string;
  /** Default post author name */
  author: string;
  /** Author profile URL (used in structured data) */
  profile?: string;
  /** Fallback OG image filename in /public, e.g. "og.jpg" */
  ogImage?: string;
  /** HTML lang attribute, defaults to "en" */
  lang?: string;
  /** IANA timezone for post dates, e.g. "Asia/Bangkok" */
  timezone?: string;
  /** Text direction */
  dir?: "ltr" | "rtl" | "auto";
  /** Google Search Console verification meta tag value */
  googleVerification?: string;
}

interface PostsConfig {
  /** Posts per page on paginated listing pages */
  perPage?: number;
  /** Posts shown on the index/home page */
  perIndex?: number;
  /**
   * Scheduled posts within this window (ms) of their pubDatetime
   * are shown as published. Defaults to 15 minutes.
   */
  scheduledPostMargin?: number;
}

interface FeaturesConfig {
  /** Enable light/dark mode toggle. Defaults to true. */
  lightAndDarkMode?: boolean;
  /**
   * Generate dynamic OG images per post and provide `/og.png` when the static
   * `public/{site.ogImage}` file is absent. When false, that file is required
   * for the default layout OG image (build fails if missing).
   */
  dynamicOgImage?: boolean;
  /** Show the /archives page and link it in nav. Defaults to true. */
  showArchives?: boolean;
  /** Show back button on post detail pages. Defaults to true. */
  showBackButton?: boolean;
  /** "Edit page" link shown on post detail pages. */
  editPost?:
    | {
        enabled: true;
        /** Base URL for the edit link, e.g. GitHub edit URL */
        url: string;
      }
    | { enabled: false };
  /**
   * Search provider. "pagefind" ships in the base template.
   * Set to false to disable search entirely.
   */
  search?: "pagefind" | false;
}

interface SocialLink {
  /**
   * Must match an SVG filename in src/assets/icons/socials/.
   * e.g. "github" → src/assets/icons/socials/github.svg
   */
  name: string;
  url: string;
  /**
   * Accessible label for the icon link (aria-label, title attribute).
   * Auto-generated if omitted: "{site.title} on GitHub", "Send an email to {site.title}", etc.
   * Override when the default wording doesn't fit.
   */
  linkTitle?: string;
}

interface ShareLink {
  /**
   * Must match an SVG filename in src/assets/icons/socials/.
   * e.g. "facebook" → src/assets/icons/socials/facebook.svg
   */
  name: string;
  /** Base share URL. The post URL will be appended as a query param. */
  url: string;
  /**
   * Accessible label for the icon link (aria-label, title attribute).
   * Auto-generated if omitted: "Share this post on Facebook", "Share this post via WhatsApp", etc.
   * Override when the default wording doesn't fit.
   */
  linkTitle?: string;
}

interface NavConfig {
  /**
   * Tags pinned in the header nav, acting as top-level post groups
   * (replaces a sidebar post list). Each entry links to /tags/<tag>/.
   * Use the tag name exactly as written in post frontmatter.
   */
  pinnedTags?: string[];
}

interface GiscusConfig {
  /** Master switch. Comments render only when true and repo/repoId/categoryId are set. */
  enabled: boolean;
  /** "owner/repo" with GitHub Discussions enabled and the giscus app installed */
  repo?: string;
  /** Repository ID from giscus.app */
  repoId?: string;
  /** Discussion category name, e.g. "Announcements" */
  category?: string;
  /** Discussion category ID from giscus.app */
  categoryId?: string;
  /** Page ↔ discussion mapping. Defaults to "pathname". */
  mapping?: string;
  /** giscus UI language. Defaults to "en". */
  lang?: string;
}

interface AstroPaperConfig {
  site: SiteConfig;
  posts?: PostsConfig;
  features?: FeaturesConfig;
  /** Header navigation extras */
  nav?: NavConfig;
  /** giscus (GitHub Discussions) comments on post pages */
  giscus?: GiscusConfig;
  /** Social profile links shown in header/footer */
  socials?: SocialLink[];
  /** Share links shown on post detail pages */
  shareLinks?: ShareLink[];
}

type ResolvedSiteConfig = Required<
  Pick<
    SiteConfig,
    | "url"
    | "title"
    | "description"
    | "author"
    | "lang"
    | "timezone"
    | "dir"
    | "ogImage"
  >
> &
  Pick<SiteConfig, "profile" | "googleVerification">;

export interface ResolvedAstroPaperConfig {
  site: ResolvedSiteConfig;
  posts: Required<PostsConfig>;
  features: Required<FeaturesConfig>;
  nav: Required<NavConfig>;
  giscus: GiscusConfig;
  socials: SocialLink[];
  shareLinks: ShareLink[];
}

/**
 * Type helper for astro-paper.config.ts.
 * Provides full IntelliSense without any runtime overhead.
 */
export function defineAstroPaperConfig(
  config: AstroPaperConfig
): AstroPaperConfig {
  return config;
}
