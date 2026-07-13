// Protegido por Basic Auth. Estatísticas agregadas: visitas, visitantes únicos
// (aproximado, por hash de IP) e totais de doações por estado.

const { requireAdminAuth } = require("../../lib/adminAuth");
const { supabaseSelect, supabaseCount } = require("../../lib/supabaseRest");

module.exports = async (req, res) => {
  if (!requireAdminAuth(req, res)) return;

  try {
    const [totalViews, recentViews, donationsResult, quizOpens, quizSteps, quizCompletions] = await Promise.all([
      supabaseCount("page_events?event=eq.pageview"),
      supabaseSelect("page_events?select=ip_hash&event=eq.pageview&order=created_at.desc&limit=5000"),
      supabaseSelect("donations?select=status,amount"),
      supabaseCount("page_events?event=eq.cta_click&label=eq.quiz_open"),
      supabaseSelect("page_events?select=label&event=eq.quiz_step&limit=20000"),
      supabaseCount("page_events?event=eq.cta_click&label=like.quiz_complete*"),
    ]);

    const uniqueVisitors = new Set(
      (recentViews.data || []).map((r) => r.ip_hash).filter(Boolean)
    ).size;

    const totals = { success: 0, failed: 0, pending: 0, sumSuccess: 0 };
    (donationsResult.data || []).forEach((d) => {
      if (d.status === "success") {
        totals.success += 1;
        totals.sumSuccess += Number(d.amount) || 0;
      } else if (d.status === "failed") {
        totals.failed += 1;
      } else {
        totals.pending += 1;
      }
    });

    const stepCounts = { step_1: 0, step_2: 0, step_3: 0, step_4: 0 };
    (quizSteps.data || []).forEach((r) => {
      if (r.label && Object.prototype.hasOwnProperty.call(stepCounts, r.label)) {
        stepCounts[r.label] += 1;
      }
    });

    res.status(200).json({
      totalViews,
      uniqueVisitors,
      donations: totals,
      quiz: { opens: quizOpens, steps: stepCounts, completions: quizCompletions },
    });
  } catch (e) {
    res.status(500).json({ error: "Não foi possível carregar as estatísticas." });
  }
};
