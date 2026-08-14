"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Quote, ShieldCheck, Clock, HelpCircle } from "lucide-react";
import type { CheckoutBlock } from "@/lib/checkout-blocks";

function CountdownTimer({ endsAt }: { endsAt: string }) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    function tick() {
      setRemainingMs(Math.max(0, new Date(endsAt).getTime() - Date.now()));
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (remainingMs == null) return null;
  if (remainingMs === 0) return null;

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span className="font-mono text-base font-bold tabular-nums">
      {days > 0 ? `${days}d ` : ""}
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  );
}

export function CheckoutBlocks({ blocks }: { blocks: CheckoutBlock[] }) {
  if (blocks.length === 0) return null;

  return (
    <div className="mt-6 space-y-6">
      {blocks.map((block) => {
        if (block.type === "benefits" && block.items.length > 0) {
          return (
            <div key={block.id} className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold">{block.title}</h2>
              <ul className="mt-3 space-y-2">
                {block.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        if (block.type === "testimonials" && block.items.length > 0) {
          return (
            <div key={block.id} className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold">{block.title}</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {block.items.map((item, i) => (
                  <div key={i} className="rounded-xl bg-muted/50 p-4">
                    <Quote className="h-4 w-4 text-muted-foreground" />
                    <p className="mt-2 text-sm">{item.text}</p>
                    <p className="mt-2 text-xs font-semibold text-muted-foreground">{item.name}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (block.type === "guarantee") {
          return (
            <div
              key={block.id}
              className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950"
            >
              <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                  Garantia de {block.days} dia{block.days === 1 ? "" : "s"}
                </p>
                <p className="mt-0.5 text-sm text-emerald-800 dark:text-emerald-300">{block.text}</p>
              </div>
            </div>
          );
        }

        if (block.type === "countdown") {
          return (
            <div key={block.id} className="flex items-center gap-3 rounded-2xl bg-brand-gradient p-5 text-white">
              <Clock className="h-6 w-6 shrink-0" />
              <div>
                <p className="text-sm font-medium text-white/90">{block.text}</p>
                <CountdownTimer endsAt={block.endsAt} />
              </div>
            </div>
          );
        }

        if (block.type === "faq" && block.items.length > 0) {
          return (
            <div key={block.id} className="rounded-2xl border border-border bg-card p-6">
              <h2 className="flex items-center gap-1.5 font-semibold">
                <HelpCircle className="h-4 w-4" /> {block.title}
              </h2>
              <div className="mt-3 space-y-2">
                {block.items.map((item, i) => (
                  <details key={i} className="rounded-lg border border-border p-3">
                    <summary className="cursor-pointer text-sm font-medium">{item.question}</summary>
                    <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
