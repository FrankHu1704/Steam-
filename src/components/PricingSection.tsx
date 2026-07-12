"use client";

import { useState } from "react";
import { plans, Plan } from "@/lib/plans";
import PlanCard from "./PlanCard";
import CheckoutModal from "./CheckoutModal";
import TrialModal from "./TrialModal";

export default function PricingSection() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [trialOpen, setTrialOpen] = useState(false);

  function handleSelect(plan: Plan) {
    if (plan.id === "trial") {
      setTrialOpen(true);
    } else {
      setSelectedPlan(plan);
    }
  }

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
          <PlanCard key={plan.id} plan={plan} onSelect={handleSelect} />
        ))}
      </div>

      {selectedPlan && (
        <CheckoutModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
        />
      )}

      {trialOpen && <TrialModal onClose={() => setTrialOpen(false)} />}
    </section>
  );
}
