import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const { data: requester } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!requester?.is_admin) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
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
