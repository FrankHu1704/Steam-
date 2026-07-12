// Cliente do painel. Não tem segredos — a proteção real está nos endpoints
// /api/admin/* (Basic Auth), não neste ficheiro.
(function () {
  "use strict";

  const PAGE_SIZE = 25;
  let currentPage = 1;

  function fmtMoney(n) {
    return (Number(n) || 0).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MT";
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("pt-MZ");
  }

  function statusLabel(status) {
    if (status === "success") return { text: "Sucesso", cls: "success" };
    if (status === "failed") return { text: "Falhou", cls: "failed" };
    return { text: "Pendente", cls: "pending" };
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  async function loadStats() {
    const cards = document.getElementById("cards");
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("stats " + res.status);
      const s = await res.json();
      cards.innerHTML = `
        <div class="card"><div class="k">Visitas totais</div><div class="v">${s.totalViews}</div></div>
        <div class="card"><div class="k">Visitantes únicos (aprox.)</div><div class="v">${s.uniqueVisitors}</div></div>
        <div class="card"><div class="k">Doações com sucesso</div><div class="v">${s.donations.success}</div></div>
        <div class="card"><div class="k">Total arrecadado</div><div class="v">${fmtMoney(s.donations.sumSuccess)}</div></div>
        <div class="card"><div class="k">Doações falhadas</div><div class="v">${s.donations.failed}</div></div>
        <div class="card"><div class="k">Doações pendentes</div><div class="v">${s.donations.pending}</div></div>
      `;
    } catch (e) {
      cards.innerHTML = '<div class="msg">Não foi possível carregar as estatísticas.</div>';
    }
  }

  async function loadTransactions(page) {
    const rows = document.getElementById("rows");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const pageInfo = document.getElementById("pageInfo");
    rows.innerHTML = '<tr><td class="msg" colspan="6">A carregar…</td></tr>';
    try {
      const res = await fetch("/api/admin/transactions?page=" + page);
      if (!res.ok) throw new Error("transactions " + res.status);
      const data = await res.json();
      const list = data.transactions || [];

      if (list.length === 0) {
        rows.innerHTML = '<tr><td class="msg" colspan="6">Sem transações.</td></tr>';
      } else {
        rows.innerHTML = list
          .map((t) => {
            const st = statusLabel(t.status);
            const name = escapeHtml(t.donor_name || "—");
            const ref = escapeHtml(t.reference || t.external_id || "—");
            const method = escapeHtml((t.method || "—").toUpperCase());
            return `<tr>
              <td>${fmtDate(t.created_at)}</td>
              <td>${name}</td>
              <td>${fmtMoney(t.amount)}</td>
              <td>${method}</td>
              <td><span class="status ${st.cls}">${st.text}</span></td>
              <td>${ref}</td>
            </tr>`;
          })
          .join("");
      }

      const total = data.total || 0;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      pageInfo.textContent = `Página ${page} de ${totalPages}`;
      prevBtn.disabled = page <= 1;
      nextBtn.disabled = page >= totalPages;
    } catch (e) {
      rows.innerHTML = '<tr><td class="msg" colspan="6">Não foi possível carregar as transações.</td></tr>';
    }
  }

  document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage -= 1;
      loadTransactions(currentPage);
    }
  });
  document.getElementById("nextBtn").addEventListener("click", () => {
    currentPage += 1;
    loadTransactions(currentPage);
  });

  loadStats();
  loadTransactions(currentPage);
})();
