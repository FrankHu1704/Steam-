"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, KeyRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { changePassword } from "@/lib/actions/auth";

export function SecurityCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("As palavras-passe não coincidem.");
      return;
    }
    setPending(true);
    const res = await changePassword(currentPassword, newPassword);
    setPending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Palavra-passe alterada.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" /> Segurança
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 opacity-60">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">2FA via E-mail</p>
              <p className="text-xs text-muted-foreground">Receba um código de segurança a cada novo início de sessão.</p>
            </div>
            <Switch disabled />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm font-medium">2FA via SMS</p>
                <p className="text-xs text-muted-foreground">Código de verificação enviado ao seu contacto.</p>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                Em breve
              </span>
            </div>
            <Switch disabled />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 border-t border-border pt-4">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <KeyRound className="h-3.5 w-3.5" /> Alterar Senha de Acesso
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Senha Atual</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "A confirmar…" : "Confirmar Alteração"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
