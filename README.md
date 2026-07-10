# PagaJá — Plataforma de Pagamentos

Plataforma de pagamentos para Moçambique/África (inspirada na Debito Pay /
pagar.co.mz), construída sobre Firebase. A própria plataforma é uma única
"merchant agregadora" na Debito Pay: todos os pagamentos dos vendedores que
usam esta plataforma passam pela mesma carteira/API key da Debito Pay, e o
saldo de cada vendedor é controlado internamente num livro-razão (ledger) no
Firestore. Saques ("saques") e produtos cadastrados por vendedores só ficam
ativos depois de aprovação de um administrador.

## Arquitetura

```
firebase.json, firestore.rules, firestore.indexes.json   -> config do projeto
functions/   Cloud Functions (TypeScript)                  -> backend / API
web/         React + Vite + Tailwind                        -> frontend (SPA)
```

- **Auth**: Firebase Authentication (email/senha). Cada novo utilizador vira
  automaticamente um "merchant" (documento em `merchants/{uid}`, estado
  `pending`). Administradores são promovidos manualmente (ver abaixo).
- **Firestore**: `merchants`, `products`, `payments`, `withdrawals`,
  `affiliateLinks`, `webhookEvents`, `users`. Ver `functions/src/types.ts`
  para os campos de cada coleção.
- **Storage**: capas/previews em `products/{merchantId}/{ficheiro}` —
  públicas, upload direto do cliente (`web/src/lib/uploadProductImage.ts`),
  até 5MB, só imagens. Ficheiros pagos (PDFs) em
  `product-files/{merchantId}/{productId}/{ficheiro}` —
  **nunca legíveis diretamente** (`web/src/lib/uploadProductFile.ts` só
  escreve; leitura é sempre via signed URL do servidor, ver
  `getProductDownload`/`adminGetProductFiles`), até 40MB (`storage.rules`).
- **Cloud Functions**: toda a escrita sensível (saldo, aprovações, chamadas à
  Debito Pay) passa por funções `onCall`/`onRequest` — o cliente nunca
  escreve diretamente nesses campos (ver `firestore.rules`).
- **Integração Debito Pay**: `functions/src/lib/debitoPay.ts` chama
  `payment-orchestrator`, `check-status` e `wallet-balance` da API real da
  Debito Pay. O webhook (`debitoPayWebhook`) recebe `payment.completed` /
  `payment.failed` / `payment.refunded` / `payment.chargeback`, valida a
  assinatura HMAC-SHA256 e credita o saldo do merchant correspondente.

## Usando o Termux (Android)

Tudo aqui (Node, npm, git, Firebase CLI) roda normalmente no Termux, sem
nada específico de sistema operativo:

```bash
pkg update && pkg upgrade
pkg install nodejs-lts git
npm install -g firebase-tools
```

`firebase login` abre um link no browser para autenticar (o Termux não tem
browser embutido, mas o CLI aceita autenticação por link/código — siga o
que o terminal instruir). Daqui em diante, todos os comandos deste README
(`npm install`, `npm run build`, `firebase deploy`, etc.) funcionam iguais.

