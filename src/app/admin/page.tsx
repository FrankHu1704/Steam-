import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminClient from "@/components/admin/AdminClient";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/painel/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/painel");
  }

  const admin = createAdminClient();
  const { data: customers } = await admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: files } = await admin
    .from("bot_files")
    .select("*");

  return <AdminClient customers={customers ?? []} files={files ?? []} />;
}
