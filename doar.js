// Fala com as funções serverless do próprio projeto Vercel
// (api/donate.js, api/donation-status.js). Este ficheiro corre com CSP
// "script-src 'self'" — não deve depender de scripts inline ou de terceiros.
//
// IMPORTANTE: a validação abaixo é apenas defesa em profundidade no cliente.
// O backend (/api/donate, /api/donation-status) TEM de repetir toda a
// validação (valor, moeda, formato de telefone/e-mail, origem do checkoutUrl)
// porque qualquer pedido pode ser feito diretamente por fora do browser.

(function () {
  "use strict";

  const root = document.documentElement;

  // ---------- tracking (visitas/cliques, sem dados pessoais) ----------
  function track(event, label) {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: window.location.pathname, event, label }),
      keepalive: true,
    }).catch(() => {});
  }
  track("pageview");

  // ---------- barra de progresso (dados reais; fica escondida se não houver meta configurada) ----------
  (function loadProgress() {
    const wrap = document.getElementById("progressWrap");
    const fill = document.getElementById("progressFill");
    const label = document.getElementById("progressLabel");
    if (!wrap) return;
    fetch("/api/donation-progress")
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((data) => {
        if (!data.configured) return;
        wrap.style.display = "block";
        fill.style.width = data.percent + "%";
        const raised = Math.round(data.raised).toLocaleString("pt-MZ");
        const goal = Math.round(data.goal).toLocaleString("pt-MZ");
        label.textContent = raised + " MT de " + goal + " MT angariados este mês (" + data.percent + "%)";
      })
      .catch(() => {});
  })();

  // ---------- frequência da doação ----------
  let frequency = "once";
  const freqButtons = document.querySelectorAll(".freq-btn");
  freqButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      freqButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      frequency = btn.dataset.freq;
    });
  });

  // ---------- tema ----------
  const themeToggle = document.getElementById("themeToggle");
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) root.setAttribute("data-theme", savedTheme);
  else if (window.matchMedia("(prefers-color-scheme: light)").matches) root.setAttribute("data-theme", "light");
  themeToggle.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });

  // ---------- valores predefinidos ----------
  const amountInput = document.getElementById("amount");
  const amountButtons = document.querySelectorAll(".amount-btn");
  amountButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      amountButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      amountInput.value = btn.dataset.amount;
    });
  });
  amountInput.addEventListener("input", () => amountButtons.forEach((b) => b.classList.remove("active")));

  // ---------- número da carteira só é exigido para mobile money ----------
  const methodSelect = document.getElementById("method");
  const walletNumberField = document.getElementById("walletNumberField");
  const walletNumberInput = document.getElementById("walletNumber");
  function syncWalletField() {
    const needsNumber = methodSelect.value !== "visa_mastercard";
    walletNumberField.style.display = needsNumber ? "block" : "none";
    walletNumberInput.required = needsNumber;
  }
  methodSelect.addEventListener("change", syncWalletField);
  syncWalletField();

  const form = document.getElementById("donateForm");
  const submitBtn = document.getElementById("submitBtn");
  const errorBox = document.getElementById("errorBox");
  const statusBox = document.getElementById("statusBox");
  const honeypot = document.getElementById("hp_website");

  // Ícones (sem emojis) usados nas mensagens de erro/estado. O texto é sempre
  // escrito por nós (nunca vem do utilizador), por isso construir com innerHTML aqui é seguro.
  const ICONS = {
    warn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    ok: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>',
    fail: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    pending: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  };

  function showError(text) {
    statusBox.style.display = "none";
    errorBox.style.display = "flex";
    errorBox.innerHTML = ICONS.warn + "<span>" + text + "</span>";
  }

  function showStatus(kind, text) {
    errorBox.style.display = "none";
    statusBox.style.display = "flex";
    statusBox.className = "status-panel " + kind;
    statusBox.innerHTML = (ICONS[kind] || "") + "<span>" + text + "</span>";
  }

  // ---------- validação client-side (defesa em profundidade) ----------
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_RE = /^\+?[0-9]{9,15}$/;
  const MIN_AMOUNT = 1;
  const MAX_AMOUNT = 1000000;

  function parseAmount(raw) {
    const n = Math.trunc(Number(raw));
    if (!Number.isFinite(n) || n < MIN_AMOUNT || n > MAX_AMOUNT) return null;
    return n;
  }

  // Domínios de checkout autorizados a receber o redireccionamento pós-pagamento.
  // Ajuste para o(s) domínio(s) reais do vosso gateway de pagamento.
  const ALLOWED_CHECKOUT_HOSTS = ["debitopay.co.mz"];

  function isSafeCheckoutUrl(rawUrl) {
    let parsed;
    try {
      parsed = new URL(rawUrl, window.location.origin);
    } catch (e) {
      return false;
    }
    if (parsed.origin === window.location.origin) return true;
    if (parsed.protocol !== "https:") return false;
    return ALLOWED_CHECKOUT_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith("." + host)
    );
  }

  // ---------- polling do estado do pagamento ----------
  let pollTimer = null;
  const POLL_INTERVAL_MS = 4000;
  const POLL_MAX_ATTEMPTS = 90; // ~6 minutos

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function pollDonation(paymentId, notifyInfo) {
    stopPolling(); // nunca deixar mais do que um polling activo em simultâneo
    let attempts = 0;
    pollTimer = setInterval(async () => {
      attempts += 1;
      if (attempts > POLL_MAX_ATTEMPTS) {
        stopPolling();
        showStatus("fail", "Tempo de confirmação esgotado. Se já pagou, contacte o suporte.");
        submitBtn.disabled = false;
        return;
      }
      try {
        const res = await fetch("/api/donation-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId, ...notifyInfo }),
        });
        if (!res.ok) return; // tenta novamente no próximo ciclo
        const data = await res.json();
        if (data.status === "success") {
          stopPolling();
          showStatus("ok", "Doação confirmada — muito obrigado pelo apoio!");
        } else if (data.status === "failed" || data.status === "expired") {
          stopPolling();
          showStatus("fail", "O pagamento não foi confirmado. Pode tentar novamente.");
          submitBtn.disabled = false;
        }
      } catch (e) {
        // erro de rede pontual: mantém o polling silenciosamente
      }
    }, POLL_INTERVAL_MS);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // campo-isco: se estiver preenchido, é quase certamente um bot — ignora silenciosamente
    if (honeypot.value.trim() !== "") return;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    errorBox.style.display = "none";
    statusBox.style.display = "none";

    const method = methodSelect.value;
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const whatsapp = document.getElementById("whatsapp").value.trim();
    const walletNumber = walletNumberInput.value.trim();
    const message = document.getElementById("message").value.trim();

    const amount = parseAmount(amountInput.value);
    if (amount === null) {
      showError(`Valor inválido. Escolha um valor entre ${MIN_AMOUNT} e ${MAX_AMOUNT} MZN.`);
      return;
    }
    if (!EMAIL_RE.test(email)) {
      showError("Introduza um e-mail válido.");
      return;
    }
    if (!PHONE_RE.test(whatsapp)) {
      showError("Introduza um número de WhatsApp válido (com código do país).");
      return;
    }
    if (method !== "visa_mastercard" && !PHONE_RE.test(walletNumber)) {
      showError("Introduza um número de carteira válido para o método escolhido.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "A processar…";
    track("cta_click", "doar_submit");

    try {
      const res = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: method,
          amount,
          currency: "MZN",
          donorName: name,
          donorEmail: email,
          donorPhone: method !== "visa_mastercard" ? walletNumber : undefined,
          message: message || undefined,
          recurring: frequency === "monthly",
          returnUrl: window.location.href,
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch (e) {
        throw new Error("Resposta inesperada do servidor.");
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || "Não foi possível processar a doação.");
      }

      if (data.checkoutUrl) {
        if (!isSafeCheckoutUrl(data.checkoutUrl)) {
          throw new Error("URL de pagamento inválido. Contacte o suporte.");
        }
        window.location.href = data.checkoutUrl;
        return;
      }

      showStatus("pending", "Confirme o pagamento no seu telefone (" + method.toUpperCase() + ").");
      pollDonation(data.paymentId, {
        donorPhone: whatsapp,
        amount,
        currency: "MZN",
      });
    } catch (err) {
      showError("Erro: " + err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = "Doar Agora";
    }
  });
})();
