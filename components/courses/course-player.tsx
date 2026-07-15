"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, PlayCircle, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toggleLessonComplete, postLessonComment, fetchLessonComments } from "@/lib/actions/course-progress";
import type { BuyerCourse } from "@/lib/data/courses";
import type { CommentWithAuthor } from "@/lib/data/courses";

export function CoursePlayer({
  course,
  initialLessonId,
  initialComments,
}: {
  course: BuyerCourse;
  initialLessonId: string | null;
  initialComments: CommentWithAuthor[];
}) {
  const allLessons = useMemo(() => course.modules.flatMap((m) => m.lessons), [course]);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(initialLessonId ?? allLessons[0]?.id ?? null);
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>(
    Object.fromEntries(allLessons.map((l) => [l.id, l.completed]))
  );
  const [comments, setComments] = useState<CommentWithAuthor[]>(initialComments);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [togglingComplete, setTogglingComplete] = useState(false);

  const activeLesson = allLessons.find((l) => l.id === activeLessonId) ?? null;
  const totalLessons = allLessons.length;
  const completedCount = Object.values(completedMap).filter(Boolean).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  async function handleToggleComplete() {
    if (!activeLesson) return;
    const newValue = !completedMap[activeLesson.id];
    setTogglingComplete(true);
    setCompletedMap((prev) => ({ ...prev, [activeLesson.id]: newValue }));
    await toggleLessonComplete(activeLesson.id, newValue);
    setTogglingComplete(false);
  }

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (!activeLesson || !commentText.trim()) return;
    setPosting(true);
    const result = await postLessonComment(activeLesson.id, commentText);
    setPosting(false);
    if (!result.error) {
      setComments((prev) => [...prev, { id: crypto.randomUUID(), lesson_id: activeLesson.id, user_id: "", comment: commentText, created_at: new Date().toISOString(), author_name: "Você" }]);
      setCommentText("");
    }
  }

  async function selectLesson(lessonId: string) {
    setActiveLessonId(lessonId);
    setComments([]);
    const result = await fetchLessonComments(lessonId);
    if (result.comments) setComments(result.comments);
  }

  if (totalLessons === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
        Ainda não há aulas publicadas para este curso.
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="order-2 lg:order-1 lg:col-span-1">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">O seu progresso</span>
              <span className="text-muted-foreground">{progressPercent}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-brand-gradient transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto">
            {course.modules.map((module) => (
              <div key={module.id}>
                <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">{module.title}</p>
                <div className="space-y-1">
                  {module.lessons.map((lesson) => {
                    const active = lesson.id === activeLessonId;
                    const done = completedMap[lesson.id];
                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => selectLesson(lesson.id)}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          active ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted"
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="line-clamp-1">{lesson.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="order-1 lg:order-2 lg:col-span-2">
        {activeLesson ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border bg-black">
              {activeLesson.video_url ? (
                <div className="aspect-video w-full">
                  <iframe src={activeLesson.video_url} className="h-full w-full" allowFullScreen />
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center text-white/60">
                  <PlayCircle className="h-12 w-12" />
                </div>
              )}
            </div>

            <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5">
              <div>
                <h2 className="text-lg font-bold">{activeLesson.title}</h2>
                {activeLesson.description && (
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{activeLesson.description}</p>
                )}
              </div>
              <Button
                type="button"
                variant={completedMap[activeLesson.id] ? "outline" : "default"}
                size="sm"
                className="shrink-0"
                onClick={handleToggleComplete}
                disabled={togglingComplete}
              >
                {completedMap[activeLesson.id] ? "Concluída" : "Marcar como concluída"}
              </Button>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="font-semibold">Comentários</p>
              <div className="mt-3 space-y-3">
                {comments.length === 0 && <p className="text-sm text-muted-foreground">Seja o primeiro a comentar.</p>}
                {comments.map((c) => (
                  <div key={c.id} className="rounded-lg bg-muted/50 p-3 text-sm">
                    <p className="font-medium">{c.author_name}</p>
                    <p className="mt-0.5 text-muted-foreground">{c.comment}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={handlePostComment} className="mt-4 flex gap-2">
                <Textarea
                  placeholder="Escreva um comentário ou dúvida sobre esta aula…"
                  rows={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <Button type="submit" size="icon" disabled={posting || !commentText.trim()} className="shrink-0">
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">Selecione uma aula para começar.</p>
        )}
      </div>
    </div>
  );
}
