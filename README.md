# LunaAI Connect

Web app where people can connect their own WhatsApp number to a LunaAI agent
and train how it responds — without ever losing the FRANK AI SOLUTIONS
identity baked into every agent.

## What it does

- Register/login, then create one or more agents.
- **Conectar**: enter a WhatsApp number, get an 8-digit pairing code (via
  [Baileys](https://github.com/WhiskeySockets/Baileys)) and link it under
  WhatsApp → Dispositivos ligados.
- **Treino**: write free-form instructions (tone, business info) and/or add
  specific question → answer pairs. This text is sanitized for common
  prompt-injection phrases and is always layered *underneath* a fixed
  identity block (see `lib/identity.ts`) that the account owner cannot edit,
  remove, or override — every reply is traceable back to LunaAI / FRANK AI
  SOLUTIONS.
- **Testar**: chat with the agent in-browser using the exact same system
  prompt that WhatsApp messages get, without needing a live connection.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite for local dev (swap `DATABASE_URL` for Postgres in prod)
- Baileys for WhatsApp connectivity, Groq (`llama-3.3-70b-versatile`) for
  replies

## Setup

```bash
cp .env.example .env   # fill in SESSION_SECRET and GROQ_API_KEY
npm install
npx prisma migrate dev
npm run dev
```

`GROQ_API_KEY` is read only from the environment — there are no fallback
keys hardcoded anywhere in this codebase.

## Known limitations

- The WhatsApp connection manager keeps sockets in server process memory
  (`lib/whatsapp/manager.ts`). This works with `next start` on a
  long-running host, but **not** on serverless/edge platforms (e.g. Vercel's
  default deploy) since the process can be recycled between requests. For
  production, run this with `next start` on a persistent server/container.
- `sessions/` (per-agent WhatsApp auth state) and the SQLite file are
  git-ignored — they hold live session secrets and user data and must never
  be committed.
