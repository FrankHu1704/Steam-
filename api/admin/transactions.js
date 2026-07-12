// Protegido por Basic Auth (ver lib/adminAuth.js). Devolve a lista de doações
// guardadas na tabela `donations`, paginada.

const { requireAdminAuth } = require("../../lib/adminAuth");
const { supabaseSelect } = require("../../lib/supabaseRest");

const PAGE_SIZE = 25;

module.exports = async (req, res) => {
  if (!requireAdminAuth(req, res)) return;

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  try {
    const { data, total } = await supabaseSelect("donations?select=*&order=created_at.desc", {
      range: `${from}-${to}`,
    });
    res.status(200).json({ transactions: data, page, pageSize: PAGE_SIZE, total });
  } catch (e) {
    res.status(500).json({ error: "Não foi possível carregar as transações." });
  }
};
