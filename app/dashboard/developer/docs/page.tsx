import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function Endpoint({ method, path }: { method: string; path: string }) {
  const color =
    method === "GET"
      ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
      : method === "POST"
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        : "bg-red-500/10 text-red-600 dark:text-red-400";
  return (
    <div className="flex items-center gap-2 font-mono text-sm">
      <span className={`rounded px-2 py-0.5 text-xs font-bold ${color}`}>{method}</span>
      <span>{path}</span>
    </div>
  );
}

function Code({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">{children}</pre>;
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-lg font-semibold">{title}</h2>
          {children}
        </CardContent>
      </Card>
    </section>
  );
}

export default function DeveloperDocsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pagaja.vercel.app";

  const toc = [
    { id: "intro", label: "Introdução" },
    { id: "auth", label: "Autenticação" },
    { id: "charges", label: "Cobranças" },
    { id: "products", label: "Produtos" },
    { id: "offers", label: "Ofertas" },
    { id: "orders", label: "Vendas" },
    { id: "webhooks-config", label: "Configurar webhook" },
    { id: "webhooks-events", label: "Eventos recebidos" },
    { id: "errors", label: "Erros" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/developer"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao Programador
        </Link>
        <div className="mt-3">
          <h1 className="text-2xl font-bold">Documentação da API</h1>
          <p className="text-sm text-muted-foreground">
            Referência completa da API pública da PagaJá — autenticação, endpoints, webhooks e erros.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-x-4 gap-y-2 p-4 text-sm">
          {toc.map((t) => (
            <a key={t.id} href={`#${t.id}`} className="text-primary hover:underline">
              {t.label}
            </a>
          ))}
        </CardContent>
      </Card>

      <Section id="intro" title="Introdução">
        <p className="text-sm text-muted-foreground">
          A API da PagaJá deixa integrar a sua própria aplicação ou site com a sua conta de produtor: criar cobranças
          num checkout personalizado, gerir produtos, e receber avisos automáticos de vendas por webhook. É acesso à
          sua própria conta — não é um processador de pagamentos genérico.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            <strong>URL base:</strong> <code>{baseUrl}</code>
          </li>
          <li>
            <strong>Formato:</strong> JSON em todos os pedidos e respostas.
          </li>
          <li>
            <strong>Chave de teste:</strong> grátis, simula cobranças instantaneamente, sem dinheiro real. Use para
            testar a sua integração.
          </li>
          <li>
            <strong>Chave live:</strong> cobranças reais. Requer um pagamento único de 300 MT para desbloquear (em{" "}
            <Link href="/dashboard/developer" className="text-primary hover:underline">
              Programador
            </Link>
            ).
          </li>
        </ul>
      </Section>

      <Section id="auth" title="Autenticação">
        <p className="text-sm text-muted-foreground">
          A API usa OAuth 2.0 client-credentials. Troque o <code>client_id</code> e <code>client_secret</code> da sua
          chave (visível apenas uma vez ao criá-la) por um <code>access_token</code> temporário, e use esse token em
          todos os outros pedidos.
        </p>
        <Endpoint method="POST" path="/api/v1/oauth/token" />
        <Code>{`curl -X POST ${baseUrl}/api/v1/oauth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "client_id": "pgj_id_...",
    "client_secret": "pgj_test_..."
  }'`}</Code>
        <p className="text-xs font-semibold text-muted-foreground">Resposta</p>
        <Code>{`{
  "access_token": "a1b2c3...",
  "token_type": "Bearer",
  "scope": "read write products offers orders webhooks",
  "expires_in": 3600
}`}</Code>
        <p className="text-sm text-muted-foreground">
          O <code>access_token</code> expira em <strong>3600 segundos (1 hora)</strong> — peça um novo quando expirar.
          Envie-o em todos os pedidos seguintes no cabeçalho:
        </p>
        <Code>{`Authorization: Bearer SEU_ACCESS_TOKEN`}</Code>
      </Section>

      <Section id="charges" title="Cobranças — criar uma venda">
        <Endpoint method="POST" path="/api/v1/charges" />
        <p className="text-sm text-muted-foreground">
          Cria uma cobrança para um dos seus produtos, a partir do checkout personalizado da sua própria app. Com uma
          chave de teste, devolve sempre sucesso instantâneo sem mover dinheiro real. Com uma chave live, cria uma
          venda real — as mesmas taxas, notificações e webhook de <code>payment.completed</code> aplicam-se como no
          checkout normal da PagaJá.
        </p>
        <p className="text-xs font-semibold text-muted-foreground">Corpo do pedido</p>
        <Code>{`{
  "product_id": "uuid do seu produto",
  "customer_name": "Nome do cliente",
  "customer_email": "cliente@exemplo.com",
  "customer_phone": "84xxxxxxx",
  "payment_method": "mpesa"
}`}</Code>
        <p className="text-xs text-muted-foreground">
          <code>product_id</code>, <code>customer_name</code> e <code>customer_email</code> são obrigatórios.{" "}
          <code>payment_method</code> aceita <code>mpesa</code>, <code>emola</code>, <code>mkesh</code> ou{" "}
          <code>visa_mastercard</code> (nem todos disponíveis em todo o momento — depende do processador ativo da
          PagaJá); o padrão é <code>mpesa</code>.
        </p>
        <p className="text-xs font-semibold text-muted-foreground">Exemplo</p>
        <Code>{`curl -X POST ${baseUrl}/api/v1/charges \\
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "product_id": "...",
    "customer_name": "Maria João",
    "customer_email": "maria@exemplo.com",
    "customer_phone": "841234567",
    "payment_method": "mpesa"
  }'`}</Code>
        <p className="text-xs font-semibold text-muted-foreground">Resposta (201)</p>
        <Code>{`{
  "success": true,
  "data": {
    "reference": "id do pedido",
    "status": "pending",
    "checkout_url": null
  }
}`}</Code>
        <p className="text-xs text-muted-foreground">
          Em modo teste, a resposta inclui <code>"test_mode": true</code> e <code>"status": "success"</code> de
          imediato. Em modo live, <code>status</code> pode ser <code>pending</code> (aguarda confirmação no
          telemóvel do cliente) — use o webhook <code>payment.completed</code> para saber quando foi confirmada.
        </p>
      </Section>

      <Section id="products" title="Produtos">
        <Endpoint method="GET" path="/api/v1/products" />
        <p className="text-sm text-muted-foreground">Lista todos os seus produtos.</p>
        <Code>{`curl ${baseUrl}/api/v1/products \\
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"`}</Code>
        <Code>{`{
  "success": true,
  "products": [
    {
      "id": "...",
      "title": "Curso de Excel",
      "description": "...",
      "price_mzn": 250,
      "status": "approved",
      "created_at": "2026-07-01T10:00:00Z"
    }
  ]
}`}</Code>

        <div className="border-t border-border pt-3">
          <Endpoint method="POST" path="/api/v1/products" />
          <p className="text-sm text-muted-foreground">
            Cria um novo produto (fica com estado <code>pending</code> — precisa de aprovação da equipa PagaJá antes
            de poder vender, tal como um produto criado pelo painel).
          </p>
          <p className="text-xs font-semibold text-muted-foreground">Corpo do pedido</p>
          <Code>{`{
  "title": "Nome do produto",
  "description": "Descrição do produto",
  "price_mzn": 250
}`}</Code>
          <p className="text-xs text-muted-foreground">
            <code>title</code> obrigatório, <code>price_mzn</code> obrigatório e deve ser no mínimo 50.
          </p>
        </div>
      </Section>

      <Section id="offers" title="Ofertas">
        <Endpoint method="GET" path="/api/v1/offers" />
        <p className="text-sm text-muted-foreground">
          Lista os seus produtos no formato "oferta" (1 oferta por produto) — útil para integrações que trabalham com
          o conceito de "offer" em vez de produto direto.
        </p>
        <Code>{`{
  "success": true,
  "offers": [
    {
      "id": "offer_...",
      "product_id": "...",
      "name": "Curso de Excel (Oferta Padrão)",
      "price": 250,
      "currency": "MZN",
      "status": "active",
      "created_at": "2026-07-01T10:00:00Z"
    }
  ]
}`}</Code>
      </Section>

      <Section id="orders" title="Vendas">
        <Endpoint method="GET" path="/api/v1/orders" />
        <p className="text-sm text-muted-foreground">Lista as últimas 200 vendas confirmadas (pagas) da sua conta.</p>
        <Code>{`{
  "success": true,
  "orders": [
    {
      "id": "...",
      "customer": { "name": "Maria João", "email": "maria@exemplo.com", "phone": "841234567" },
      "product": { "id": "...", "name": "Curso de Excel" },
      "amount": 250,
      "currency": "MZN",
      "status": "paid",
      "created_at": "2026-07-01T10:00:00Z"
    }
  ]
}`}</Code>
      </Section>

      <Section id="webhooks-config" title="Webhooks — configurar">
        <p className="text-sm text-muted-foreground">
          Configure um único endpoint HTTPS seu para receber um evento sempre que uma venda for confirmada. Pode
          também gerir isto diretamente no painel (
          <Link href="/dashboard/developer" className="text-primary hover:underline">
            Programador → Webhook de vendas
          </Link>
          ).
        </p>
        <Endpoint method="POST" path="/api/v1/webhooks" />
        <Code>{`{
  "url": "https://seu-site.com/webhook",
  "events": ["payment.completed"]
}`}</Code>
        <p className="text-xs text-muted-foreground">
          <code>url</code> obrigatório e deve começar com <code>https://</code>. <code>events</code> é opcional —
          o padrão é <code>["payment.completed"]</code> (o único evento suportado atualmente). A resposta devolve o{" "}
          <code>secret</code> em texto — guarde-o, é usado para validar a assinatura dos eventos recebidos.
        </p>
        <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
          <div>
            <Endpoint method="GET" path="/api/v1/webhooks" />
            <p className="text-xs text-muted-foreground">Consulta o webhook configurado (secret mascarado).</p>
          </div>
          <div>
            <Endpoint method="DELETE" path="/api/v1/webhooks" />
            <p className="text-xs text-muted-foreground">Remove o webhook configurado.</p>
          </div>
        </div>
      </Section>

      <Section id="webhooks-events" title="Webhooks — eventos recebidos">
        <p className="text-sm text-muted-foreground">
          Quando uma venda sua é confirmada, a PagaJá envia um <code>POST</code> ao seu endpoint com este corpo:
        </p>
        <Code>{`{
  "event": "payment.completed",
  "data": {
    "id": "...",
    "customer": { "name": "Maria João", "email": "maria@exemplo.com", "phone": "841234567" },
    "product": { "id": "...", "name": "Curso de Excel", "price": 250 },
    "amount": 250,
    "currency": "MZN",
    "status": "paid",
    "created_at": "2026-07-01T10:00:00Z"
  }
}`}</Code>
        <p className="text-sm text-muted-foreground">
          Cada pedido inclui um cabeçalho <code>x-pagaja-signature</code> no formato{" "}
          <code>t=TIMESTAMP,v1=ASSINATURA</code>, onde <code>ASSINATURA</code> é o HMAC-SHA256 de{" "}
          <code>{"`${timestamp}.${corpo_em_texto}`"}</code> usando o <code>secret</code> do seu webhook. Valide sempre
          a assinatura antes de confiar no evento:
        </p>
        <Code>{`// Node.js
const crypto = require("crypto");

function verify(rawBody, signatureHeader, secret) {
  const [tPart, vPart] = signatureHeader.split(",");
  const timestamp = tPart.replace("t=", "");
  const signature = vPart.replace("v1=", "");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest("hex");
  return expected === signature;
}`}</Code>
        <p className="text-xs text-muted-foreground">
          O seu endpoint deve responder com um estado 2xx dentro de 10 segundos — se falhar ou demorar, a entrega é
          registada como falhada (sem repetição automática, no momento).
        </p>
      </Section>

      <Section id="errors" title="Erros">
        <p className="text-sm text-muted-foreground">Todos os erros seguem o mesmo formato:</p>
        <Code>{`{
  "success": false,
  "error": "Mensagem descritiva do erro."
}`}</Code>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Código</th>
              <th className="py-2 font-medium">Significado</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b border-border/60">
              <td className="py-2 pr-4 font-mono">400</td>
              <td className="py-2">Campos em falta ou inválidos no corpo do pedido.</td>
            </tr>
            <tr className="border-b border-border/60">
              <td className="py-2 pr-4 font-mono">401</td>
              <td className="py-2">Token de acesso inválido, expirado, ou credenciais erradas em /oauth/token.</td>
            </tr>
            <tr className="border-b border-border/60">
              <td className="py-2 pr-4 font-mono">403</td>
              <td className="py-2">Modo produção não desbloqueado (chave live sem os 300 MT pagos).</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-mono">404</td>
              <td className="py-2">Produto não encontrado, ou não pertence à conta da chave usada.</td>
            </tr>
          </tbody>
        </table>
      </Section>
    </div>
  );
}
