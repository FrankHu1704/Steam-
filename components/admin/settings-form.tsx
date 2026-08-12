"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Percent, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updateSetting } from "@/lib/actions/admin";

export function SettingsForm({
  withdrawalFeePercent,
  platformFeePercent,
  platformFixedFeeAmount,
  withdrawalMinimumAmount,
  paymentProvider,
  emolaChargeProvider,
  emolaEnabled,
  withdrawalsEnabled,
}: {
  withdrawalFeePercent: number;
  platformFeePercent: number;
  platformFixedFeeAmount: number;
  withdrawalMinimumAmount: number;
  paymentProvider: "debito_pay" | "zumbopay" | "netshop";
  emolaChargeProvider: "pagar" | "zumbopay" | "netshop" | "debito_pay" | "active";
  emolaEnabled: boolean;
  withdrawalsEnabled: boolean;
}) {
  const router = useRouter();
  const [withdrawalFee, setWithdrawalFee] = useState(String(withdrawalFeePercent));
  const [platformFee, setPlatformFee] = useState(String(platformFeePercent));
  const [fixedFee, setFixedFee] = useState(String(platformFixedFeeAmount));
  const [minimumAmount, setMinimumAmount] = useState(String(withdrawalMinimumAmount));
  const [provider, setProvider] = useState(paymentProvider);
  const [emolaProvider, setEmolaProvider] = useState(emolaChargeProvider);
  const [emolaOn, setEmolaOn] = useState(emolaEnabled);
  const [withdrawalsOn, setWithdrawalsOn] = useState(withdrawalsEnabled);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setSaved(false);
    await Promise.all([
      updateSetting("withdrawal_fee_percent", Number(withdrawalFee)),
      updateSetting("platform_fee_percent", Number(platformFee)),
      updateSetting("platform_fixed_fee_amount", Number(fixedFee)),
      updateSetting("withdrawal_minimum_amount", Number(minimumAmount)),
      updateSetting("payment_provider", provider),
      updateSetting("emola_charge_provider", emolaProvider),
      updateSetting("emola_enabled", emolaOn),
      updateSetting("withdrawals_enabled", withdrawalsOn),
    ]);
    setPending(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Percent className="h-4 w-4" /> Taxas
        </h3>
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
          <Label htmlFor="fixed-fee">Taxa fixa por venda (MT)</Label>
          <Input
            id="fixed-fee"
            type="number"
            min={0}
            step="0.1"
            value={fixedFee}
            onChange={(e) => setFixedFee(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Soma-se à taxa percentual acima. Útil para cobrir custos fixos por transação do processador de pagamento
            (ex.: Imposto de Selo). Deixe em 0 para não cobrar.
          </p>
        </div>
      </div>

      <div className="space-y-4 border-t border-border pt-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <CreditCard className="h-4 w-4" /> Pagamentos e Levantamentos
        </h3>
        <div className="space-y-1.5">
          <Label htmlFor="payment-provider">Processador de pagamento activo</Label>
          <Select
            id="payment-provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as "debito_pay" | "zumbopay" | "netshop")}
          >
            <option value="debito_pay">Debito Pay</option>
            <option value="zumbopay">ZumboPay</option>
            <option value="netshop">NetShop</option>
          </Select>
          <p className="text-xs text-muted-foreground">Define qual processador é usado no checkout da PagaJá.</p>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
          <div>
            <Label htmlFor="emola-enabled">e-Mola disponível no checkout</Label>
            <p className="text-xs text-muted-foreground">
              Desligue para tirar o e-Mola das opções de pagamento em todo o site — útil se todos os processadores
              de e-Mola estiverem indisponíveis ao mesmo tempo (ex.: conta bloqueada, integração com falhas).
            </p>
          </div>
          <Switch id="emola-enabled" checked={emolaOn} onChange={(e) => setEmolaOn(e.target.checked)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="emola-provider">e-Mola processado via</Label>
          <Select
            id="emola-provider"
            value={emolaProvider}
            disabled={!emolaOn}
            onChange={(e) =>
              setEmolaProvider(e.target.value as "pagar" | "zumbopay" | "netshop" | "debito_pay" | "active")
            }
          >
            <option value="pagar">Pagar (padrão)</option>
            <option value="zumbopay">ZumboPay</option>
            <option value="netshop">NetShop</option>
            <option value="debito_pay">Debito Pay</option>
            <option value="active">Processador ativo (acima)</option>
          </Select>
          <p className="text-xs text-muted-foreground">
            Escolhe qual processador trata só o e-Mola, sem mudar o processador ativo acima (que continua a servir
            M-Pesa/mKesh/cartão). "Processador ativo" faz o e-Mola seguir esse mesmo processador em vez de um fixo.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
          <div>
            <Label htmlFor="withdrawals-enabled">Saques disponíveis</Label>
            <p className="text-xs text-muted-foreground">
              Desligue para colocar os levantamentos em manutenção — os produtores vêem um aviso com o contacto do
              suporte em vez do formulário de saque. O saldo deles continua intacto.
            </p>
          </div>
          <Switch
            id="withdrawals-enabled"
            checked={withdrawalsOn}
            onChange={(e) => setWithdrawalsOn(e.target.checked)}
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
      </div>

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Guardar
      </Button>
      {saved && !pending && <p className="text-sm text-emerald-600">Definições guardadas.</p>}
    </form>
  );
}
