import { MessageSquareText, Mail, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getTsembaBalance } from "@/lib/tsemba";
import { formatCurrency } from "@/lib/utils";

export default async function AdminNotificationsPage() {
  const balance = await getTsembaBalance();

  const unitTiles = balance
    ? [
        { label: "Unidades SMS", value: balance.units.sms, icon: MessageSquareText },
        { label: "Unidades WhatsApp", value: balance.units.whatsapp, icon: MessageSquareText },
        { label: "Unidades Email", value: balance.units.email, icon: Mail },
      ]
    : [];

  const walletEntries = balance ? Object.entries(balance.wallet) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notificações (Tsemba)</h1>
        <p className="text-sm text-muted-foreground">
          Saldo de unidades e carteira da conta Tsemba, usada para SMS e WhatsApp aos produtores e compradores.
        </p>
      </div>

      {!balance ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Não foi possível obter o saldo do Tsemba agora — verifique se TSEMBA_API_KEY está configurada.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
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
            <div>
              <h2 className="mb-3 font-semibold">Carteira</h2>
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

          <p className="text-xs text-muted-foreground">Total de unidades disponíveis: {balance.totalUnits}</p>
        </>
      )}
    </div>
  );
}
