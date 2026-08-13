"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star, Wallet as WalletIcon, X, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  savePayoutWallet,
  deletePayoutWallet,
  setDefaultPayoutWallet,
} from "@/lib/actions/payout-wallets";
import type { PayoutWallet } from "@/types/database";

const METHOD_LABEL: Record<"mpesa" | "emola", string> = { mpesa: "M-Pesa", emola: "e-Mola" };
const METHOD_LOGO: Record<"mpesa" | "emola", string> = {
  mpesa: "/payment-logos/mpesa.png",
  emola: "/payment-logos/emola.png",
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
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold">As Suas Carteiras</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Guarde M-Pesa e e-Mola uma única vez — depois é só escolher na hora de sacar.
            </p>
          </div>
        </div>
        {canAddMore && (
          <Button type="button" size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Adicionar carteira
          </Button>
        )}
      </div>

      {!canAddMore && (
        <p className="mt-4 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          Já tem as suas 2 carteiras (M-Pesa e e-Mola) — remova uma para adicionar outra.
        </p>
      )}

      {wallets.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <WalletIcon className="h-5 w-5" />
          </span>
          <p className="font-medium">Ainda sem carteira guardada</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Adicione a sua M-Pesa ou e-Mola para sacar com um clique, sem escrever o número todas as vezes.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className={cn(
                "relative rounded-2xl border-2 p-4 transition-colors",
                wallet.is_default ? "border-primary/40 bg-primary/5" : "border-border"
              )}
            >
              {wallet.is_default && (
                <Badge variant="success" className="absolute right-3 top-3 gap-1">
                  <Star className="h-2.5 w-2.5 fill-current" /> Padrão
                </Badge>
              )}
              <div className="flex h-9 items-center">
                <Image
                  src={METHOD_LOGO[wallet.method]}
                  alt={METHOD_LABEL[wallet.method]}
                  width={72}
                  height={32}
                  className="h-8 w-auto object-contain"
                />
              </div>
              <p className="mt-3 font-semibold">{wallet.holder_name}</p>
              <p className="text-sm text-muted-foreground">+258 {wallet.phone}</p>

              <div className="mt-4 flex items-center gap-1 border-t border-border/60 pt-3">
                {!wallet.is_default && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busyId === wallet.id}
                    onClick={() => handleSetDefault(wallet.id)}
                    className="gap-1.5"
                  >
                    <Star className="h-3.5 w-3.5" /> Tornar padrão
                  </Button>
                )}
                <div className="flex-1" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="relative bg-brand-gradient px-6 py-5 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 text-white/80 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="font-bold">{existingWallet ? "Editar Carteira" : "Nova Carteira de Saque"}</p>
          <p className="mt-0.5 text-xs text-white/70">Guardada com segurança na sua conta PayNow.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
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
                      "flex h-14 items-center justify-center rounded-xl border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-30",
                      method === m ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <Image src={METHOD_LOGO[m]} alt={METHOD_LABEL[m]} width={72} height={32} className="h-7 w-auto object-contain" />
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
            <Label htmlFor="phone">Número da carteira</Label>
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
            Guardar Carteira
          </Button>
        </form>
      </div>
    </div>
  );
}
