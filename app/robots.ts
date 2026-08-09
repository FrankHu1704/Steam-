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
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/account", "/admin", "/api"],
      },
      ...AI_TRAINING_BOTS.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
