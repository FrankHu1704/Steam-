import { getStorage } from "firebase-admin/storage";

const SIGNED_URL_TTL_MS = 24 * 60 * 60 * 1000;

/** Mints a short-lived signed URL for a private Storage object. Used only
 * after a purchase is confirmed — the file itself is never publicly
 * readable (see storage.rules), this is the one legitimate bypass. */
export async function getSignedDownloadUrl(path: string): Promise<string> {
  const bucket = getStorage().bucket();
  const [url] = await bucket.file(path).getSignedUrl({
    action: "read",
    expires: Date.now() + SIGNED_URL_TTL_MS,
  });
  return url;
}
