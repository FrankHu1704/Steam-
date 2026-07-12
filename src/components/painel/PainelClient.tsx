"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Profile, BotFileRow, ProfileStatus } from "@/lib/types";
import { plans } from "@/lib/plans";

const STATUS_LABEL: Record<ProfileStatus, string> = {
  pendente: "Pendente",
  ativo: "Ativo",
  pausado: "Pausado",
  erro: "Erro",
};

const STATUS_COLOR: Record<ProfileStatus, string> = {
  pendente: "bg-white/10 text-white/50",
  ativo: "bg-accent/15 text-accent",
  pausado: "bg-white/10 text-white/60",
  erro: "bg-red-500/15 text-red-400",
};

export default function PainelClient({
  profile,
  files,
}: {
  profile: Profile | null;
  files: BotFileRow[];
}) {
  const router = useRouter();
  const [list, setList] = useState(files);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const plan = plans.find((p) => p.id === profile?.plan_id);
  const isTrial = Boolean(plan?.trialHours);
  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const trialExpired = Boolean(isTrial && trialEndsAt && trialEndsAt.getTime() < Date.now());
  const trialHoursLeft =
    isTrial && trialEndsAt && !trialExpired
      ? Math.max(1, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60)))
      : null;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    setError("");

    const supabase = createClient();
    const path = `${profile.id}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("bot-files")
      .upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: row, error: insertError } = await supabase
      .from("bot_files")
      .insert({
        customer_id: profile.id,
        name: file.name,
        size_bytes: file.size,
        storage_path: path,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
    } else if (row) {
      setList((prev) => [row, ...prev]);
    }

    setUploading(false);
    e.target.value = "";
  }

  async function handleDownload(f: BotFileRow) {
    const supabase = createClient();
    const { data, error: signError } = await supabase.storage
      .from("bot-files")
      .createSignedUrl(f.storage_path, 60);

    if (signError || !data) {
      setError(signError?.message || "Não foi possível gerar o link.");
      return;
    }
    window.location.href = data.signedUrl;
  }

  if (!profile) {
    return (
      <main className="mx-auto min-h-screen max-w-2xl px-6 py-24 text-center">
        <p className="text-white/60">
          Não foi possível carregar o seu perfil. Tente atualizar a página.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-12 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-white/50 hover:text-white">
            ← Senga Host
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-white">
            Olá, {profile.name || profile.email}
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
        >
          Sair
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="card-glass p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">O meu bot</h2>
            <button
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
            >
              {uploading ? "A enviar..." : "Enviar ficheiro"}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleUpload}
            />
          </div>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          {list.length === 0 ? (
            <p className="mt-6 text-sm text-white/50">
              Nenhum ficheiro enviado ainda. Envie um .zip com o código do
              seu bot.
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              {list.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{f.name}</p>
                    <p className="text-xs text-white/40">
                      {(f.size_bytes / (1024 * 1024)).toFixed(1)} MB · enviado em{" "}
                      {new Date(f.uploaded_at).toLocaleDateString("pt-MZ")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownload(f)}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                  >
                    Descarregar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="card-glass p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Plano atual</h2>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  trialExpired ? STATUS_COLOR.pausado : STATUS_COLOR[profile.status]
                }`}
              >
                {trialExpired ? "Teste Expirado" : STATUS_LABEL[profile.status]}
              </span>
            </div>
            {plan ? (
              <div className="mt-4 space-y-2 text-sm text-white/70">
                <p className="text-xl font-bold text-white">
                  {plan.name}{" "}
                  <span className="text-sm font-normal text-white/40">
                    · {isTrial ? "Grátis" : `${plan.price} MT/mês`}
                  </span>
                </p>
                {isTrial && (
                  <p className={trialExpired ? "text-red-400" : "text-accent"}>
                    {trialExpired
                      ? "O seu teste grátis expirou."
                      : `Restam ${trialHoursLeft}h de teste.`}
                  </p>
                )}
                <p>Memória: {plan.memory}</p>
                <p>Armazenamento: {plan.storage}</p>
                <p>CPU: {plan.cpu}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-white/50">
                Ainda não tem um plano ativo.
              </p>
            )}
            <Link
              href="/#planos"
              className="mt-4 block text-center text-xs font-semibold text-primary-light hover:underline"
            >
              {trialExpired
                ? "Fazer upgrade agora"
                : plan
                  ? "Mudar de plano"
                  : "Escolher um plano"}
            </Link>
          </section>

          <section className="card-glass p-6">
            <h2 className="text-lg font-semibold text-white">Suporte</h2>
            <div className="mt-3 space-y-2 text-sm text-white/60">
              <a
                href="https://wa.me/258849311757"
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:text-white"
              >
                WhatsApp: +258 84 931 1757
              </a>
              <a
                href="mailto:starchannelmoz@gmail.com"
                className="block hover:text-white"
              >
                starchannelmoz@gmail.com
              </a>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
