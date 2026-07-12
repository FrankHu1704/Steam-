// Serve o HTML do painel só depois de passar na Basic Auth — mesmo a "casca" da
// página fica protegida, não só os dados.

const { requireAdminAuth } = require("../../lib/adminAuth");

const HTML = `<!DOCTYPE html>
<html lang="pt-MZ">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'">
<meta name="robots" content="noindex, nofollow">
<title>Painel — Frank AI Solutions</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#0B0614; --bg-soft:#120B22; --panel:#17102C; --line:rgba(216,180,254,0.14);
    --text:#F5F1FF; --text-dim:#9C8FC2; --accent:#A855F7; --accent-2:#E879F9;
    --accent-rgb:168,85,247; --mono:'JetBrains Mono',monospace; --display:'Space Grotesk',sans-serif;
  }
  *{margin:0;padding:0;box-sizing:border-box;}
  body{background:var(--bg); color:var(--text); font-family:var(--display); min-height:100vh;}
  a{color:inherit;}
  header{padding:28px 5vw; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;}
  header h1{font-size:1.3rem;}
  header a.back{font-family:var(--mono); font-size:12px; color:var(--accent);}
  main{padding:36px 5vw 80px; max-width:1100px; margin:0 auto;}
  .cards{display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:1px; background:var(--line); border:1px solid var(--line); border-radius:14px; overflow:hidden; margin-bottom:40px;}
  .card{background:var(--bg-soft); padding:22px 20px;}
  .card .k{font-family:var(--mono); font-size:11px; color:var(--accent-2); text-transform:uppercase; letter-spacing:0.06em;}
  .card .v{margin-top:8px; font-size:1.6rem; font-weight:700;}
  table{width:100%; border-collapse:collapse; font-size:0.88rem;}
  th, td{padding:10px 12px; text-align:left; border-bottom:1px solid var(--line); white-space:nowrap;}
  th{font-family:var(--mono); font-size:11px; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.05em;}
  tr:hover td{background:rgba(var(--accent-rgb),0.05);}
  .status{font-family:var(--mono); font-size:11px; padding:3px 10px; border-radius:20px; display:inline-block;}
  .status.success{color:#4ade80; border:1px solid rgba(74,222,128,0.4);}
  .status.failed{color:#f87171; border:1px solid rgba(248,113,113,0.4);}
  .status.pending{color:var(--accent-2); border:1px solid rgba(232,121,249,0.4);}
  .table-wrap{overflow-x:auto; border:1px solid var(--line); border-radius:14px;}
  .pager{display:flex; justify-content:flex-end; gap:10px; margin-top:16px; font-family:var(--mono); font-size:12px;}
  .pager button{background:transparent; border:1px solid var(--line); color:var(--text); padding:8px 16px; border-radius:20px; cursor:pointer;}
  .pager button:disabled{opacity:0.4; cursor:default;}
  .msg{font-family:var(--mono); font-size:13px; color:var(--text-dim); padding:20px 0;}
  section{margin-bottom:20px;}
  section h2{font-size:1rem; margin-bottom:16px; color:var(--text-dim); font-weight:600;}
</style>
</head>
<body>
<header>
  <h1>Painel — Frank AI Solutions</h1>
  <a class="back" href="./">← voltar ao site</a>
</header>
<main>
  <section>
    <h2>Resumo</h2>
    <div class="cards" id="cards"><div class="card"><div class="k">A carregar</div><div class="v">…</div></div></div>
  </section>
  <section>
    <h2>Transações</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Data</th><th>Nome</th><th>Valor</th><th>Método</th><th>Estado</th><th>Referência</th></tr></thead>
        <tbody id="rows"><tr><td class="msg" colspan="6">A carregar…</td></tr></tbody>
      </table>
    </div>
    <div class="pager">
      <button id="prevBtn" disabled>← Anterior</button>
      <span id="pageInfo"></span>
      <button id="nextBtn" disabled>Seguinte →</button>
    </div>
  </section>
</main>
<script src="/admin.js" defer></script>
</body>
</html>`;

module.exports = async (req, res) => {
  if (!requireAdminAuth(req, res)) return;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(HTML);
};
