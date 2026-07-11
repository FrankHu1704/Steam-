"use client";

import { createClient } from "@/lib/supabase/client";

const MAX_COVER_BYTES = 5 * 1024 * 1024;
const MAX_FILE_BYTES = 100 * 1024 * 1024;

export async function uploadCoverImage(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("O ficheiro precisa de ser uma imagem.");
  if (file.size > MAX_COVER_BYTES) throw new Error("A capa deve ter no máximo 5MB.");

  const supabase = createClient();
  const path = `${userId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("covers").upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw error;
  return supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
}

export interface UploadedFile {
  name: string;
  storage_path: string;
  size_bytes: number;
}

/** Private bucket — only the signed-in producer can read/write their own
 * prefix (see supabase/migrations/0003_storage.sql). Buyers only ever get
 * access via signed URLs minted server-side after a paid order. */
export async function uploadProductFile(userId: string, productSlug: string, file: File): Promise<UploadedFile> {
  if (file.size > MAX_FILE_BYTES) throw new Error("Cada ficheiro deve ter no máximo 100MB.");

  const supabase = createClient();
  const path = `${userId}/${productSlug}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("product-files").upload(path, file, {
    contentType: file.type,
  });
  if (error) throw error;
  return { name: file.name, storage_path: path, size_bytes: file.size };
}
