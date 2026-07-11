"use client";

import { useState } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updatePassword } from "@/lib/actions/auth";

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await updatePassword(formData);
    if (res?.error) setError(res.error);
    setPending(false);
  }

  return (
    <AuthCard title="Nova Palavra-passe">
      <form action={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="password">Nova palavra-passe</Label>
          <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "A guardar…" : "Guardar Nova Palavra-passe"}
        </Button>
      </form>
    </AuthCard>
  );
}
