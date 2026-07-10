import { HttpsError, CallableRequest } from "firebase-functions/v2/https";

export function requireAuth(request: CallableRequest): string {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  return request.auth.uid;
}

export function requireAdmin(request: CallableRequest): string {
  const uid = requireAuth(request);
  if (request.auth?.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin role required.");
  }
  return uid;
}
