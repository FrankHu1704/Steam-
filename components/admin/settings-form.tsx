"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Percent, CreditCard, UserX } from "lucide-react";
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
  mpesaChargeProvider,
  withdrawalsEnabled,
  inactiveProducerDeletionEnabled,
}: {
  withdrawalFeePercent: number;
  platformFeePercent: number;
  platformFixedFeeAmount: number;
  withdrawalMinimumAmount: number;
  paymentProvider: "debito_pay" | "zumbopay" | "netshop";
  emolaChargeProvider: "pagar" | "zumbopay" | "netshop" | "debito_pay" | "paysuite" | "paymoz" | "active";
  emolaEnabled: boolean;
  mpesaChargeProvider: "pagar" | "zumbopay" | "netshop" | "debito_pay" | "paymoz" | "active";
  withdrawalsEnabled: boolean;
  inactiveProducerDeletionEnabled: boolean;
}) {
  const router = useRouter();
  const [withdrawalFee, setWithdrawalFee] = useState(String(withdrawalFeePercent));
  const [platformFee, setPlatformFee] = useState(String(platformFeePercent));
  const [fixedFee, setFixedFee] = useState(String(platformFixedFeeAmount));
  const [minimumAmount, setMinimumAmount] = useState(String(withdrawalMinimumAmount));
  const [provider, setProvider] = useState(paymentProvider);
  const [emolaProvider, setEmolaProvider] = useState(emolaChargeProvider);
  const [emolaOn, setEmolaOn] = useState(emolaEnabled);
  const [mpesaProvider, setMpesaProvider] = useState(mpesaChargeProvider);
  const [withdrawalsOn, setWithdrawalsOn] = useState(withdrawalsEnabled);
  const [deletionOn, setDeletionOn] = useState(inactiveProducerDeletionEnabled);
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
      updateSetting("mpesa_charge_provider", mpesaProvider),
      updateSetting("withdrawals_enabled", withdrawalsOn),
      updateSetting("inactive_producer_deletion_enabled", deletionOn),
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
          <p className="text-xs text-muted-foreground">Define qual processador é usado no checkout da PayNow.</p>
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
              setEmolaProvider(
                e.target.value as "pagar" | "zumbopay" | "netshop" | "debito_pay" | "paysuite" | "paymoz" | "active"
              )
            }
          >
            <option value="pagar">Pagar (padrão)</option>
            <option value="zumbopay">ZumboPay</option>
            <option value="netshop">NetShop</option>
            <option value="debito_pay">Debito Pay</option>
            <option value="paysuite">PaySuite</option>
            <option value="paymoz">PayMoz</option>
            <option value="active">Processador ativo (acima)</option>
          </Select>
          {emolaProvider === "paysuite" && (
            <p className="text-xs text-amber-600">
              A PaySuite ainda não tem levantamento automático (B2C) documentado — os saques em e-Mola ficam
              pendentes para pagamento manual pelo admin enquanto estiver selecionada.
            </p>
          )}
          {emolaProvider === "paymoz" && (
            <p className="text-xs text-amber-600">
              O PayMoz ainda não tem levantamento automático (B2C) documentado — os saques em e-Mola ficam
              pendentes para pagamento manual pelo admin enquanto estiver selecionada.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Escolhe qual processador trata só o e-Mola, sem mudar o processador ativo acima (que continua a servir
            M-Pesa/mKesh/cartão). "Processador ativo" faz o e-Mola seguir esse mesmo processador em vez de um fixo.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mpesa-provider">M-Pesa processado via</Label>
          <Select
            id="mpesa-provider"
            value={mpesaProvider}
            onChange={(e) =>
              setMpesaProvider(
                e.target.value as "pagar" | "zumbopay" | "netshop" | "debito_pay" | "paymoz" | "active"
              )
            }
          >
            <option value="active">Processador ativo (acima, padrão)</option>
            <option value="paymoz">PayMoz</option>
            <option value="pagar">Pagar</option>
            <option value="zumbopay">ZumboPay</option>
            <option value="netshop">NetShop</option>
            <option value="debito_pay">Debito Pay</option>
          </Select>
          {mpesaProvider === "paymoz" && (
            <p className="text-xs text-amber-600">
              O PayMoz ainda não tem levantamento automático (B2C) documentado — os saques em M-Pesa ficam
              pendentes para pagamento manual pelo admin enquanto estiver selecionado.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Escolhe qual processador trata só o M-Pesa, sem mudar o processador ativo acima. "Processador ativo" é o
            padrão — nada muda até escolheres outro explicitamente.
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

      <div className="space-y-4 border-t border-border pt-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <UserX className="h-4 w-4" /> Contas de Produtores
        </h3>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
          <div>
            <Label htmlFor="deletion-enabled">Eliminação automática de contas inativas</Label>
            <p className="text-xs text-muted-foreground">
              Apaga sozinho, todos os dias, contas de produtor sem nenhum produto 3 dias depois de se tornarem
              produtor, ou sem nenhuma venda 2 semanas depois — quem já vendeu alguma vez fica sempre isento. A
              conta é avisada por email no momento em que é apagada. Desligue para pausar isto sem precisar de
              alterar código.
            </p>
          </div>
          <Switch
            id="deletion-enabled"
            checked={deletionOn}
            onChange={(e) => setDeletionOn(e.target.checked)}
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
