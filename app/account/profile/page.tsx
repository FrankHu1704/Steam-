import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/login");

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">O Meu Perfil</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Atualize a sua foto, nome e telefone. O email de acesso não pode ser alterado aqui.
      </p>
      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
