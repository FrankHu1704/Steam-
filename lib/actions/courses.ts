"use server";

import { createClient } from "@/lib/supabase/server";

export async function createModule(productId: string, title: string) {
  const supabase = await createClient();
  if (!title.trim()) return { error: "Indique um título para o módulo." };

  const { count } = await supabase
    .from("course_modules")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  const { error } = await supabase
    .from("course_modules")
    .insert({ product_id: productId, title, sort_order: count ?? 0 });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteModule(moduleId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("course_modules").delete().eq("id", moduleId);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function createLesson(input: {
  moduleId: string;
  title: string;
  description: string;
  videoUrl: string;
  isExternalLink: boolean;
}) {
  const supabase = await createClient();
  if (!input.title.trim()) return { error: "Indique um título para a aula." };

  const { count } = await supabase
    .from("course_lessons")
    .select("id", { count: "exact", head: true })
    .eq("module_id", input.moduleId);

  const { error } = await supabase.from("course_lessons").insert({
    module_id: input.moduleId,
    title: input.title,
    description: input.description,
    video_url: input.videoUrl || null,
    is_external_link: input.isExternalLink,
    sort_order: count ?? 0,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteLesson(lessonId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("course_lessons").delete().eq("id", lessonId);
  if (error) return { error: error.message };
  return { ok: true };
}
