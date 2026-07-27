"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendPrivateMessage } from "@/lib/actions/admin";

export function PrivateMessageForm({ userId, userName }: { userId: string; userName: string }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await sendPrivateMessage(userId, subject, message);
    setPending(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Mensagem enviada a ${userName}.`);
      setSubject("");
      setMessage("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="pm-subject">Assunto</Label>
        <Input id="pm-subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="pm-message">Mensagem</Label>
        <Textarea id="pm-message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} required />
      </div>
      <p className="text-xs text-muted-foreground">
        Enviada só para {userName} — por email, notificação na conta e push (se tiver ativado). Ninguém mais vê esta mensagem.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Enviar mensagem privada
      </Button>
    </form>
  );
}
