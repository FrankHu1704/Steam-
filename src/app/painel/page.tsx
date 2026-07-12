import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PainelClient from "@/components/painel/PainelClient";

export default async function PainelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/painel/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: files } = await supabase
    .from("bot_files")
    .select("*")
    .eq("customer_id", user.id)
    .order("uploaded_at", { ascending: false });

  return <PainelClient profile={profile} files={files ?? []} />;
}
