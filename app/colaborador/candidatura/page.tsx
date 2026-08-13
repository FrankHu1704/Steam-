"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Send, MessageCircle } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitEmployeeApplication } from "@/lib/actions/employee-applications";

const SUPPORT_WHATSAPP = "https://wa.me/258849311757";

export default function EmployeeApplicationPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [biNumber, setBiNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [mpesaNumber, setMpesaNumber] = useState("");
  const [emolaNumber, setEmolaNumber] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await submitEmployeeApplication({
      name,
      email,
      phone,
      biNumber,
      address,
      city,
      province,
      mpesaNumber,
      emolaNumber,
      message,
    });
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <AuthCard title="Candidatura enviada!" subtitle="Vamos analisar e entrar em contacto em breve.">
        <div className="flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          <p className="text-sm text-muted-foreground">
            A equipa PayNow vai rever a sua candidatura. Se tiver dúvidas entretanto, contacte-nos pelo WhatsApp.
          </p>
          <a
            href={SUPPORT_WHATSAPP}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <MessageCircle className="h-4 w-4" /> Suporte via WhatsApp
          </a>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Candidatura a Colaborador"
      subtitle="Recrute produtores para a PayNow e ganhe comissão sobre as vendas deles"
      footer={
        <>
          Já é colaborador?{" "}
          <Link href="/colaborador/login" className="font-semibold text-primary">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telemóvel (também WhatsApp)</Label>
            <Input id="phone" placeholder="84xxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bi">N.º do BI</Label>
            <Input id="bi" value={biNumber} onChange={(e) => setBiNumber(e.target.value)} required />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="province">Província</Label>
            <Input id="province" value={province} onChange={(e) => setProvince(e.target.value)} required />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="mpesa">Número M-Pesa</Label>
            <Input id="mpesa" placeholder="84xxxxxxx" value={mpesaNumber} onChange={(e) => setMpesaNumber(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emola">Número e-Mola</Label>
            <Input id="emola" placeholder="86xxxxxxx" value={emolaNumber} onChange={(e) => setEmolaNumber(e.target.value)} />
          </div>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">Indique pelo menos um número, para receber o pagamento.</p>

        <div className="space-y-1.5">
          <Label htmlFor="message">Porque quer ser colaborador PayNow? (opcional)</Label>
          <Textarea id="message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending} className="w-full gap-2">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {pending ? "A enviar…" : "Enviar Candidatura"}
        </Button>

        <a
          href={SUPPORT_WHATSAPP}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <MessageCircle className="h-3.5 w-3.5" /> Dúvidas? Fale connosco no WhatsApp
        </a>
      </form>
    </AuthCard>
  );
}
