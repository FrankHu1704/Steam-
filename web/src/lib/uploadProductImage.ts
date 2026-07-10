import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/** Uploads to products/{merchantId}/{timestamp}-{filename}, matching
 * storage.rules, and returns the public download URL to store on the
 * product doc. */
export async function uploadProductImage(merchantId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("O ficheiro precisa de ser uma imagem.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("A imagem deve ter no máximo 5MB.");
  }

  const path = `products/${merchantId}/${Date.now()}-${file.name}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { contentType: file.type });
  return getDownloadURL(fileRef);
}
