import { redirect } from "next/navigation";

// Marketplace retired — no product browsing/discovery page anymore. Each
// producer's product still has its own working checkout page (/p/[slug]),
// shared directly by them; this route only exists so old links/bookmarks
// don't 404.
export default function MarketplacePage() {
  redirect("/");
}
