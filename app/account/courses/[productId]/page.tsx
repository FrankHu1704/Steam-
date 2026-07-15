import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getCourseForBuyer, getLessonComments } from "@/lib/data/courses";
import { CoursePlayer } from "@/components/courses/course-player";

export default async function CoursePage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const { user } = await getCurrentUserAndProfile();
  if (!user) redirect(`/login?next=/account/courses/${productId}`);

  const course = await getCourseForBuyer(productId, user.id);
  if (!course) notFound();

  const firstLessonId = course.modules[0]?.lessons[0]?.id ?? null;
  const initialComments = firstLessonId ? await getLessonComments(firstLessonId) : [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/account/products" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar aos meus produtos
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{course.productTitle}</h1>
        <p className="text-sm text-muted-foreground">A sua área de membros.</p>
      </div>

      <CoursePlayer course={course} initialLessonId={firstLessonId} initialComments={initialComments} />
    </div>
  );
}
