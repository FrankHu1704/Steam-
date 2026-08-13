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
  { key: "iniciante", label: "Iniciante", icon: "🌱", threshold: 0, perk: "Bem-vindo à PayNow!" },
  { key: "bronze", label: "Bronze", icon: "🥉", threshold: 1, perk: "Primeira venda confirmada." },
  { key: "prata", label: "Prata", icon: "🥈", threshold: 10, perk: "10 vendas — já é um vendedor de confiança." },
  { key: "ouro", label: "Ouro", icon: "🥇", threshold: 50, perk: "50 vendas — entre os melhores da plataforma." },
  { key: "diamante", label: "Diamante", icon: "💎", threshold: 200, perk: "200 vendas — nível elite da PayNow." },
];

export interface AchievementProgress {
  totalSales: number;
  currentTier: AchievementTier;
  nextTier: AchievementTier | null;
  progressPercent: number;
}

export function tierForSalesCount(totalSales: number): AchievementProgress {
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

// PUBLIC_BADGE_TIER_KEYS marks which tiers earn a visible badge on the
// marketplace (Ouro and above) — lower tiers stay dashboard-only.
export const PUBLIC_BADGE_MIN_INDEX = ACHIEVEMENT_TIERS.findIndex((t) => t.key === "ouro");

export async function getProducerAchievements(producerId: string): Promise<AchievementProgress> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("lifetime_sales_count")
    .eq("id", producerId)
    .single();

  return tierForSalesCount(profile?.lifetime_sales_count ?? 0);
}