O site (`web/`) já é um PWA instalável: abrindo-o no Chrome do Android
aparece o botão **"Baixar App"** (ou o Chrome oferece "Adicionar à tela
inicial" no menu), instalando-o como um app normal, com ícone próprio, sem
precisar de Play Store. Não requer nenhum passo extra de build.

## Configuração inicial

### 1. Firebase CLI e projeto

```bash
npm install -g firebase-tools
firebase login
firebase projects:create paga-ja-prod   # ou use um projeto já existente
```

Edite `.firebaserc` e substitua `REPLACE_WITH_YOUR_FIREBASE_PROJECT_ID` pelo
ID real do projeto. Ative no Console Firebase: **Authentication** (método
Email/Senha), **Firestore** (modo produção) e o plano **Blaze** (necessário
para Cloud Functions chamarem APIs externas como a Debito Pay).

### 2. Credenciais da Debito Pay

Esta plataforma **não inclui nenhuma credencial real** — você precisa da sua
própria conta de merchant na Debito Pay:

- `merchant_id` e `wallet_code` — não são segredos, mas ficam fora do git.
  Copie `functions/.env.example` para `functions/.env` e preencha:

  ```
  DEBITO_PAY_MERCHANT_ID=...
  DEBITO_PAY_WALLET_CODE=...
  ```

- `api_key` (`sk_live_...`) e o `webhook secret` são segredos reais — vão
  para o Secret Manager do Firebase, nunca para um ficheiro no repositório:

  ```bash
  firebase functions:secrets:set DEBITO_PAY_API_KEY
  firebase functions:secrets:set DEBITO_PAY_WEBHOOK_SECRET
  firebase functions:secrets:set ADMIN_BOOTSTRAP_SECRET   # veja passo 4
  ```

- No painel da Debito Pay (Settings → Webhooks), registe a URL pública da
  função `debitoPayWebhook` depois do primeiro deploy (aparece no terminal
  como `https://<region>-<project>.cloudfunctions.net/debitoPayWebhook`).

### 3. Instalar dependências

```bash
cd functions && npm install && cd ..
cd web && npm install && cd ..
```

Configure o frontend: copie `web/.env.example` para `web/.env.local` e
preencha com as credenciais do seu app Web no Console Firebase (Project
Settings → General → Your apps).

### 4. Deploy e primeiro administrador

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage,functions
```

(sem `hosting` — o frontend é publicado pela Vercel, ver secção abaixo. Só
inclua `,hosting` se decidir usar o Firebase Hosting em vez da Vercel, e
nesse caso adicione `"site": "<seu-site-id>"` ao bloco `hosting` do
`firebase.json` primeiro, com o ID real de `firebase hosting:sites:list`
— sem isso o CLI falha com "resolving hosting target of a site with no
site name".)

Não existe nenhum admin por padrão. Para criar o primeiro:

1. Crie uma conta normal em `/signup`.
2. Rode o script `web/scripts/bootstrap-admin.mjs` (funciona no Termux, não
   precisa de DevTools do browser):

   ```bash
   cd web
   node scripts/bootstrap-admin.mjs
   ```

   Ele pede o email/palavra-passe da conta e o `ADMIN_BOOTSTRAP_SECRET` que
   você definiu, faz login e promove essa conta a admin. Depois, saia e
   entre de novo em `/login` — o token só atualiza a claim `role: admin`
   num novo login.
3. Repita para cada admin adicional; depois disso, trate o
   `ADMIN_BOOTSTRAP_SECRET` como comprometido e rode-o
   (`firebase functions:secrets:set ADMIN_BOOTSTRAP_SECRET` de novo).

### 5. Desenvolvimento local (emuladores)

```bash
firebase emulators:start --only auth,firestore,functions,hosting
# noutro terminal:
cd web && npm run dev
```

## Hospedagem do frontend (Vercel)

O `web/` é uma SPA Vite comum e pode ser hospedada na Vercel em vez do
Firebase Hosting — o backend (Auth, Firestore, Functions, webhook) continua
sempre no Firebase, só o site estático muda de sítio.

1. Importe o repositório na Vercel, com **Root Directory** = `web`.
2. Build command: `npm run build` · Output directory: `dist` (o
   `web/vercel.json` já inclui o rewrite de SPA para `index.html`).
3. Defina as mesmas variáveis do `web/.env.example` em Project Settings →
   Environment Variables (`VITE_FIREBASE_API_KEY`, etc.).
4. Depois do primeiro deploy, adicione o domínio da Vercel à lista de
   domínios autorizados em Firebase Console → Authentication → Settings →
   Authorized domains, senão o login falha.

Se preferir manter tudo no Firebase Hosting, o `firebase.json` já está
configurado para isso — as duas opções não se excluem, é só escolher qual
domínio aponta para qual.

## Fluxo de pagamento

1. Merchant cria um **link de pagamento** (`/dashboard/payments`), opcional
   ligado a um produto aprovado.
2. O comprador abre `/pay/{paymentId}` (sem precisar de conta), escolhe o
   método (M-Pesa, e-Mola, mKesh, Visa/Mastercard, PayFast) e submete.
3. `submitPayment` chama o `payment-orchestrator` da Debito Pay com as
   credenciais da plataforma.
4. Confirmação chega por webhook (`debitoPayWebhook`) → credita
   `merchants/{uid}.balanceAvailable`.
5. Merchant pede saque (`requestWithdrawal`) → saldo passa para
   `balancePending`. Um admin aprova/rejeita (`/admin/withdrawals`) e, após
   transferir o valor manualmente, marca como pago.

## Produtos digitais, afiliados e saques (aprovação)

- **Produtos**: assistente em 6 passos (`/dashboard/products/new` →
  `ProductWizard.tsx`) — tipo (Ebook/Templates/Grupo Privado/Videoaula) →
  dados → ficheiros → capa/previews → afiliação → revisão. `createProduct`
  cria com `status: pending`; só fica à venda depois de `reviewProduct`
  (`/admin/products`, que também deixa o admin abrir os PDFs via
  `adminGetProductFiles` antes de aprovar) marcar `approved`. Cada produto
  aprovado ganha uma página pública permanente em `/produto/{productId}`
  (não é mais preciso o merchant gerar um link por venda).
- **Entrega digital**: ficheiros (`ebook`/`template`/`videoaula`) vão para
  `product-files/{merchantId}/{productId}/` no Storage, **nunca
  publicamente legíveis** (`storage.rules`). `purchaseProduct` cria o
  pagamento e cobra na hora; depois do webhook confirmar
  `payment.completed`, a página de sucesso chama `getProductDownload` para
  obter links assinados (24h) — só funciona com pagamento confirmado.
- **Afiliados**: qualquer merchant vira afiliado de um produto de outro
  merchant com `affiliateEnabled: true` via `becomeAffiliate`, ganhando um
  link `/produto/{id}?ref={uid}` (`/dashboard/affiliates`).
  `registerProductView` conta cliques por link; no `payment.completed`, o
  webhook divide o valor: comissão (`affiliateCommissionAmount`, calculada
  na compra) cai no saldo do afiliado, o resto cai no saldo do dono do
  produto — ambos usam o mesmo sistema de saque abaixo.
- **Links de pagamento avulsos** (`/dashboard/payments`, `createPaymentLink`
  + `submitPayment`): para cobranças que não são de um produto do catálogo.
- **Saques**: `requestWithdrawal` cria com `status: pending`; admin decide
  em `/admin/withdrawals` (`approved`/`rejected`), marca `paid` com
  `markWithdrawalPaid` quando transfere o valor, e o merchant fecha o ciclo
  confirmando com `confirmWithdrawalReceipt` (`status: confirmed`). Taxa
  fixa de 5% (M-Pesa, e-Mola, Payoneer) calculada em
  `functions/src/lib/fees.ts` — o saldo do merchant é debitado no valor
  cheio (`amount`), mas o admin só transfere o `netAmount` (já com a taxa
  descontada). Ver a seção "Informações sobre Saques" na landing page para
  o texto exposto ao público.
- **Merchants**: contas começam `pending` e só podem pedir saques depois de
  um admin as ativar em `/admin/merchants`.
