import { MessageSquareText, Mail, Wallet, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getTsembaBalance } from "@/lib/tsemba";
import { getEasyhostBalance } from "@/lib/easyhost-sms";
import { formatCurrency } from "@/lib/utils";

// Calls two live third-party balance APIs (Tsemba, Easyhost) on every
// render — must never be statically prerendered at build time, or a slow/
// unreachable provider from Vercel's build servers hangs and fails the
// whole deploy (as it did: 3× 60s timeouts on /admin/notifications).
export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const [tsembaBalance, easyhostBalance] = await Promise.all([getTsembaBalance(), getEasyhostBalance()]);

  const unitTiles = tsembaBalance
    ? [
        { label: "Unidades WhatsApp", value: tsembaBalance.units.whatsapp, icon: MessageCircle },
        { label: "Unidades Email", value: tsembaBalance.units.email, icon: Mail },
      ]
    : [];

  const walletEntries = tsembaBalance ? Object.entries(tsembaBalance.wallet) : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Notificações</h1>
        <p className="text-sm text-muted-foreground">
          Saldo das contas usadas para avisar produtores e compradores: Easyhost (SMS) e Tsemba (WhatsApp).
        </p>
      </div>

      <div>
        <h2 className="mb-3 font-semibold">Easyhost (SMS)</h2>
        {!easyhostBalance ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Não foi possível obter o saldo da Easyhost agora — verifique se EASYHOST_API_KEY está configurada.
            </CardContent>
          </Card>
        ) : (
          <Card className="max-w-sm">
            <CardContent className="flex items-center gap-4 p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-white">
                <MessageSquareText className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Créditos disponíveis</p>
                <p className="text-xl font-bold">
                  {easyhostBalance.balanceCredits} {easyhostBalance.currency}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Usada para os SMS de "pagamento confirmado" (produtor) e "compra confirmada" (comprador) em cada venda.
        </p>
      </div>

      <div>
        <h2 className="mb-3 font-semibold">Tsemba (WhatsApp)</h2>
        {!tsembaBalance ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Não foi possível obter o saldo do Tsemba agora — verifique se TSEMBA_API_KEY está configurada.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {unitTiles.map((tile) => (
                <Card key={tile.label}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground">{tile.label}</p>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient text-white">
                        <tile.icon className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl font-bold">{tile.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {walletEntries.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Carteira</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {walletEntries.map(([method, wallet]) => (
                    <Card key={method}>
                      <CardContent className="flex items-center gap-4 p-6">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-white">
                          <Wallet className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">{method}</p>
                          <p className="text-xl font-bold">
                            {formatCurrency(wallet.balance, (wallet.currency as "MZN" | "ZAR") ?? "MZN")}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-2 text-xs text-muted-foreground">
              Usada para o recibo de WhatsApp ao comprador e lembretes de carrinho abandonado — já não envia SMS
              (ver secção Easyhost acima).
            </p>
          </>
        )}
      </div>
    </div>
  );
}
