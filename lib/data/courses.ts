import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CourseLesson, CourseModule, LessonComment } from "@/types/database";

export interface ModuleWithLessons extends CourseModule {
  lessons: CourseLesson[];
}

export async function getProducerCourseStructure(productId: string): Promise<ModuleWithLessons[]> {
  const supabase = await createClient();
  const { data: modules } = await supabase
    .from("course_modules")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (!modules?.length) return [];

  const { data: lessons } = await supabase
    .from("course_lessons")
    .select("*")
    .in(
      "module_id",
      modules.map((m) => m.id)
    )
    .order("sort_order", { ascending: true });

  return modules.map((m) => ({
    ...m,
    lessons: (lessons ?? []).filter((l) => l.module_id === m.id),
  }));
}

async function hasPaidOrder(supabase: ReturnType<typeof createAdminClient>, productId: string, buyerId: string) {
  const { data } = await supabase
    .from("orders")
    .select("id")
    .eq("product_id", productId)
    .eq("buyer_id", buyerId)
    .eq("status", "paid")
    .limit(1)
    .maybeSingle();
  return !!data;
}

export interface LessonWithProgress extends CourseLesson {
  completed: boolean;
}

export interface BuyerModule extends CourseModule {
  lessons: LessonWithProgress[];
}

export interface BuyerCourse {
  productTitle: string;
  modules: BuyerModule[];
}

export async function getCourseForBuyer(productId: string, buyerId: string): Promise<BuyerCourse | null> {
  const supabase = createAdminClient();

  const isOwnerOrBuyer =
    (await hasPaidOrder(supabase, productId, buyerId)) ||
    (await supabase.from("products").select("id").eq("id", productId).eq("producer_id", buyerId).maybeSingle())
      .data != null;

  if (!isOwnerOrBuyer) return null;

  const { data: product } = await supabase.from("products").select("title").eq("id", productId).single();
  if (!product) return null;

  const { data: modules } = await supabase
    .from("course_modules")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (!modules?.length) return { productTitle: product.title, modules: [] };

  const moduleIds = modules.map((m) => m.id);
  const { data: lessons } = await supabase
    .from("course_lessons")
    .select("*")
    .in("module_id", moduleIds)
    .order("sort_order", { ascending: true });

  const lessonIds = (lessons ?? []).map((l) => l.id);
  const { data: progress } = lessonIds.length
    ? await supabase.from("lesson_progress").select("lesson_id, completed").eq("buyer_id", buyerId).in("lesson_id", lessonIds)
    : { data: [] as { lesson_id: string; completed: boolean }[] };

  const completedSet = new Set((progress ?? []).filter((p) => p.completed).map((p) => p.lesson_id));

  return {
    productTitle: product.title,
    modules: modules.map((m) => ({
      ...m,
      lessons: (lessons ?? [])
        .filter((l) => l.module_id === m.id)
        .map((l) => ({ ...l, completed: completedSet.has(l.id) })),
    })),
  };
}

export interface CommentWithAuthor extends LessonComment {
  author_name: string;
}

export async function getLessonComments(lessonId: string): Promise<CommentWithAuthor[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("lesson_comments")
    .select("*, profiles(name)")
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: true });

  return ((data ?? []) as (LessonComment & { profiles: { name: string } | null })[]).map((c) => ({
    ...c,
    author_name: c.profiles?.name ?? "Aluno",
  }));
}

export async function productHasCourseContent(productId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data: modules } = await supabase.from("course_modules").select("id").eq("product_id", productId).limit(1);
  return !!modules?.length;
}
