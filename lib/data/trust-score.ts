import { createClient } from "@/lib/supabase/server";

export interface TrustScoreCategory {
  label: string;
  points: number;
  max: number;
  percent: number;
  description: string;
}

export interface TrustScore {
  total: number;
  categories: TrustScoreCategory[];
}

// No KYC step in PayNow, so the 100 points are split across the three
// signals we can actually measure: sales history, account age, and the
// refund/dispute rate.
const SALES_HISTORY_MAX = 40;
const PLATFORM_TIME_MAX = 30;
const REFUND_INDEX_MAX = 30;
const SALES_FOR_FULL_SCORE = 20;
const DAYS_FOR_FULL_SCORE = 180;

export async function getTrustScore(producerId: string, createdAt: string): Promise<TrustScore> {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("status")
    .eq("producer_id", producerId)
    .in("status", ["paid", "refunded"]);

  const paidCount = (orders ?? []).filter((o) => o.status === "paid").length;
  const refundedCount = (orders ?? []).filter((o) => o.status === "refunded").length;
  const totalCount = paidCount + refundedCount;

  const salesHistoryPercent = Math.min(1, paidCount / SALES_FOR_FULL_SCORE);
  const salesHistoryPoints = Math.round(salesHistoryPercent * SALES_HISTORY_MAX);

  const daysOnPlatform = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  const platformTimePercent = Math.min(1, Math.max(0, daysOnPlatform) / DAYS_FOR_FULL_SCORE);
  const platformTimePoints = Math.round(platformTimePercent * PLATFORM_TIME_MAX);

  const refundRate = totalCount > 0 ? refundedCount / totalCount : 0;
  const refundIndexPercent = Math.max(0, 1 - refundRate);
  const refundIndexPoints = Math.round(refundIndexPercent * REFUND_INDEX_MAX);

  const categories: TrustScoreCategory[] = [
    {
      label: "Histórico de Vendas",
      points: salesHistoryPoints,
      max: SALES_HISTORY_MAX,
      percent: Math.round(salesHistoryPercent * 100),
      description: `Baseado nas suas ${paidCount} venda(s) confirmada(s).`,
    },
    {
      label: "Tempo na Plataforma",
      points: platformTimePoints,
      max: PLATFORM_TIME_MAX,
      percent: Math.round(platformTimePercent * 100),
      description: "Calculado automaticamente pela antiguidade da conta.",
    },
    {
      label: "Índice de Reembolso",
      points: refundIndexPoints,
      max: REFUND_INDEX_MAX,
      percent: Math.round(refundIndexPercent * 100),
      description: "Calculado pela média de reembolsos sobre vendas totais.",
    },
  ];

  return {
    total: salesHistoryPoints + platformTimePoints + refundIndexPoints,
    categories,
  };
}
