"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, GraduationCap, PlayCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createModule, deleteModule, createLesson, deleteLesson } from "@/lib/actions/courses";
import type { ModuleWithLessons } from "@/lib/data/courses";

function LessonForm({ moduleId }: { moduleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await createLesson({ moduleId, title, description, videoUrl });
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setTitle("");
    setDescription("");
    setVideoUrl("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Adicionar aula
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-dashed border-border p-3">
      <Input placeholder="Título da aula" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <Input
        placeholder="Link do vídeo (YouTube, Vimeo, embed…)"
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
      />
      <Textarea
        placeholder="Descrição (opcional)"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Guardar aula
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function ModuleCard({ module }: { module: ModuleWithLessons }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const [pending, setPending] = useState(false);

  async function handleDeleteModule() {
    if (!confirm(`Apagar o módulo "${module.title}" e todas as suas aulas?`)) return;
    setPending(true);
    await deleteModule(module.id);
    setPending(false);
    router.refresh();
  }

  async function handleDeleteLesson(lessonId: string) {
    if (!confirm("Apagar esta aula?")) return;
    setPending(true);
    await deleteLesson(lessonId);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border">
      <div className="flex items-center justify-between p-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {module.title}
          <span className="text-xs font-normal text-muted-foreground">
            {module.lessons.length} aula{module.lessons.length === 1 ? "" : "s"}
          </span>
        </button>
        <button
          type="button"
          onClick={handleDeleteModule}
          disabled={pending}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="space-y-2 border-t border-border p-3">
          {module.lessons.map((lesson) => (
            <div key={lesson.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-primary" />
                {lesson.title}
              </span>
              <button
                type="button"
                onClick={() => handleDeleteLesson(lesson.id)}
                disabled={pending}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <LessonForm moduleId={module.id} />
        </div>
      )}
    </div>
  );
}

export function CourseBuilder({ productId, modules }: { productId: string; modules: ModuleWithLessons[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddModule(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await createModule(productId, title);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setTitle("");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4" /> Área de Membros
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Organize o conteúdo em módulos e aulas. Os compradores acedem tudo isto numa área exclusiva, com progresso e comentários.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {modules.length === 0 && (
          <p className="text-sm text-muted-foreground">Ainda não criou nenhum módulo.</p>
        )}
        {modules.map((m) => (
          <ModuleCard key={m.id} module={m} />
        ))}

        <form onSubmit={handleAddModule} className="flex gap-2 pt-2">
          <Input placeholder="Nome do novo módulo (ex: Módulo 1 — Introdução)" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Button type="submit" disabled={pending} className="shrink-0">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Módulo
          </Button>
        </form>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
