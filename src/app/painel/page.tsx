"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { mockCustomers, BotFile, BotStatus } from "@/lib/mockData";
import { plans } from "@/lib/plans";
import PreviewBanner from "@/components/PreviewBanner";

const STATUS_LABEL: Record<BotStatus, string> = {
  ativo: "Ativo",
  pausado: "Pausado",
  erro: "Erro",
};

const STATUS_COLOR: Record<BotStatus, string> = {
  ativo: "bg-accent/15 text-accent",
  pausado: "bg-white/10 text-white/60",
  erro: "bg-red-500/15 text-red-400",
};

export default function PainelPage() {
  const [customerId, setCustomerId] = useState(mockCustomers[0].id);
  const customer = mockCustomers.find((c) => c.id === customerId)!;
  const plan = plans.find((p) => p.id === customer.planId);

  const [files, setFiles] = useState<(BotFile & { downloadUrl?: string })[]>(
    customer.files
  );
  const fileInput = useRef<HTMLInputElement>(null);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFiles((prev) => [
      {
        id: `local-${Date.now()}`,
        name: f.name,
        sizeLabel: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        uploadedAt: new Date().toISOString().slice(0, 10),
        downloadUrl: URL.createObjectURL(f),
      },
      ...prev,
    ]);
    e.target.value = "";
  }

  return (
    <>
      <PreviewBanner />
      <main className="mx-auto min-h-screen max-w-4xl px-6 py-12 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-sm text-white/50 hover:text-white">
              ← Senga Host
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-white">
              Painel do Cliente
            </h1>
          </div>

          <select
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setFiles(
                mockCustomers.find((c) => c.id === e.target.value)?.files ?? []
              );
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            {mockCustomers.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#0f1420]">
                {c.name} (demo)
              </option>
            ))}
          </select>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="card-glass p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">O meu bot</h2>
              <button
                onClick={() => fileInput.current?.click()}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-dark"
              >
                Enviar ficheiro
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleUpload}
              />
            </div>

            {files.length === 0 ? (
              <p className="mt-6 text-sm text-white/50">
                Nenhum ficheiro enviado ainda. Envie um .zip com o código do
                seu bot.
              </p>
            ) : (
              <ul className="mt-6 space-y-3">
                {files.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {f.name}
                      </p>
                      <p className="text-xs text-white/40">
                        {f.sizeLabel} · enviado em {f.uploadedAt}
                      </p>
                    </div>
                    {f.downloadUrl ? (
                      <a
                        href={f.downloadUrl}
                        download={f.name}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                      >
                        Descarregar
                      </a>
                    ) : (
                      <button
                        disabled
                        title="Disponível após ligação ao armazenamento"
                        className="cursor-not-allowed rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/30"
                      >
                        Descarregar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="space-y-6">
            <section className="card-glass p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  Plano atual
                </h2>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLOR[customer.status]}`}
                >
                  {STATUS_LABEL[customer.status]}
                </span>
              </div>
              {plan && (
                <div className="mt-4 space-y-2 text-sm text-white/70">
                  <p className="text-xl font-bold text-white">
                    {plan.name}{" "}
                    <span className="text-sm font-normal text-white/40">
                      · {plan.price} MT/mês
                    </span>
                  </p>
                  <p>Memória: {plan.memory}</p>
                  <p>Armazenamento: {plan.storage}</p>
                  <p>CPU: {plan.cpu}</p>
                </div>
              )}
              <Link
                href="/#planos"
                className="mt-4 block text-center text-xs font-semibold text-primary-light hover:underline"
              >
                Mudar de plano
              </Link>
            </section>

            <section className="card-glass p-6">
              <h2 className="text-lg font-semibold text-white">Suporte</h2>
              <div className="mt-3 space-y-2 text-sm text-white/60">
                <a
                  href="https://wa.me/258840000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:text-white"
                >
                  WhatsApp: +258 84 000 0000
                </a>
                <a
                  href="mailto:suporte@sengahost.com"
                  className="block hover:text-white"
                >
                  suporte@sengahost.com
                </a>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
