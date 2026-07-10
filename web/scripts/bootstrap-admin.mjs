// One-off Termux/CLI helper to promote an existing account to admin.
// Run from inside web/:   node scripts/bootstrap-admin.mjs
//
// Uses only Node's built-in fetch (no "firebase" package import — its
// package.json "exports" map is meant for bundlers like Vite and doesn't
// always resolve cleanly under plain Node ESM). Talks to the Identity
// Toolkit REST API to sign in, then calls the bootstrapAdmin Cloud
// Function's HTTPS endpoint directly with the resulting ID token.

import { readFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";

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
  const apiKey = env.VITE_FIREBASE_API_KEY;
  const projectId = env.VITE_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) {
    console.error("VITE_FIREBASE_API_KEY / VITE_FIREBASE_PROJECT_ID missing from web/.env.local");
    process.exit(1);
  }

  const email = (await prompt("Email da conta a promover a admin: ")).trim();
  const password = await prompt("Palavra-passe: ");
  const secret = (await prompt("ADMIN_BOOTSTRAP_SECRET: ")).trim();

  console.log("A entrar...");
  const signInRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const signInData = await signInRes.json();
  if (!signInRes.ok) {
    throw new Error(signInData.error?.message ?? "Login falhou.");
  }

  console.log("A promover a admin...");
  const callRes = await fetch(
    `https://us-central1-${projectId}.cloudfunctions.net/bootstrapAdmin`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${signInData.idToken}`,
      },
      body: JSON.stringify({ data: { secret } }),
    }
  );
  const callData = await callRes.json();
  if (!callRes.ok || callData.error) {
    throw new Error(callData.error?.message ?? `HTTP ${callRes.status}`);
  }

  console.log(`✅ ${email} agora é admin. Saia e entre de novo em /login para o token atualizar.`);
}

main().catch((err) => {
  console.error("❌ Falhou:", err.message ?? err);
  process.exit(1);
});
