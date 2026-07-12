// Cliente mínimo para a API REST (PostgREST) do Supabase, sem dependências npm.
// Usa sempre a service_role key — nunca deve ser exposta ao browser.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assertConfigured() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados.");
  }
}

function baseHeaders(extra) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...(extra || {}),
  };
}

// INSERT / UPDATE / DELETE — path ex: "donations", "page_events"
async function supabaseRequest(path, options = {}) {
  assertConfigured();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: baseHeaders(options.headers),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase REST error ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// SELECT paginado — path ex: "donations?select=*&order=created_at.desc"
// range ex: "0-24" (itens 0 a 24, inclusive)
async function supabaseSelect(path, { range } = {}) {
  assertConfigured();
  const headers = baseHeaders();
  if (range) {
    headers["Range-Unit"] = "items";
    headers["Range"] = range;
    headers["Prefer"] = "count=exact";
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase REST error ${res.status}: ${text}`);
  }
  const data = await res.json();
  let total = null;
  const contentRange = res.headers.get("content-range"); // "0-24/137"
  if (contentRange && contentRange.includes("/")) {
    const totalStr = contentRange.split("/")[1];
    total = totalStr === "*" ? null : parseInt(totalStr, 10);
  }
  return { data, total };
}

// Contagem exacta e barata (não transfere linhas) — path ex: "page_events?event=eq.pageview"
async function supabaseCount(path) {
  assertConfigured();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { ...baseHeaders(), Prefer: "count=exact", Range: "0-0" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase REST error ${res.status}: ${text}`);
  }
  const contentRange = res.headers.get("content-range");
  if (contentRange && contentRange.includes("/")) {
    const totalStr = contentRange.split("/")[1];
    return totalStr === "*" ? 0 : parseInt(totalStr, 10);
  }
  return 0;
}

module.exports = { supabaseRequest, supabaseSelect, supabaseCount };
