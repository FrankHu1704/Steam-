// Producer-customizable checkout page content — deliberately typed/
// structured data, never raw HTML/CSS/JS, same philosophy as
// lib/checkout-theme.ts's fixed color palette. Rendered through fixed
// React components (components/checkout/checkout-blocks.tsx), so there is
// no way for a producer to inject a script or a phishing-style layout
// onto a real payment page — they can only fill in the fields a given
// block type defines.

export interface BenefitsBlock {
  id: string;
  type: "benefits";
  title: string;
  items: string[];
}

export interface TestimonialsBlock {
  id: string;
  type: "testimonials";
  title: string;
  items: { name: string; text: string }[];
}

export interface GuaranteeBlock {
  id: string;
  type: "guarantee";
  days: number;
  text: string;
}

export interface CountdownBlock {
  id: string;
  type: "countdown";
  text: string;
  endsAt: string;
}

export interface FaqBlock {
  id: string;
  type: "faq";
  title: string;
  items: { question: string; answer: string }[];
}

export type CheckoutBlock = BenefitsBlock | TestimonialsBlock | GuaranteeBlock | CountdownBlock | FaqBlock;

export const CHECKOUT_BLOCK_TYPES = ["benefits", "testimonials", "guarantee", "countdown", "faq"] as const;
export type CheckoutBlockType = (typeof CHECKOUT_BLOCK_TYPES)[number];

export const CHECKOUT_BLOCK_LABELS: Record<CheckoutBlockType, string> = {
  benefits: "Benefícios",
  testimonials: "Depoimentos",
  guarantee: "Garantia",
  countdown: "Contagem decrescente",
  faq: "Perguntas frequentes",
};

export const MAX_BLOCKS_PER_PRODUCT = 8;
const MAX_TITLE_LEN = 80;
const MAX_TEXT_LEN = 300;

function trimTo(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function emptyBlock(type: CheckoutBlockType): CheckoutBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case "benefits":
      return { id, type, title: "O que vai receber", items: [] };
    case "testimonials":
      return { id, type, title: "O que dizem os clientes", items: [] };
    case "guarantee":
      return { id, type, days: 7, text: "Garantia de satisfação — devolução do dinheiro se não gostar." };
    case "countdown":
      return { id, type, text: "Oferta por tempo limitado", endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() };
    case "faq":
      return { id, type, title: "Perguntas frequentes", items: [] };
  }
}

// Server-side sanitization before ANY block content is persisted —
// enforces both the type shape and hard limits (item counts, string
// lengths) so this can never be abused to store an unbounded payload or
// smuggle something other than plain text into what's ultimately
// rendered on a real payment page.
export function sanitizeCheckoutBlocks(input: unknown): CheckoutBlock[] {
  if (!Array.isArray(input)) return [];
  const blocks: CheckoutBlock[] = [];

  for (const raw of input.slice(0, MAX_BLOCKS_PER_PRODUCT)) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const id = typeof r.id === "string" && r.id ? r.id : crypto.randomUUID();

    if (r.type === "benefits") {
      const items = Array.isArray(r.items) ? r.items.map((i) => trimTo(i, 150)).filter(Boolean).slice(0, 10) : [];
      blocks.push({ id, type: "benefits", title: trimTo(r.title, MAX_TITLE_LEN) || "O que vai receber", items });
    } else if (r.type === "testimonials") {
      const items = Array.isArray(r.items)
        ? r.items
            .map((i) => {
              const o = i as Record<string, unknown>;
              return { name: trimTo(o?.name, 60), text: trimTo(o?.text, MAX_TEXT_LEN) };
            })
            .filter((i) => i.name && i.text)
            .slice(0, 6)
        : [];
      blocks.push({ id, type: "testimonials", title: trimTo(r.title, MAX_TITLE_LEN) || "O que dizem os clientes", items });
    } else if (r.type === "guarantee") {
      const days = Number(r.days);
      blocks.push({
        id,
        type: "guarantee",
        days: Number.isFinite(days) ? Math.min(365, Math.max(1, Math.round(days))) : 7,
        text: trimTo(r.text, MAX_TEXT_LEN) || "Garantia de satisfação.",
      });
    } else if (r.type === "countdown") {
      const endsAt = typeof r.endsAt === "string" && !Number.isNaN(Date.parse(r.endsAt)) ? r.endsAt : null;
      if (!endsAt) continue;
      blocks.push({ id, type: "countdown", text: trimTo(r.text, 100) || "Oferta por tempo limitado", endsAt });
    } else if (r.type === "faq") {
      const items = Array.isArray(r.items)
        ? r.items
            .map((i) => {
              const o = i as Record<string, unknown>;
              return { question: trimTo(o?.question, 150), answer: trimTo(o?.answer, 500) };
            })
            .filter((i) => i.question && i.answer)
            .slice(0, 8)
        : [];
      blocks.push({ id, type: "faq", title: trimTo(r.title, MAX_TITLE_LEN) || "Perguntas frequentes", items });
    }
  }

  return blocks;
}
