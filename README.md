# Senga Host

Landing page de hospedagem de bots WhatsApp com integração de pagamentos, construída com Next.js 14 (App Router) e Tailwind CSS.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e configure as chaves do Débito Pay para ativar o checkout:

```
DEBITO_PAY_API_URL=
DEBITO_PAY_API_KEY=
```

## Deploy

Pronto para deploy na Vercel (`vercel --prod`).
