import { FirebaseError } from "firebase/app";

const MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "Já existe uma conta com este email.",
  "auth/invalid-email": "Email inválido.",
  "auth/weak-password": "A palavra-passe deve ter pelo menos 6 caracteres.",
  "auth/operation-not-allowed":
    "O método Email/Senha não está ativado no Firebase (Authentication → Sign-in method).",
  "auth/user-not-found": "Email ou palavra-passe incorretos.",
  "auth/wrong-password": "Email ou palavra-passe incorretos.",
  "auth/invalid-credential": "Email ou palavra-passe incorretos.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde um momento e tente novamente.",
  "auth/network-request-failed": "Falha de rede. Verifique a sua ligação e tente novamente.",
  "auth/unauthorized-domain":
    "Este domínio não está autorizado no Firebase (Authentication → Settings → Authorized domains).",
  "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
    "Chave de API do Firebase inválida — confira VITE_FIREBASE_API_KEY.",
};

export function describeAuthError(err: unknown): string {
  if (err instanceof FirebaseError) {
    return `${MESSAGES[err.code] ?? err.message} (${err.code})`;
  }
  return "Ocorreu um erro inesperado. Tente novamente.";
}
