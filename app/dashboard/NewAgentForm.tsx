"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewAgentForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erro ao criar agente.");
      return;
    }
    setName("");
    router.push(`/agents/${data.agent.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        placeholder="Nome do agente (ex: LunaAI da Loja)"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-50"
      >
        {loading ? "A criar..." : "+ Novo agente"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
