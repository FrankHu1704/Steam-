"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle2, Clock, XCircle, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadKycDocument } from "@/lib/upload";
import { submitKycDocuments } from "@/lib/actions/kyc";
import type { Profile } from "@/types/database";

function FileSlot({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-6 text-center hover:border-primary/50">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <>
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <span className="text-sm font-medium">{file.name}</span>
        </>
      ) : (
        <>
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{label}</span>
        </>
      )}
    </label>
  );
}

export function KycUploadForm({ userId, profile }: { userId: string; profile: Profile }) {
  const router = useRouter();
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!frontFile || !backFile) {
      toast.error("Anexa as duas fotos: frente e verso do documento.");
      return;
    }
    setSubmitting(true);
    try {
      const [frontPath, backPath] = await Promise.all([
        uploadKycDocument(userId, "front", frontFile),
        uploadKycDocument(userId, "back", backFile),
      ]);
      const res = await submitKycDocuments({ frontPath, backPath });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Documentos enviados! Vamos rever em breve.");
      setFrontFile(null);
      setBackFile(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar os documentos.");
    } finally {
      setSubmitting(false);
    }
  }

  if (profile.kyc_status === "approved") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-600/30 bg-green-600/5 p-4">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
        <div>
          <p className="font-semibold text-green-700">Identidade verificada</p>
          <p className="text-sm text-muted-foreground">Já podes solicitar saques normalmente.</p>
        </div>
      </div>
    );
  }

  if (profile.kyc_status === "pending") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <Clock className="h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="font-semibold text-amber-700">Documentos em análise</p>
          <p className="text-sm text-muted-foreground">
            Enviámos os teus documentos {profile.kyc_submitted_at ? `em ${new Date(profile.kyc_submitted_at).toLocaleDateString("pt-MZ")}` : ""} — um
            administrador vai reve-los em breve.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {profile.kyc_status === "rejected" && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="flex items-center gap-2 font-semibold text-destructive">
            <XCircle className="h-4 w-4" /> Verificação rejeitada
          </p>
          {profile.kyc_rejection_reason && <p className="mt-1 text-sm text-muted-foreground">{profile.kyc_rejection_reason}</p>}
          <p className="mt-1 text-sm text-muted-foreground">Envia os documentos novamente abaixo.</p>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Para solicitar saques, precisamos de confirmar a tua identidade. Anexa uma foto do documento de identidade
        (BI, passaporte ou carta de condução) — frente e verso, bem legíveis.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FileSlot label="Foto da frente" file={frontFile} onChange={setFrontFile} />
        <FileSlot label="Foto do verso" file={backFile} onChange={setBackFile} />
      </div>

      <Button type="button" onClick={handleSubmit} disabled={submitting} className="w-full gap-1.5">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Enviar documentos
      </Button>
    </div>
  );
}
