# PayNow — Venda os seus infoprodutos em minutos

Plataforma SaaS moçambicana para venda de infoprodutos (eBooks, cursos,
templates, presets, software, scripts, mentorias, documentos), construída
inteiramente sobre serviços com camada gratuita: **Next.js 15 (App Router)** +
**Supabase** (Postgres, Auth, Storage, RLS) + **Debito Pay** como orquestrador
de pagamentos (M-Pesa, e-Mola, mKesh, Visa/Mastercard, PayFast).

> Esta plataforma substitui por completo a versão anterior (Firebase + Vite,
> focada em pagamentos genéricos). É um projeto novo, com modelo de dados,
> autenticação e infraestrutura próprios.

## Stack

- **Next.js 15** (App Router, Server Actions, Route Handlers, Middleware) + React + TypeScript
- **Tailwind CSS** com primitivos no estilo shadcn/ui escritos à mão (`components/ui/*`)
- **Framer Motion** (revelações ao scroll na landing page), **Lucide Icons**, **Recharts** (gráfico de vendas), **Sonner** (toasts), **next-themes** (dark/light mode)
- **Supabase**: Postgres + Row Level Security, Auth (cookies via `@supabase/ssr`), Storage (capas, avatares, ficheiros pagos)
- **Debito Pay**: `lib/debito-pay.ts` chama o `payment-orchestrator`, valida webhooks por HMAC-SHA256

## Arquitetura de dados

Todas as tabelas e políticas de RLS estão em `supabase/migrations/*.sql`,
aplicadas em ordem:

```
0001_init.sql              tabelas, enums, triggers, seeds (categorias, settings)
0002_rls.sql                Row Level Security de todas as tabelas
0003_storage.sql             buckets (covers, avatars, product-files) + políticas
0004_profile_guard.sql       trigger que impede auto-promoção a admin / adulteração de saldo via update de perfil
0005_functions.sql           incrementos atómicos (cupões, vendas, visualizações)
0006_affiliate_clicks.sql    incremento atómico de cliques de afiliado
```

Tabelas: `profiles`, `categories`, `products`, `product_files`, `coupons`,
`orders`, `order_bumps`, `payments`, `downloads`, `affiliates`, `commissions`,
`withdrawals`, `reviews`, `notifications`, `settings`, `logs`.

O tipo TypeScript `types/database.ts` espelha manualmente este esquema (usado
pelo cliente Supabase tipado). Se preferir gerar automaticamente:

```bash
supabase gen types typescript --project-id <ref> > types/database.ts
```

### Padrão de checkout anónimo

`orders`/`payments`/`downloads` não têm política de RLS que permita `insert`
por clientes anónimos — de propósito. O checkout (`lib/actions/checkout.ts`,
`lib/actions/affiliates.ts`, `lib/actions/withdrawals.ts`, `lib/actions/admin.ts`)
usa o cliente `service_role` (`lib/supabase/admin.ts`, **nunca exposto ao
browser**) para escrever, sempre com validação explícita no próprio server
action antes de qualquer escrita. Isto permite comprar sem conta, mantendo os
dados protegidos de escrita direta pelo cliente.

## Configuração inicial

### 1. Criar o projeto Supabase (gratuito)

