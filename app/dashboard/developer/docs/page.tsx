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

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
      {children}
    </div>
  );
}

function FieldsTable({
  rows,
}: {
  rows: { field: string; type: string; required: string; note: string }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Campo</th>
            <th className="py-2 pr-3 font-medium">Tipo</th>
            <th className="py-2 pr-3 font-medium">Obrigatório</th>
            <th className="py-2 font-medium">Notas</th>
          </tr>
        </thead>
        <tbody className="text-muted-foreground">
          {rows.map((r) => (
            <tr key={r.field} className="border-b border-border/60 align-top">
              <td className="py-2 pr-3 font-mono">{r.field}</td>
              <td className="py-2 pr-3 font-mono">{r.type}</td>
              <td className="py-2 pr-3">{r.required}</td>
              <td className="py-2">{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
    { id: "limits", label: "Limites e boas práticas" },
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
            Referência completa da API pública da PayNow — autenticação, endpoints, webhooks e erros.
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
          A API da PayNow deixa integrar a sua própria aplicação ou site com a sua conta de produtor: criar cobranças
          num checkout personalizado, gerir produtos, e receber avisos automáticos de vendas por webhook. É acesso à
          sua própria conta — não é um processador de pagamentos genérico, e não pode aceder a dados de outros
          produtores.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            <strong>URL base:</strong> <code>{baseUrl}</code>
          </li>
          <li>
            <strong>Formato:</strong> JSON em todos os pedidos e respostas (<code>Content-Type: application/json</code>).
          </li>
          <li>
            <strong>Todas as respostas</strong> incluem <code>"success": true</code> ou <code>"success": false</code>{" "}
            — verifique sempre esse campo antes de ler o resto do corpo.
          </li>
          <li>
            <strong>Chave de teste:</strong> grátis, simula cobranças instantaneamente, sem dinheiro real. Use para
            testar a sua integração antes de ir para produção.
          </li>
          <li>
            <strong>Chave live:</strong> cobranças reais. Requer um pagamento único de 300 MT para desbloquear, ou um
            teste grátis de 24h primeiro (em{" "}
            <Link href="/dashboard/developer" className="text-primary hover:underline">
              Programador
            </Link>
            ) — só pode usar o teste grátis uma vez por conta.
          </li>
          <li>
            <strong>Versão:</strong> esta é a versão <code>v1</code> da API (prefixo <code>/api/v1</code>). Não há
            outras versões disponíveis no momento.
          </li>
        </ul>
        <Note>
          A API dá acesso apenas a dados da <strong>sua própria conta de produtor</strong>: os seus produtos, as
          suas vendas, o seu webhook. Não existe um modo "plataforma" ou "marketplace" nesta API — para operações
          administrativas use sempre o painel em <code>/admin</code>.
        </Note>
      </Section>

      <Section id="auth" title="Autenticação">
        <p className="text-sm text-muted-foreground">
          A API usa OAuth 2.0 client-credentials. Troque o <code>client_id</code> e <code>client_secret</code> da sua
          chave (visível apenas uma vez ao criá-la, em{" "}
          <Link href="/dashboard/developer" className="text-primary hover:underline">
            Programador
          </Link>
          ) por um <code>access_token</code> temporário, e use esse token em todos os outros pedidos.
        </p>
        <Endpoint method="POST" path="/api/v1/oauth/token" />
        <p className="text-xs font-semibold text-muted-foreground">Corpo do pedido</p>
        <FieldsTable
          rows={[
            { field: "client_id", type: "string", required: "Sim", note: "Prefixo pgj_id_..." },
            {
              field: "client_secret",
              type: "string",
              required: "Sim",
              note: "Prefixo pgj_test_... (teste) ou pgj_live_... (produção).",
            },
          ]}
        />
        <Code>{`curl -X POST ${baseUrl}/api/v1/oauth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "client_id": "pgj_id_...",
    "client_secret": "pgj_test_..."
  }'`}</Code>
        <p className="text-xs font-semibold text-muted-foreground">Resposta (200)</p>
        <Code>{`{
  "access_token": "a1b2c3...",
  "token_type": "Bearer",
  "scope": "read write products offers orders webhooks",
  "expires_in": 3153600000
}`}</Code>
        <p className="text-sm text-muted-foreground">
          O <code>access_token</code> não expira na prática — pode gerá-lo uma vez e guardá-lo para uso contínuo.
          A forma de o invalidar é <strong>revogar a chave</strong> em{" "}
          <Link href="/dashboard/developer" className="text-primary hover:underline">
            Programador
          </Link>
          , o que invalida imediatamente todos os tokens emitidos a partir dela. Envie-o em todos os pedidos no
          cabeçalho:
        </p>
        <Code>{`Authorization: Bearer SEU_ACCESS_TOKEN`}</Code>
        <p className="text-xs text-muted-foreground">
          <code>client_id</code>/<code>client_secret</code> errados, ou uma chave revogada, devolvem{" "}
          <code>401</code>. Se a sua chave for de <strong>teste</strong>, o token resultante só funciona nos
          endpoints em modo simulado (ver secção Cobranças); se for <strong>live</strong>, o token move dados e
          dinheiro reais assim que a conta tiver acesso de produção ativo.
        </p>
      </Section>

      <Section id="charges" title="Cobranças — criar uma venda">
        <Endpoint method="POST" path="/api/v1/charges" />
        <p className="text-sm text-muted-foreground">
          Cria uma cobrança para um dos seus produtos, a partir do checkout personalizado da sua própria app. Com uma
          chave de teste, devolve sempre sucesso instantâneo sem mover dinheiro real. Com uma chave live, cria uma
          venda real — as mesmas taxas, notificações e webhook de <code>payment.completed</code> aplicam-se como no
          checkout normal da PayNow.
        </p>
        <p className="text-xs font-semibold text-muted-foreground">Corpo do pedido</p>
        <FieldsTable
          rows={[
            {
              field: "product_id",
              type: "string (uuid)",
              required: "Sim, ou amount",
              note: "Id de um produto seu já aprovado. Use isto OU amount, nunca os dois.",
            },
            {
              field: "amount",
              type: "número",
              required: "Sim, ou product_id",
              note: "Cobrança sem produto associado. Mínimo 50.",
            },
            {
              field: "currency",
              type: '"MZN" | "ZAR"',
              required: "Não",
              note: 'Só usado com amount. Padrão "MZN".',
            },
            {
              field: "description",
              type: "string",
              required: "Não",
              note: "Só usado com amount — aparece nos seus registos internos.",
            },
            { field: "customer_name", type: "string", required: "Sim", note: "Nome do cliente final." },
            { field: "customer_email", type: "string", required: "Sim", note: "Email do cliente final." },
            { field: "customer_phone", type: "string", required: "Não", note: "Formato 84/85/86/87xxxxxxx." },
            {
              field: "payment_method",
              type: '"mpesa" | "emola" | "mkesh" | "visa_mastercard"',
              required: "Não",
              note: 'Padrão "mpesa". Nem todos os métodos estão sempre disponíveis — depende do processador de pagamento ativo da PayNow nesse momento.',
            },
          ]}
        />
        <p className="text-xs font-semibold text-muted-foreground">Exemplo — cobrar um produto seu</p>
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
        <p className="text-xs font-semibold text-muted-foreground">Exemplo — cobrança sem produto (valor livre)</p>
        <Code>{`curl -X POST ${baseUrl}/api/v1/charges \\
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 500,
    "currency": "MZN",
    "description": "Assinatura mensal do meu app",
    "customer_name": "Maria João",
    "customer_email": "maria@exemplo.com",
    "customer_phone": "841234567",
    "payment_method": "mpesa"
  }'`}</Code>
        <p className="text-xs font-semibold text-muted-foreground">Resposta (201) — modo live</p>
        <Code>{`{
  "success": true,
  "data": {
    "reference": "id do pedido (orders.id)",
    "status": "pending",
    "checkout_url": null
  }
}`}</Code>
        <p className="text-xs font-semibold text-muted-foreground">Resposta (200) — modo teste</p>
        <Code>{`{
  "success": true,
  "data": {
    "reference": "test_9f2a...",
    "status": "success",
    "test_mode": true
  }
}`}</Code>
        <FieldsTable
          rows={[
            {
              field: "reference",
              type: "string",
              required: "—",
              note: "Guarde este id — é o identificador do pedido, usado para o relacionar com o evento do webhook.",
            },
            {
              field: "status",
              type: '"success" | "pending"',
              required: "—",
              note: '"success" só em modo teste, ou em métodos que confirmam na hora. "pending" aguarda confirmação no telemóvel do cliente — use o webhook para saber quando muda para pago.',
            },
            {
              field: "checkout_url",
              type: "string | null",
              required: "—",
              note: "Não nulo quando o método exige redireccionar o cliente para uma página de pagamento (ex.: cartão). Nulo para STK push (M-Pesa/e-Mola/mKesh), onde o cliente confirma diretamente no telemóvel.",
            },
          ]}
        />
        <Note>
          Este endpoint <strong>não tem proteção de idempotência</strong> (sem suporte a um cabeçalho tipo{" "}
          <code>Idempotency-Key</code>). Se o seu pedido HTTP falhar por timeout de rede, confirme pelo webhook ou
          por <code>GET /api/v1/orders</code> antes de repetir a chamada — repetir sem confirmar pode criar duas
          cobranças separadas para o mesmo cliente.
        </Note>
      </Section>

      <Section id="products" title="Produtos">
        <Endpoint method="GET" path="/api/v1/products" />
        <p className="text-sm text-muted-foreground">
          Lista todos os seus produtos, em qualquer estado (<code>pending</code>, <code>approved</code>,{" "}
          <code>rejected</code>), do mais recente para o mais antigo. Sem paginação nem filtros — devolve sempre a
          lista completa.
        </p>
        <Code>{`curl ${baseUrl}/api/v1/products \\
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"`}</Code>
        <p className="text-xs font-semibold text-muted-foreground">Resposta (200)</p>
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
        <p className="text-xs text-muted-foreground">
          Só produtos com <code>status: "approved"</code> podem ser cobrados via <code>POST /api/v1/charges</code>{" "}
          usando <code>product_id</code> — um produto <code>pending</code> ou <code>rejected</code> devolve{" "}
          <code>404</code> nesse endpoint.
        </p>

        <div className="border-t border-border pt-3">
          <Endpoint method="POST" path="/api/v1/products" />
          <p className="text-sm text-muted-foreground">
            Cria um novo produto (fica com estado <code>pending</code> — precisa de aprovação manual da equipa
            PayNow antes de poder vender, tal como um produto criado pelo painel). Não é possível enviar o ficheiro
            digital do produto por esta API — faça isso no painel depois de criar o registo.
          </p>
          <p className="text-xs font-semibold text-muted-foreground">Corpo do pedido</p>
          <FieldsTable
            rows={[
              { field: "title", type: "string", required: "Sim", note: "Nome do produto." },
              { field: "description", type: "string", required: "Não", note: 'Padrão string vazia se omitido.' },
              { field: "price_mzn", type: "número", required: "Sim", note: "Mínimo 50. Moeda fixa em MZN." },
            ]}
          />
          <Code>{`curl -X POST ${baseUrl}/api/v1/products \\
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Nome do produto",
    "description": "Descrição do produto",
    "price_mzn": 250
  }'`}</Code>
          <p className="text-xs font-semibold text-muted-foreground">Resposta (201)</p>
          <Code>{`{
  "success": true,
  "product": { "id": "...", "title": "Nome do produto", "price_mzn": 250, "status": "pending" }
}`}</Code>
        </div>
      </Section>

      <Section id="offers" title="Ofertas">
        <Endpoint method="GET" path="/api/v1/offers" />
        <p className="text-sm text-muted-foreground">
          Lista os seus produtos no formato "oferta" (1 oferta por produto, id no formato{" "}
          <code>offer_&#123;product_id&#125;</code>) — útil para integrações que trabalham com o conceito de
          "offer" em vez de produto direto. Não é um recurso independente: é sempre derivado da sua lista de
          produtos, na hora do pedido.
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
        <p className="text-xs text-muted-foreground">
          <code>price</code> é o preço promocional do produto quando definido, senão o preço normal.{" "}
          <code>status</code> é <code>"active"</code> apenas se o produto estiver <code>approved</code> — caso
          contrário <code>"inactive"</code>. Este endpoint é apenas de leitura (GET); não existe{" "}
          <code>POST /api/v1/offers</code>.
        </p>
      </Section>

      <Section id="orders" title="Vendas">
        <Endpoint method="GET" path="/api/v1/orders" />
        <p className="text-sm text-muted-foreground">
          Lista as vendas <strong>confirmadas (pagas)</strong> da sua conta, mais recentes primeiro. Vendas
          pendentes, falhadas ou reembolsadas não aparecem aqui; para acompanhar o estado de uma venda específica em
          tempo real use o webhook <code>payment.completed</code> ou guarde o <code>reference</code> devolvido por{" "}
          <code>POST /api/v1/charges</code> no seu próprio sistema.
        </p>
        <p className="text-xs font-semibold text-muted-foreground">Parâmetros de query (todos opcionais)</p>
        <FieldsTable
          rows={[
            {
              field: "since",
              type: "string (ISO 8601)",
              required: "Não",
              note: "Só vendas criadas a partir desta data/hora (inclusive).",
            },
            {
              field: "until",
              type: "string (ISO 8601)",
              required: "Não",
              note: "Só vendas criadas até esta data/hora (inclusive).",
            },
            {
              field: "limit",
              type: "número",
              required: "Não",
              note: "Vendas por página. Padrão 100, máximo 200.",
            },
            {
              field: "cursor",
              type: "string (uuid)",
              required: "Não",
              note: "Id da última venda da página anterior — use o next_cursor da resposta para avançar.",
            },
          ]}
        />
        <Code>{`curl "${baseUrl}/api/v1/orders?limit=50&since=2026-08-01T00:00:00Z" \\
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"`}</Code>
        <p className="text-xs font-semibold text-muted-foreground">Resposta (200)</p>
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
  ],
  "has_more": true,
  "next_cursor": "id da última venda desta página"
}`}</Code>
        <p className="text-xs text-muted-foreground">
          <code>product</code> é <code>&#123; "id": null, "name": "Produto" &#125;</code> para cobranças manuais
          (criadas com <code>amount</code> em vez de <code>product_id</code>), já que não têm um produto associado.{" "}
          <code>status</code> é sempre <code>"paid"</code> nesta lista. Para percorrer todas as vendas, chame o
          endpoint outra vez passando <code>cursor=next_cursor</code> até <code>has_more</code> vir{" "}
          <code>false</code>.
        </p>
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
        <p className="text-xs font-semibold text-muted-foreground">Corpo do pedido</p>
        <FieldsTable
          rows={[
            {
              field: "url",
              type: "string",
              required: "Sim",
              note: "Deve começar com https://. URLs http:// são rejeitadas.",
            },
            {
              field: "events",
              type: "string[]",
              required: "Não",
              note: 'Padrão ["payment.completed"] — é o único evento suportado atualmente, por isso na prática pode omitir este campo.',
            },
          ]}
        />
        <Code>{`curl -X POST ${baseUrl}/api/v1/webhooks \\
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://seu-site.com/webhook",
    "events": ["payment.completed"]
  }'`}</Code>
        <p className="text-xs font-semibold text-muted-foreground">Resposta (200)</p>
        <Code>{`{
  "success": true,
  "message": "Webhook configurado com sucesso.",
  "webhook": {
    "url": "https://seu-site.com/webhook",
    "secret": "whsec_...",
    "events": ["payment.completed"],
    "is_active": true
  }
}`}</Code>
        <Note>
          <strong>Um único webhook por conta.</strong> Este endpoint é um <em>upsert</em>: se já existir um webhook
          configurado, chamar <code>POST</code> outra vez <strong>substitui-o por completo</strong> (incluindo um
          novo <code>secret</code>) — não é possível ter vários endpoints a receber o mesmo evento. A resposta é a
          única vez que o <code>secret</code> em texto simples é devolvido; guarde-o imediatamente, porque{" "}
          <code>GET /api/v1/webhooks</code> devolve sempre uma versão mascarada.
        </Note>
        <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
          <div>
            <Endpoint method="GET" path="/api/v1/webhooks" />
            <p className="text-xs text-muted-foreground">
              Consulta o webhook configurado (secret mascarado, ex.: <code>whsec_abc1**...**wxyz</code>). Devolve{" "}
              <code>&#123; "success": true, "webhook": null &#125;</code> se nenhum estiver configurado.
            </p>
          </div>
          <div>
            <Endpoint method="DELETE" path="/api/v1/webhooks" />
            <p className="text-xs text-muted-foreground">
              Remove o webhook configurado. Sempre devolve sucesso, mesmo que não existisse nenhum.
            </p>
          </div>
        </div>
      </Section>

      <Section id="webhooks-events" title="Webhooks — eventos recebidos">
        <p className="text-sm text-muted-foreground">
          Quando uma venda sua é confirmada, a PayNow envia um <code>POST</code> ao seu endpoint com este corpo:
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
          <code>{"`${timestamp}.${corpo_em_texto}`"}</code> usando o <code>secret</code> do seu webhook. Valide
          sempre a assinatura antes de confiar no evento — nunca processe o corpo sem verificar primeiro, para
          evitar que alguém finja um pagamento enviando um pedido falso para o seu endpoint:
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
          Use o <code>rawBody</code> exatamente como recebido (a string em bruto, não o objeto já convertido com{" "}
          <code>JSON.parse</code>) — qualquer diferença de espaçamento ou ordem de campos muda o hash calculado.
        </p>
        <p className="text-xs text-muted-foreground">
          O seu endpoint deve responder com um estado 2xx dentro de 10 segundos — se falhar ou demorar, a entrega é
          registada como falhada. <strong>Não há reenvio automático</strong> no momento: se o seu servidor estiver
          em baixo quando o evento é enviado, esse evento não será repetido — use{" "}
          <code>GET /api/v1/orders</code> periodicamente como rede de segurança se isto for crítico para si.
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
              <td className="py-2">
                Campos em falta ou inválidos no corpo do pedido (ex.: falta <code>customer_email</code>,{" "}
                <code>amount</code> abaixo do mínimo, <code>url</code> do webhook sem <code>https://</code>).
              </td>
            </tr>
            <tr className="border-b border-border/60">
              <td className="py-2 pr-4 font-mono">401</td>
              <td className="py-2">
                Token de acesso em falta, inválido, ou de uma chave revogada, ou credenciais erradas em{" "}
                <code>/oauth/token</code>. Peça um novo <code>access_token</code>.
              </td>
            </tr>
            <tr className="border-b border-border/60">
              <td className="py-2 pr-4 font-mono">403</td>
              <td className="py-2">
                Modo produção não desbloqueado (chave live sem os 300 MT pagos, e sem teste grátis de 24h ativo).
                Só acontece em <code>POST /api/v1/charges</code> com uma chave live.
              </td>
            </tr>
            <tr className="border-b border-border/60">
              <td className="py-2 pr-4 font-mono">404</td>
              <td className="py-2">
                Produto não encontrado, não aprovado, ou não pertence à conta da chave usada.
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-mono">500 / 502</td>
              <td className="py-2">
                Erro interno inesperado, ou falha ao comunicar com o processador de pagamento. Tente novamente
                depois de alguns segundos; se persistir, contacte o suporte.
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="limits" title="Limites e boas práticas">
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            <strong>Sem limite de taxa (rate limit) dedicado</strong> no momento — mas evite pedidos em ciclo
            apertado; abuso pode levar à revogação manual da chave.
          </li>
          <li>
            <strong>Sem paginação</strong> em <code>products</code> e <code>offers</code> — devolvem sempre a lista
            inteira numa só resposta. Só <code>orders</code> suporta paginação (<code>cursor</code>/<code>limit</code>
            /<code>since</code>/<code>until</code> — ver secção Vendas).
          </li>
          <li>
            <strong>Sem suporte a idempotência</strong> em <code>POST /api/v1/charges</code> — trate falhas de rede
            com cuidado (ver nota na secção Cobranças).
          </li>
          <li>
            Guarde o <code>access_token</code> — não expira — e reutilize-o em vez de pedir um novo a cada chamada;
            só precisa de gerar outro se revogar a chave e criar uma nova.
          </li>
          <li>
            Nunca exponha o seu <code>client_secret</code> no código do lado do cliente (browser/app móvel) — troque-o
            por um <code>access_token</code> sempre a partir do seu servidor.
          </li>
        </ul>
      </Section>
    </div>
  );
}
