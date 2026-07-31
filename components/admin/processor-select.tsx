"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select } from "@/components/ui/select";
import { updateSetting } from "@/lib/actions/admin";
import type { PaymentProviderName } from "@/lib/payments";

const PROVIDER_LABEL: Record<PaymentProviderName, string> = {
  debito_pay: "Debito Pay",
  zumbopay: "ZumboPay",
  netshop: "NetShop",
};

export function ProcessorSelect({ active }: { active: PaymentProviderName }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleChange(next: PaymentProviderName) {
    if (next === active) return;
    if (
      !confirm(
        `Mudar o processador ativo para ${PROVIDER_LABEL[next]}? Novos checkouts e levantamentos automáticos passam a usar ${PROVIDER_LABEL[next]} imediatamente.`
      )
    ) {
      return;
    }
    setPending(true);
    const res = await updateSetting("payment_provider", next);
    setPending(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Processador ativo alterado para ${PROVIDER_LABEL[next]}.`);
      router.refresh();
    }
  }

  return (
    <Select
      value={active}
      disabled={pending}
      onChange={(e) => handleChange(e.target.value as PaymentProviderName)}
      className="w-56"
    >
      <option value="debito_pay">Debito Pay</option>
      <option value="zumbopay">ZumboPay</option>
      <option value="netshop">NetShop</option>
    </Select>
  );
}
