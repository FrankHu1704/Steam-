import { createClient } from "@/lib/supabase/server";

export interface PrizeTier {
  key: string;
  label: string;
  threshold: number; // MZN, lifetime gross revenue
  prize: string;
  icon: string;
}

// Each threshold is its own prize a producer keeps once earned — reaching
// 1M MT also means they've earned the 25k/100k/500k prizes along the way.
// Physical items, so fulfillment is tracked manually by admin (see
// producer_prize_deliveries), not auto-granted like the sales-count badges
// in lib/data/achievements.ts.
export const PRIZE_TIERS: PrizeTier[] = [
  { key: "agenda_25k", label: "25 mil MT", threshold: 25_000, prize: "Agenda PagaJá", icon: "📔" },
  { key: "placa_100k", label: "100 mil MT", threshold: 100_000, prize: "Placa PagaJá", icon: "🏅" },
  { key: "placa_500k", label: "500 mil MT", threshold: 500_000, prize: "Placa PagaJá", icon: "🏆" },
  { key: "placa_1m", label: "1 milhão MT", threshold: 1_000_000, prize: "Placa PagaJá", icon: "👑" },
];

export interface PrizeProgress {
  lifetimeRevenue: number;
  earnedTiers: PrizeTier[];
  nextTier: PrizeTier | null;
  progressToNextPercent: number;
}

export function prizeProgressForRevenue(lifetimeRevenue: number): PrizeProgress {
  const earnedTiers = PRIZE_TIERS.filter((t) => lifetimeRevenue >= t.threshold);
  const nextTier = PRIZE_TIERS.find((t) => lifetimeRevenue < t.threshold) ?? null;
  const previousThreshold = earnedTiers.length > 0 ? earnedTiers[earnedTiers.length - 1].threshold : 0;

  const progressToNextPercent = nextTier
    ? Math.min(
        100,
        Math.round(((lifetimeRevenue - previousThreshold) / (nextTier.threshold - previousThreshold)) * 100)
      )
    : 100;

  return { lifetimeRevenue, earnedTiers, nextTier, progressToNextPercent };
}

export async function getProducerPrizeProgress(producerId: string): Promise<PrizeProgress> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("lifetime_revenue")
    .eq("id", producerId)
    .single();

  return prizeProgressForRevenue(profile?.lifetime_revenue ?? 0);
}

export interface PendingPrizeDelivery {
  producerId: string;
  producerName: string;
  producerEmail: string;
  producerPhone: string | null;
  lifetimeRevenue: number;
  tier: PrizeTier;
}

// Producers who crossed a threshold but have no delivery row for that tier
// yet — the admin's shipping checklist.
export async function getPendingPrizeDeliveries(): Promise<PendingPrizeDelivery[]> {
  const supabase = await createClient();
  const lowestThreshold = PRIZE_TIERS[0].threshold;

  const [{ data: producers }, { data: deliveries }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, email, phone, lifetime_revenue")
      .eq("role", "producer")
      .gte("lifetime_revenue", lowestThreshold),
    supabase.from("producer_prize_deliveries").select("producer_id, tier_key"),
  ]);

  const deliveredSet = new Set((deliveries ?? []).map((d) => `${d.producer_id}:${d.tier_key}`));

  const pending: PendingPrizeDelivery[] = [];
  for (const producer of producers ?? []) {
    for (const tier of PRIZE_TIERS) {
      if (producer.lifetime_revenue < tier.threshold) continue;
      if (deliveredSet.has(`${producer.id}:${tier.key}`)) continue;
      pending.push({
        producerId: producer.id,
        producerName: producer.name,
        producerEmail: producer.email,
        producerPhone: producer.phone,
        lifetimeRevenue: producer.lifetime_revenue,
        tier,
      });
    }
  }

  // Higher-value prizes first — those are the ones most worth shipping promptly.
  pending.sort((a, b) => b.tier.threshold - a.tier.threshold);
  return pending;
}

export interface DeliveredPrize {
  id: string;
  producerName: string;
  tier: PrizeTier;
  deliveredAt: string;
}

export async function getDeliveredPrizes(): Promise<DeliveredPrize[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("producer_prize_deliveries")
    .select("id, tier_key, delivered_at, profiles!producer_id(name)")
    .order("delivered_at", { ascending: false });

  return ((data ?? []) as unknown as { id: string; tier_key: string; delivered_at: string; profiles: { name: string } | null }[])
    .map((d) => ({
      id: d.id,
      producerName: d.profiles?.name ?? "—",
      tier: PRIZE_TIERS.find((t) => t.key === d.tier_key) ?? {
        key: d.tier_key,
        label: d.tier_key,
        threshold: 0,
        prize: d.tier_key,
        icon: "🎁",
      },
      deliveredAt: d.delivered_at,
    }));
}