1. Crie um projeto em [supabase.com](https://supabase.com) (plano Free).
2. Em **SQL Editor**, rode os ficheiros de `supabase/migrations/` **na ordem
   numérica** (0001 → 0006), colando o conteúdo de cada um e executando.
3. Em **Storage**, confirme que os buckets `covers`, `avatars` e
   `product-files` foram criados pela migração 0003 (o último é privado).
4. Em **Authentication → URL Configuration**, adicione
   `http://localhost:3000/auth/callback` (e o domínio de produção depois do
   deploy) como Redirect URL.

### 2. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha com as chaves do projeto (Project Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # nunca expor ao cliente
```

E as credenciais da sua conta de merchant na Debito Pay (cada método de
pagamento tem o seu próprio `wallet_code`):

```
DEBITO_PAY_API_KEY=
DEBITO_PAY_WEBHOOK_SECRET=
DEBITO_PAY_MERCHANT_ID=
DEBITO_PAY_WALLET_CODE_MPESA=
DEBITO_PAY_WALLET_CODE_EMOLA=
DEBITO_PAY_WALLET_CODE_MKESH=
DEBITO_PAY_WALLET_CODE_VISA_MASTERCARD=
DEBITO_PAY_WALLET_CODE_PAYFAST=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

No painel da Debito Pay, registe a URL do webhook depois do primeiro deploy:
`https://<seu-dominio>/api/webhooks/debito-pay`.

### 3. Instalar e rodar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

### 4. Criar o primeiro administrador

Não existe nenhum admin por padrão nem um script de bootstrap — a única
forma de criar o primeiro é diretamente no banco. Depois de criar uma conta
normal em `/signup`, rode no **SQL Editor** do Supabase:

```sql
update profiles set role = 'admin' where email = 'seu-email@exemplo.com';
```

Saia e entre novamente em `/login`. A partir daí, use `/admin/users` para
promover outras contas (o formulário de perfil de cada utilizador tem um
trigger — `0004_profile_guard.sql` — que impede o próprio utilizador de se
auto-promover pela UI; a promoção só acontece via `service_role`, usada pelas
ações do painel admin).

## Build de produção

```bash
npm run build
npm run start
```

## Deploy (Vercel)

1. Importe o repositório na Vercel.
2. Defina as mesmas variáveis do `.env.example` em Project Settings →
   Environment Variables.
3. Atualize `NEXT_PUBLIC_SITE_URL` para o domínio real e adicione
   `https://<dominio>/auth/callback` em Supabase → Authentication → URL
   Configuration.
4. Registe a URL do webhook (`https://<dominio>/api/webhooks/debito-pay`) no
   painel da Debito Pay.

## Funcionalidades

- **Autenticação**: registo, login, recuperação de password, verificação de
  email, edição de perfil (nome, telefone, foto).
- **Produtos**: CRUD completo com categorias, ficheiros para download,
  preço/preço promocional, afiliação configurável, SEO por produto;
  moderação obrigatória (`pending` → `approved`/`rejected`) por um admin.
- **Checkout** (`/p/[slug]`): cupão de desconto com pré-visualização em
  tempo real, order bump, telefone obrigatório para dinheiro móvel,
  M-Pesa/e-Mola/mKesh/Visa-Mastercard/PayFast, confirmação por polling +
  webhook, entrega automática (download com link assinado de 24h).
- **Painel do produtor** (`/dashboard`): saldo, vendas do dia/mês, lucro,
  gráfico de 14 dias, vendas recentes, produtos, pedidos (com pesquisa e
  exportação CSV), cupões, afiliados, saques, definições.
- **Área do comprador** (`/account`): meus produtos, downloads, afiliados,
  histórico, perfil.
- **Afiliados**: qualquer utilizador autenticado pode tornar-se afiliado de
  um produto com afiliação ativa, gera link único (`?ref=codigo`), ganha
  comissão automática no webhook de pagamento; rankeamento por produtor.
- **Saques**: pedido com taxa configurável, débito imediato do saldo
  disponível, histórico, confirmação de recebimento pelo produtor depois do
  admin marcar como pago.
- **Painel administrativo** (`/admin`): visão geral, moderação de produtos,
  pedidos, aprovação/pagamento de saques, utilizadores (troca de papel),
  categorias, taxas da plataforma, logs.
- **Extras**: notificações in-app (sino no cabeçalho), dark/light mode,
  pesquisa e filtros (produtos e pedidos), PWA instalável (manifest +
  service worker com cache do shell), exportação CSV de pedidos.

## O que é estrutural vs. totalmente funcional

Construído para funcionar de ponta a ponta com dados reais no Supabase, mas
vale registar honestamente os pontos mais rasos desta primeira versão:

- **PayFast/cartão**: o fluxo assume que a Debito Pay devolve um
  `checkout_url` para redireccionar o comprador; nunca foi testado contra a
  API real (as credenciais são do utilizador).
- **Emails transacionais** (confirmação de compra, recibo, verificação) usam
  o fluxo padrão do Supabase Auth — não há um serviço de email dedicado para
  notificar o comprador após a entrega, além da própria página de sucesso.
- **PWA**: manifest + ícones + service worker de cache do shell existem;
  não há sincronização offline nem notificações push.
- **Relatórios**: o painel do produtor mostra o essencial (saldo, vendas,
  gráfico); não há exportação de relatórios financeiros detalhados além do
  CSV de pedidos.
