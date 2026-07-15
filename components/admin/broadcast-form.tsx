"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendBroadcastEmail } from "@/lib/actions/admin";

export function BroadcastForm({ userCount }: { userCount: number }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(`Enviar este email para todos os ${userCount} utilizadores?`)) return;
    setPending(true);
    setError(null);
    setResult(null);
    const res = await sendBroadcastEmail(subject, message);
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setResult({ sent: res.sent ?? 0, total: res.total ?? 0 });
    setSubject("");
    setMessage("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="broadcast-subject">Assunto</Label>
        <Input
          id="broadcast-subject"
          placeholder="Novidades na PagaJá"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="broadcast-message">Mensagem</Label>
        <Textarea
          id="broadcast-message"
          rows={6}
          required
          placeholder="Escreva aqui a novidade ou comunicado…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && (
        <p className="text-sm text-emerald-600">
          Enviado para {result.sent} de {result.total} utilizadores.
        </p>
      )}

      <Button type="submit" disabled={pending} className="gap-1.5">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Enviar para todos ({userCount})
      </Button>
    </form>
  );
}
