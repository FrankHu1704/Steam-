import { BookOpen, FileText, Users, Video, type LucideIcon } from "lucide-react";

export type ProductType = "ebook" | "template" | "grupo_privado" | "videoaula";

export const PRODUCT_TYPES: {
  value: ProductType;
  label: string;
  description: string;
  icon: LucideIcon;
  requiresFiles: boolean;
}[] = [
  {
    value: "ebook",
    label: "Ebook",
    description: "Livros, guias e manuais em PDF entregues automaticamente.",
    icon: BookOpen,
    requiresFiles: true,
  },
  {
    value: "template",
    label: "Templates",
    description: "Modelos prontos em PDF, Word, Excel, PowerPoint, Figma ou imagem.",
    icon: FileText,
    requiresFiles: true,
  },
  {
    value: "grupo_privado",
    label: "Grupo Privado",
    description: "Venda acesso a grupos pagos no WhatsApp, Telegram ou outra comunidade.",
    icon: Users,
    requiresFiles: false,
  },
  {
    value: "videoaula",
    label: "Videoaula",
    description: "Tutoriais e aulas em vídeo com envio automático depois do pagamento.",
    icon: Video,
    requiresFiles: true,
  },
];

export const MAX_PRODUCT_FILES = 5;
export const MAX_PREVIEW_IMAGES = 5;
export const MAX_FILE_SIZE_BYTES = 40 * 1024 * 1024;
export const MAX_COVER_SIZE_BYTES = 5 * 1024 * 1024;
