import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const admin = createAdminClient();
  const { data: file } = await admin
    .from("bot_files")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (!file) {
    return NextResponse.json({ message: "Ficheiro não encontrado." }, { status: 404 });
  }

  const { data, error } = await admin.storage
    .from("bot-files")
    .createSignedUrl(file.storage_path, 60);

  if (error || !data) {
    return NextResponse.json(
      { message: error?.message || "Erro ao gerar link." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: data.signedUrl });
}
