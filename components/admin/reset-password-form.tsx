"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminResetUserPassword } from "@/lib/actions/admin";

export function ResetPasswordForm({ userId, userName }: { userId: string; userName: string }) {
  const [newPassword, setNewPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await adminResetUserPassword(userId, newPassword);
    setPending(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Nova senha definida para ${userName}.`);
      setNewPassword("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="reset-password">Nova senha</Label>
        <Input
          id="reset-password"
          type="text"
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Define uma nova senha diretamente para {userName}, sem precisar da senha antiga. {userName} recebe um email a
        avisar que a senha foi alterada — combine a nova senha com a pessoa por outro canal.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        Definir nova senha
      </Button>
    </form>
  );
}
