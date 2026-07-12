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

  function showError(text) {
    statusBox.style.display = "none";
    errorBox.style.display = "block";
    errorBox.textContent = text;
  }

  function showStatus(kind, text) {
    errorBox.style.display = "none";
    statusBox.style.display = "block";
    statusBox.className = "status-panel " + kind;
    statusBox.textContent = text;
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
        showStatus("fail", "⏱️ Tempo de confirmação esgotado. Se já pagou, contacte o suporte.");
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
          showStatus("ok", "✅ Doação confirmada — muito obrigado pelo apoio!");
        } else if (data.status === "failed" || data.status === "expired") {
          stopPolling();
          showStatus("fail", "❌ O pagamento não foi confirmado. Pode tentar novamente.");
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

      showStatus("pending", "⏳ Confirme o pagamento no seu telefone (" + method.toUpperCase() + ").");
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
