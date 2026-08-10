// Deliberately empty — a sitemap is a ready-made list of every URL on the
// site, an easy target for bulk scraping. Product pages are still public
// and reachable via the marketplace; they just aren't handed out in one
// file anymore. Costs some search-engine discovery speed, which is the
// accepted tradeoff here.
export async function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- TENTANDO HACKEAR O SISTEMA DA FRANK AI SOLUTIONS? 😁😂 nunca irás conseguir -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
