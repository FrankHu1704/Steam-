"use client";

import { Plan } from "@/lib/plans";

export default function PlanCard({
  plan,
  onSelect,
}: {
  plan: Plan;
  onSelect: (plan: Plan) => void;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 transition hover:-translate-y-1 ${
        plan.popular
          ? "border-accent/50 bg-gradient-to-b from-accent/10 to-white/[0.03] shadow-lg shadow-accent/10"
          : "border-white/10 bg-white/[0.03] hover:border-primary/40"
      }`}
    >
      {plan.popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white shadow">
          Mais Popular
        </span>
      )}

      <h3 className="text-xl font-bold text-white">{plan.name}</h3>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-3xl font-extrabold text-white">
          {plan.price}
        </span>
        <span className="text-sm text-white/50">MT/mês</span>
      </div>

      <ul className="mt-5 flex-1 space-y-2 text-sm text-white/70">
        <li className="flex items-center gap-2">
          <span className="text-primary-light">▸</span> Memória: {plan.memory}
        </li>
        <li className="flex items-center gap-2">
          <span className="text-primary-light">▸</span> Armazenamento:{" "}
          {plan.storage}
        </li>
        <li className="flex items-center gap-2">
          <span className="text-primary-light">▸</span> CPU: {plan.cpu}
        </li>
      </ul>

      <button
        onClick={() => onSelect(plan)}
        className={`mt-6 w-full rounded-xl py-3 text-sm font-semibold transition ${
          plan.popular
            ? "bg-accent text-white hover:bg-accent-dark"
            : "bg-primary text-white hover:bg-primary-dark"
        }`}
      >
        Contratar Agora
      </button>
    </div>
  );
}
