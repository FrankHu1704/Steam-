"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSetting } from "@/lib/actions/admin";

export function SettingsForm({
  withdrawalFeePercent,
  platformFeePercent,
  withdrawalMinimumAmount,
}: {
  withdrawalFeePercent: number;
  platformFeePercent: number;
  withdrawalMinimumAmount: number;
}) {
  const router = useRouter();
  const [withdrawalFee, setWithdrawalFee] = useState(String(withdrawalFeePercent));
  const [platformFee, setPlatformFee] = useState(String(platformFeePercent));
  const [minimumAmount, setMinimumAmount] = useState(String(withdrawalMinimumAmount));
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setSaved(false);
    await Promise.all([
      updateSetting("withdrawal_fee_percent", Number(withdrawalFee)),
      updateSetting("platform_fee_percent", Number(platformFee)),
      updateSetting("withdrawal_minimum_amount", Number(minimumAmount)),
    ]);
    setPending(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="withdrawal-fee">Taxa de levantamento (%)</Label>
        <Input
          id="withdrawal-fee"
          type="number"
          min={0}
          max={100}
          step="0.1"
          value={withdrawalFee}
          onChange={(e) => setWithdrawalFee(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="platform-fee">Taxa da plataforma (%)</Label>
        <Input
          id="platform-fee"
          type="number"
          min={0}
          max={100}
          step="0.1"
          value={platformFee}
          onChange={(e) => setPlatformFee(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="min-withdrawal">Valor mínimo para saque (MT)</Label>
        <Input
          id="min-withdrawal"
          type="number"
          min={0}
          step="1"
          value={minimumAmount}
          onChange={(e) => setMinimumAmount(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Guardar
      </Button>
      {saved && !pending && <p className="text-sm text-emerald-600">Definições guardadas.</p>}
    </form>
  );
}
