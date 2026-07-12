"use client";

import { useState } from "react";
import { plans, Plan } from "@/lib/plans";
import PlanCard from "./PlanCard";
import CheckoutModal from "./CheckoutModal";

export default function PricingSection() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  return (
    <section id="planos" className="container-px mx-auto max-w-6xl py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
          Escolha o plano ideal para o seu bot
        </h2>
        <p className="mt-3 text-white/60">
          Todos os planos incluem deploy instantâneo, suporte e segurança
          garantida.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} onSelect={setSelectedPlan} />
        ))}
      </div>

      {selectedPlan && (
        <CheckoutModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
        />
      )}
    </section>
  );
}
