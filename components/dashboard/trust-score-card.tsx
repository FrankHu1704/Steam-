import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import type { TrustScore } from "@/lib/data/trust-score";

function ScoreRing({ percent }: { percent: number }) {
  const size = 120;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = percent >= 70 ? "stroke-emerald-500" : percent >= 40 ? "stroke-amber-500" : "stroke-destructive";

  return (
    <div className="relative h-[120px] w-[120px] shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} className="stroke-muted" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          className={color}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{percent}%</span>
        <span className="text-[10px] uppercase text-muted-foreground">Pontuação</span>
      </div>
    </div>
  );
}

export function TrustScoreCard({ score }: { score: TrustScore }) {
  const qualification = score.total >= 80 ? "Qualificação completa" : score.total >= 50 ? "Qualificação parcial" : "Conta nova";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Score de Confiança
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-6">
          <ScoreRing percent={score.total} />
          <div>
            <p className="font-semibold">{qualification}</p>
            <p className="text-sm text-muted-foreground">Score calculado com base na sua atividade na PagaJá.</p>
          </div>
        </div>

        <div className="space-y-4">
          {score.categories.map((cat) => (
            <div key={cat.label}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{cat.label}</span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {cat.points} / {cat.max} pts · {cat.percent}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${cat.percent}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{cat.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
