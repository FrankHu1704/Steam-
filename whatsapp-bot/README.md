# Assistente PagaJá no WhatsApp

Bot standalone (Baileys + Groq) que responde a quem escrever ao número de
WhatsApp da PagaJá. Corre como um processo separado — **não faz parte do
deploy do site na Vercel**, porque precisa de manter uma ligação aberta ao
WhatsApp e uma sessão gravada em disco, o que a Vercel não suporta.

As conversas ficam gravadas no mesmo Supabase do site, na tabela
`whatsapp_bot_messages`, e aparecem em **Admin → Assistente WhatsApp** no
painel da PagaJá.

## Configurar (Termux)

```bash
cd ~
git clone <repo> pagaja-whatsapp-bot-src   # ou copie só a pasta whatsapp-bot/
cd pagaja-whatsapp-bot-src/whatsapp-bot
pkg install nodejs -y
npm install
cp .env.example .env
# edite o .env: cole os valores de NEXT_PUBLIC_SUPABASE_URL,
# SUPABASE_SERVICE_ROLE_KEY e GROQ_API_KEYS — os mesmos que já usa no site.
```

## Ligar ao WhatsApp

```bash
npm start
```

Na primeira vez, o script mostra um **QR code** no terminal. No telemóvel
que vai ser o número oficial da PagaJá:

1. WhatsApp → Configurações → Aparelhos conectados
2. Conectar aparelho
3. Aponte a câmara para o QR code mostrado no terminal

Se o Termux estiver com a letra pequena e o QR ficar cortado, aumente o
tamanho do terminal (ou rode o telemóvel para paisagem) antes de escanear.

Depois de ligado, a sessão fica gravada em `./sessions` — não precisa de
ligar outra vez a menos que apague essa pasta ou termine sessão no
telemóvel.

## Manter a correr

O processo tem de ficar sempre ligado para o bot responder. No Termux, use
algo como `pm2` ou um `tmux`/`screen` para não parar quando fechar o app:

```bash
npm install -g pm2
pm2 start index.js --name pagaja-bot
pm2 save
```

## Âmbito

Este assistente responde só sobre a PagaJá (o que é, taxas, como
vender/comprar, links do site) — não faz música, imagens ou transcrição de
áudio. Nunca menciona por trás de que tecnologia de IA corre.
