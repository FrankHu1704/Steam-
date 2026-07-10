// One-off Termux/CLI helper to promote an existing account to admin.
// Run from inside web/:   node scripts/bootstrap-admin.mjs
//
// Reads Firebase config from .env.local (the same file used by the app),
// signs in with the email/password you type, and calls the bootstrapAdmin
// Cloud Function with the ADMIN_BOOTSTRAP_SECRET you configured via
// `firebase functions:secrets:set ADMIN_BOOTSTRAP_SECRET`.

import { readFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

function loadEnvLocal() {
  const path = new URL("../.env.local", import.meta.url);
  if (!existsSync(path)) {
    console.error("web/.env.local not found. Copy .env.example and fill in your Firebase config first.");
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

async function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer;
}

async function main() {
  const env = loadEnvLocal();
  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  });
  const auth = getAuth(app);
  const functions = getFunctions(app);

  const email = await prompt("Email da conta a promover a admin: ");
  const password = await prompt("Palavra-passe: ");
  const secret = await prompt("ADMIN_BOOTSTRAP_SECRET: ");

  console.log("A entrar...");
  await signInWithEmailAndPassword(auth, email.trim(), password);

  console.log("A promover a admin...");
  const bootstrapAdmin = httpsCallable(functions, "bootstrapAdmin");
  await bootstrapAdmin({ secret: secret.trim() });

  console.log(`✅ ${email} agora é admin. Saia e entre de novo em /login para o token atualizar.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Falhou:", err.message ?? err);
  process.exit(1);
});
