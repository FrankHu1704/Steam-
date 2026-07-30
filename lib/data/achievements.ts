import { createClient } from "@/lib/supabase/server";

export interface AchievementTier {
  key: string;
  label: string;
  icon: string;
  threshold: number;
  perk: string;
}

// Lifetime paid-sales count decides the tier — simple, hard to game, and
// visible progress the producer can chase. Ordered ascending by threshold.
export const ACHIEVEMENT_TIERS: AchievementTier[] = [
  { key: "iniciante", label: "Iniciante", icon: "🌱", threshold: 0, perk: "Bem-vindo à PagaJá!" },
  { key: "bronze", label: "Bronze", icon: "🥉", threshold: 1, perk: "Primeira venda confirmada." },
  { key: "prata", label: "Prata", icon: "🥈", threshold: 10, perk: "10 vendas — já é um vendedor de confiança." },
  { key: "ouro", label: "Ouro", icon: "🥇", threshold: 50, perk: "50 vendas — entre os melhores da plataforma." },
  { key: "diamante", label: "Diamante", icon: "💎", threshold: 200, perk: "200 vendas — nível elite da PagaJá." },
];

export interface AchievementProgress {
  totalSales: number;
  currentTier: AchievementTier;
  nextTier: AchievementTier | null;
  progressPercent: number;
}

export async function getProducerAchievements(producerId: string): Promise<AchievementProgress> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("producer_id", producerId)
    .eq("status", "paid");

  const totalSales = count ?? 0;

  let currentTier = ACHIEVEMENT_TIERS[0];
  for (const tier of ACHIEVEMENT_TIERS) {
    if (totalSales >= tier.threshold) currentTier = tier;
  }
  const currentIndex = ACHIEVEMENT_TIERS.findIndex((t) => t.key === currentTier.key);
  const nextTier = ACHIEVEMENT_TIERS[currentIndex + 1] ?? null;

  const progressPercent = nextTier
    ? Math.min(100, Math.round(((totalSales - currentTier.threshold) / (nextTier.threshold - currentTier.threshold)) * 100))
    : 100;

  return { totalSales, currentTier, nextTier, progressPercent };
}
