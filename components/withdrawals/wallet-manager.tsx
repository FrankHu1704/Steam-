"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star, Wallet as WalletIcon, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  savePayoutWallet,
  deletePayoutWallet,
  setDefaultPayoutWallet,
} from "@/lib/actions/payout-wallets";
import type { PayoutWallet } from "@/types/database";

const METHOD_LABEL: Record<"mpesa" | "emola", string> = { mpesa: "M-Pesa", emola: "e-Mola" };
const METHOD_STYLE: Record<"mpesa" | "emola", string> = {
  mpesa: "bg-red-600 text-white",
  emola: "bg-orange-500 text-white",
};

export function WalletManager({ wallets }: { wallets: PayoutWallet[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<PayoutWallet | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const usedMethods = new Set(wallets.map((w) => w.method));
  const canAddMore = wallets.length < 2;

  function openAdd() {
    setEditingWallet(null);
    setModalOpen(true);
  }

  function openEdit(wallet: PayoutWallet) {
    setEditingWallet(wallet);
    setModalOpen(true);
  }

  async function handleDelete(walletId: string) {
    if (!confirm("Remover esta carteira?")) return;
    setBusyId(walletId);
    const res = await deletePayoutWallet(walletId);
    setBusyId(null);
    if (res.error) toast.error(res.error);
    router.refresh();
  }

  async function handleSetDefault(walletId: string) {
    setBusyId(walletId);
    const res = await setDefaultPayoutWallet(walletId);
    setBusyId(null);
    if (res.error) toast.error(res.error);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Carteiras de Saque</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Só M-Pesa e e-Mola. Cadastre uma vez e saque quando quiser (limite de 2 carteiras).
          </p>
        </div>
        {canAddMore && (
          <Button type="button" size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Adicionar carteira
          </Button>
        )}
      </div>

      {!canAddMore && (
        <p className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          Limite de 2 carteiras atingido (1 M-Pesa e 1 e-Mola)
        </p>
      )}

      {wallets.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <WalletIcon className="h-5 w-5" />
          </span>
          <p className="font-medium">Nenhuma carteira cadastrada</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Adicione uma carteira M-Pesa ou e-Mola para começar a receber os seus saques.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
            >
              <div className="flex items-center gap-3">
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold", METHOD_STYLE[wallet.method])}>
                  {METHOD_LABEL[wallet.method][0]}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{wallet.holder_name}</p>
                    {wallet.is_default && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                        <Star className="h-2.5 w-2.5 fill-current" /> PADRÃO
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {METHOD_LABEL[wallet.method]} · +258 {wallet.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!wallet.is_default && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busyId === wallet.id}
                    onClick={() => handleSetDefault(wallet.id)}
                    title="Tornar padrão"
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Button type="button" size="sm" variant="ghost" onClick={() => openEdit(wallet)} title="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busyId === wallet.id}
                  onClick={() => handleDelete(wallet.id)}
                  title="Remover"
                >
                  {busyId === wallet.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <WalletModal
          existingWallet={editingWallet}
          usedMethods={usedMethods}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

function WalletModal({
  existingWallet,
  usedMethods,
  onClose,
}: {
  existingWallet: PayoutWallet | null;
  usedMethods: Set<string>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<"mpesa" | "emola">(
    existingWallet?.method ?? (usedMethods.has("mpesa") ? "emola" : "mpesa")
  );
  const [holderName, setHolderName] = useState(existingWallet?.holder_name ?? "");
  const [phone, setPhone] = useState(existingWallet?.phone ?? "");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await savePayoutWallet({ method, holderName, phone });
    setPending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Carteira guardada.");
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{existingWallet ? "Editar Carteira" : "Adicionar Carteira"}</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <Label>Método</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(["mpesa", "emola"] as const).map((m) => {
                const disabled = !existingWallet && usedMethods.has(m);
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={disabled}
                    onClick={() => setMethod(m)}
                    className={cn(
                      "rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                      method === m ? "border-primary bg-primary/5 text-primary" : "border-border"
                    )}
                  >
                    {METHOD_LABEL[m]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="holderName">Nome do titular</Label>
            <Input
              id="holderName"
              placeholder="Ex: João Mabjaia"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">Telefone da carteira</Label>
            <div className="flex overflow-hidden rounded-lg border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <span className="flex items-center bg-muted px-3 text-sm font-medium text-muted-foreground">+258</span>
              <Input
                id="phone"
                placeholder="841234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-none border-0 focus-visible:ring-0"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Carteira
          </Button>
        </form>
      </div>
    </div>
  );
}
