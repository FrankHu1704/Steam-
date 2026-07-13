// Endpoint público e seguro: devolve só o total angariado este mês e a meta
// configurada (sem nomes, e-mails ou qualquer dado de doadores).

const { supabaseSelect } = require("../lib/supabaseRest");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  const goal = Number(process.env.DONATION_GOAL_MZN);
  if (!goal || goal <= 0) {
    // sem meta configurada: não mostrar nada em vez de inventar um número
    res.status(200).json({ configured: false });
    return;
  }

  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data } = await supabaseSelect(
      `donations?select=amount&status=eq.success&created_at=gte.${encodeURIComponent(monthStart)}`
    );

    const raised = (data || []).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const percent = Math.max(0, Math.min(100, Math.round((raised / goal) * 100)));

    res.status(200).json({ configured: true, goal, raised, percent });
  } catch (e) {
    res.status(200).json({ configured: false });
  }
};
