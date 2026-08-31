"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createUserByAdmin } from "@/lib/actions/admin";

export function CreateUserButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createUserByAdmin(formData);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    toast.success("Conta criada com sucesso.");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <UserPlus className="mr-1.5 h-4 w-4" /> Criar conta
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Criar conta para um utilizador</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <form action={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="admin-create-name">Nome</Label>
          <Input id="admin-create-name" name="name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin-create-email">Email</Label>
          <Input id="admin-create-email" name="email" type="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin-create-phone">Telemóvel (opcional)</Label>
          <Input id="admin-create-phone" name="phone" placeholder="841234567" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin-create-password">Palavra-passe</Label>
          <Input id="admin-create-password" name="password" type="text" minLength={6} required />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="admin-create-role">Tipo de conta</Label>
          <Select id="admin-create-role" name="role" defaultValue="buyer">
            <option value="buyer">Comprador</option>
            <option value="producer">Produtor</option>
          </Select>
        </div>
        {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Criar conta
          </Button>
        </div>
      </form>
    </div>
  );
}
