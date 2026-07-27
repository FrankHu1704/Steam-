"use client";

import { useState } from "react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyzeProduct } from "@/lib/actions/ai";

export function AiAnalysisCard({
  productId,
  initialAnalysis,
  initialAnalysisAt,
}: {
  productId: string;
  initialAnalysis: string | null;
  initialAnalysisAt: string | null;
}) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [analysisAt, setAnalysisAt] = useState(initialAnalysisAt);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setPending(true);
    setError(null);
    const res = await analyzeProduct(productId);
    setPending(false);
    if (res.error) {
      setError(res.error);
    } else if (res.analysis) {
      setAnalysis(res.analysis);
      setAnalysisAt(new Date().toISOString());
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-semibold">Análise com IA</h2>
            <p className="text-xs text-muted-foreground">Dicas para melhorar este produto e vender mais.</p>
          </div>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={handleAnalyze} disabled={pending}>
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : analysis ? (
            <RefreshCw className="h-3.5 w-3.5" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {analysis ? "Analisar de novo" : "Analisar com IA"}
        </Button>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {analysis && (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-4">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{analysis}</p>
          {analysisAt && (
            <p className="mt-3 text-xs text-muted-foreground">
              Gerado em {new Date(analysisAt).toLocaleString("pt-MZ")}
            </p>
          )}
        </div>
      )}

      {!analysis && !pending && !error && (
        <p className="mt-4 text-sm text-muted-foreground">
          Clique em "Analisar com IA" para receber dicas sobre título, descrição, preço e conversão.
        </p>
      )}
    </div>
  );
}
