"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireBuyer() {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  return user;
}

async function canAccessLesson(supabase: ReturnType<typeof createAdminClient>, lessonId: string, userId: string) {
  const { data: lesson } = await supabase
    .from("course_lessons")
    .select("id, module_id, course_modules(product_id)")
    .eq("id", lessonId)
    .single<{ id: string; module_id: string; course_modules: { product_id: string } | null }>();
  const productId = lesson?.course_modules?.product_id;
  if (!productId) return false;

  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("product_id", productId)
    .eq("buyer_id", userId)
    .eq("status", "paid")
    .limit(1)
    .maybeSingle();
  if (order) return true;

  const { data: owned } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("producer_id", userId)
    .maybeSingle();
  return !!owned;
}

export async function toggleLessonComplete(lessonId: string, completed: boolean) {
  const user = await requireBuyer();
  if (!user) return { error: "Precisa de iniciar sessão." };

  const supabase = createAdminClient();
  if (!(await canAccessLesson(supabase, lessonId, user.id))) return { error: "Sem acesso a esta aula." };

  const { error } = await supabase.from("lesson_progress").upsert(
    {
      lesson_id: lessonId,
      buyer_id: user.id,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: "lesson_id,buyer_id" }
  );
  if (error) return { error: error.message };
  return { ok: true };
}

export async function fetchLessonComments(lessonId: string) {
  const user = await requireBuyer();
  if (!user) return { error: "Precisa de iniciar sessão." };

  const supabase = createAdminClient();
  if (!(await canAccessLesson(supabase, lessonId, user.id))) return { error: "Sem acesso a esta aula." };

  const { data } = await supabase
    .from("lesson_comments")
    .select("*, profiles(name)")
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: true });

  const comments = ((data ?? []) as { id: string; lesson_id: string; user_id: string; comment: string; created_at: string; profiles: { name: string } | null }[]).map(
    (c) => ({ ...c, author_name: c.profiles?.name ?? "Aluno" })
  );

  return { comments };
}

export async function postLessonComment(lessonId: string, comment: string) {
  const user = await requireBuyer();
  if (!user) return { error: "Precisa de iniciar sessão." };
  if (!comment.trim()) return { error: "Escreva um comentário." };

  const supabase = createAdminClient();
  if (!(await canAccessLesson(supabase, lessonId, user.id))) return { error: "Sem acesso a esta aula." };

  const { error } = await supabase.from("lesson_comments").insert({
    lesson_id: lessonId,
    user_id: user.id,
    comment: comment.trim(),
  });
  if (error) return { error: error.message };
  return { ok: true };
}
