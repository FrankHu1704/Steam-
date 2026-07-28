"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createEmployee } from "@/lib/actions/employees";

export function CreateEmployeeForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [biNumber, setBiNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [mpesaNumber, setMpesaNumber] = useState("");
  const [emolaNumber, setEmolaNumber] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("5");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await createEmployee({
      name,
      email,
      phone,
      biNumber,
      address,
      city,
      province,
      mpesaNumber,
      emolaNumber,
      commissionPercent: Number(commissionPercent),
    });
    setPending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Colaborador criado — email de boas-vindas enviado.");
    setName("");
    setEmail("");
    setPhone("");
    setBiNumber("");
    setAddress("");
    setCity("");
    setProvince("");
    setMpesaNumber("");
    setEmolaNumber("");
    setCommissionPercent("5");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="emp-name">Nome completo</Label>
          <Input id="emp-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="emp-email">Email</Label>
          <Input id="emp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="emp-phone">Telemóvel (também WhatsApp)</Label>
          <Input id="emp-phone" placeholder="84xxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="emp-bi">N.º do BI</Label>
          <Input id="emp-bi" value={biNumber} onChange={(e) => setBiNumber(e.target.value)} required />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <Label htmlFor="emp-address">Endereço</Label>
          <Input id="emp-address" value={address} onChange={(e) => setAddress(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="emp-city">Cidade</Label>
          <Input id="emp-city" value={city} onChange={(e) => setCity(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="emp-province">Província</Label>
          <Input id="emp-province" value={province} onChange={(e) => setProvince(e.target.value)} required />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="emp-mpesa">Número M-Pesa</Label>
          <Input id="emp-mpesa" placeholder="84xxxxxxx" value={mpesaNumber} onChange={(e) => setMpesaNumber(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="emp-emola">Número e-Mola</Label>
          <Input id="emp-emola" placeholder="86xxxxxxx" value={emolaNumber} onChange={(e) => setEmolaNumber(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="emp-commission">Comissão (%)</Label>
          <Input
            id="emp-commission"
            type="number"
            min="1"
            max="90"
            step="0.5"
            value={commissionPercent}
            onChange={(e) => setCommissionPercent(e.target.value)}
            required
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Indique pelo menos um número (M-Pesa ou e-Mola) para pagamento — o pagamento automático mensal só funciona com
        M-Pesa.
      </p>
      <p className="text-xs text-muted-foreground">
        Cria uma conta de acesso à Área de Colaboradores e envia as credenciais por email.
      </p>
      <Button type="submit" disabled={pending} className="gap-2">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        Criar Colaborador
      </Button>
    </form>
  );
}
