# SMSMoz

Plataforma SaaS para envio de SMS em massa e transacionais para qualquer número de Moçambique, com API REST e painel administrativo — inspirada em Tsemba, BulkSMS Moçambique e Notifica, com um design moderno ao estilo Stripe/Twilio/Resend/Linear.

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** + **Framer Motion** + **Lucide Icons**
- **Supabase** (Postgres, Auth, RLS) como base de dados e autenticação
- API REST própria com documentação **OpenAPI/Swagger** em `/docs`
- Integrações de pagamento: **M-Pesa**, **e-Mola**, Cartão, **PayPal**, **Stripe**
- Hospedagem recomendada: **Vercel**

## Estrutura do projeto

```
src/
  app/
    page.tsx                 # Landing page
    (auth)/                  # Login, registo, recuperação de senha
    dashboard/                # Área do cliente
    admin/                     # Painel administrativo
    docs/                      # Documentação Swagger UI
    api/
      v1/                      # API pública (autenticada por API key)
      account/                 # Endpoints da área do cliente (sessão)
      admin/                   # Endpoints do painel admin (sessão + role)
      payments/                # Checkout + webhooks (M-Pesa, e-Mola, Stripe, PayPal)
  components/                  # Componentes reutilizáveis (ui, marketing, dashboard, admin)
  lib/                          # Supabase clients, serviços, validações, SMS engine
  types/database.ts             # Tipos gerados a partir do esquema Supabase
supabase/migrations/            # SQL completo do esquema, funções, RLS e seed
```

## Configuração

1. **Crie um projeto no [Supabase](https://supabase.com)** (plano gratuito é suficiente para começar).
2. Copie `.env.example` para `.env.local` e preencha:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API)
   - `NEXT_PUBLIC_APP_URL` (URL onde a app corre)
3. **Execute as migrações SQL** (em ordem, no SQL Editor do Supabase ou via CLI):
   ```
   supabase/migrations/0001_schema.sql
   supabase/migrations/0002_functions_triggers.sql
   supabase/migrations/0003_rls_policies.sql
   supabase/migrations/0004_seed.sql
   ```
   Ou, com a Supabase CLI instalada: `supabase db push`.
4. **Instale as dependências e arranque o servidor de desenvolvimento**:
   ```bash
   npm install
   npm run dev
   ```
5. Registe uma conta em `/register` e depois promova-a a administrador correndo no SQL Editor:
   ```sql
   update public.profiles set role = 'admin', status = 'active' where id = '<user-uuid>';
   ```
   (o UUID está em Authentication → Users no painel do Supabase).

## Envio real de SMS

Por omissão, `SMS_PROVIDER=mock` simula o envio (sem custos, sem operadora real) — ideal para desenvolvimento e demonstração. Para ligar a um agregador SMS real:

1. Defina `SMS_PROVIDER=gateway`.
2. Preencha `SMS_GATEWAY_API_URL`, `SMS_GATEWAY_API_KEY` e `SMS_GATEWAY_SENDER_ID` com as credenciais do seu fornecedor (ex: agregador com cobertura Vodacom/Movitel/Tmcel).
3. Ajuste `src/lib/sms/provider.ts` (`HttpGatewayProvider`) ao formato exacto da API do seu fornecedor, se necessário.

## Pagamentos

Os fluxos de checkout (`/api/payments/checkout`) criam uma transacção pendente e iniciam o método escolhido. Os webhooks (`/api/payments/*/webhook`) confirmam o pagamento e creditam a conta automaticamente via `adjust_credits`. **Antes de produção**:

- M-Pesa / e-Mola: ligue às APIs oficiais das operadoras e valide a origem dos callbacks.
- Stripe: defina `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` — o checkout e a verificação de assinatura já estão implementados.
- PayPal: defina `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET` e implemente a verificação de assinatura do webhook (placeholder incluído).
- O endpoint `/api/payments/confirm` é apenas para demonstração/sandbox — em produção, créditos só devem ser atribuídos por webhooks verificados.

## API REST

Documentação interactiva em `/docs` (Swagger UI, servida a partir de `/api/openapi.json`). Todos os pedidos autenticam-se com `Authorization: Bearer <api_key>`, gerada em **Painel → Chaves API**.

| Endpoint | Descrição |
|---|---|
| `POST /api/v1/send` | Enviar um SMS individual |
| `POST /api/v1/bulk-send` | Enviar SMS em massa |
| `GET /api/v1/balance` | Consultar saldo de créditos |
| `GET /api/v1/reports` | Histórico paginado de envios |
| `GET/POST /api/v1/contacts` | Listar / criar contactos |
| `DELETE /api/v1/contacts/:id` | Eliminar contacto |

## Segurança

- Autenticação via Supabase Auth (JWT), com Row Level Security em todas as tabelas.
- Chaves API nunca são armazenadas em claro (apenas o hash SHA-256).
- Rate limiting por chave API e por utilizador (em memória por omissão — ligue Upstash Redis via `UPSTASH_REDIS_REST_URL`/`TOKEN` para produção multi-instância).
- Registo de auditoria (`audit_logs`) para acções administrativas sensíveis.
- 2FA está representado no esquema/UI (`profiles.two_fa_enabled`) como base para uma implementação TOTP futura.

## Deploy

O projeto está pronto para a **Vercel**: importe o repositório, configure as variáveis de ambiente de `.env.example` e faça deploy. Lembre-se de configurar os webhooks de pagamento (Stripe, M-Pesa, e-Mola, PayPal) para apontarem para o domínio de produção.
