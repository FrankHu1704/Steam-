import type { MetadataRoute } from "next";

// Blocks known AI-training/scraping crawlers outright (they ignore
// "disallow" on a shared rule with allow:"/", so each needs its own rule
// with disallow:"/") while regular search engines (Google, Bing, etc.)
// keep full access for normal indexing/SEO.
const AI_TRAINING_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "CCBot",
  "Google-Extended",
  "anthropic-ai",
  "ClaudeBot",
  "Claude-Web",
  "Bytespider",
  "PerplexityBot",
  "Applebot-Extended",
  "Amazonbot",
  "Diffbot",
  "cohere-ai",
  "Omgilibot",
  "FacebookBot",
  "Meta-ExternalAgent",
  "Timpibot",
  "ImagesiftBot",
  "YouBot",
];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pagaja.site";
  return {
    rules: [
      // Private areas (/admin, /dashboard, /account, /api) are intentionally
      // NOT listed here — this file is public, and a "Disallow" entry would
      // just advertise those paths to anyone reading it. They're kept out
      // of search results via a noindex response header/meta tag instead
      // (see each area's layout.tsx), and out of reach entirely by auth.
      {
        userAgent: "*",
        allow: "/",
      },
      ...AI_TRAINING_BOTS.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
