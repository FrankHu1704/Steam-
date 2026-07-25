"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateProfile } from "@/lib/actions/profile";
import type { Profile } from "@/types/database";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState<string | null>(profile.avatar_url);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const res = await updateProfile(formData);
    if (res?.error) toast.error(res.error);
    else toast.success("Perfil atualizado.");
    setPending(false);
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 overflow-hidden rounded-full bg-muted">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
              {profile.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="avatar">Foto de Perfil</Label>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPreview(URL.createObjectURL(file));
            }}
            className="text-sm"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" defaultValue={profile.name} required />
      </div>
      <div>
        <Label htmlFor="phone">Telefone</Label>
        <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} placeholder="+258841234567" required />
        <p className="mt-1 text-xs text-muted-foreground">
          Usado para o contactarmos sobre as suas vendas (em breve também por SMS).
        </p>
      </div>
      <div>
        <Label>Email</Label>
        <Input value={profile.email} disabled />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "A guardar…" : "Guardar Alterações"}
      </Button>
    </form>
  );
}
