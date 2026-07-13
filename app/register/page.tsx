"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erro ao criar conta.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-border bg-card p-6"
      >
        <h1 className="mb-1 text-xl font-semibold">Criar conta</h1>
        <p className="mb-6 text-sm text-emerald-100/60">
          Cria a tua conta para ligar o LunaAI ao teu WhatsApp.
        </p>

        <label className="mb-1 block text-sm text-emerald-100/70">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-accent"
        />

        <label className="mb-1 block text-sm text-emerald-100/70">Password</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-accent"
        />

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent py-2 font-medium text-black hover:bg-emerald-400 disabled:opacity-50"
        >
          {loading ? "A criar..." : "Criar conta"}
        </button>

        <p className="mt-4 text-center text-sm text-emerald-100/60">
          Já tens conta?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
