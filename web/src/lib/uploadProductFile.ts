import { ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";
import { MAX_FILE_SIZE_BYTES } from "./productTypes";

export interface UploadedProductFile {
  name: string;
  path: string;
  sizeBytes: number;
}

/** Uploads to the private product-files/ prefix (see storage.rules — never
 * publicly readable). Only the storage `path` is kept, never a download
 * URL: files are only ever handed out as signed URLs by getProductDownload
 * after a confirmed purchase. */
export async function uploadProductFile(
  merchantId: string,
  productId: string,
  file: File
): Promise<UploadedProductFile> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("Cada ficheiro deve ter no máximo 40MB.");
  }

  const path = `product-files/${merchantId}/${productId}/${Date.now()}-${file.name}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { contentType: file.type });
  return { name: file.name, path, sizeBytes: file.size };
}
