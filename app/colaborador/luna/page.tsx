import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLunaMessages } from "@/lib/data/luna";
import { askLunaAsEmployee, clearLunaHistoryAsEmployee } from "@/lib/actions/luna-employee";
import { LunaChat } from "@/components/luna/luna-chat";

const QUICK_PROMPTS = [
  "Como funciona a minha comissão?",
  "Onde devo partilhar o meu link?",
  "Como sei se um produtor recrutado já está a vender?",
  "Quando recebo o pagamento?",
];

export default async function ColaboradorLunaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/colaborador/login");

  const messages = await getLunaMessages(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">LunaAI</h1>
        <p className="text-sm text-muted-foreground">Tire dúvidas sobre o programa e peça dicas de recrutamento.</p>
      </div>
      <LunaChat
        initialMessages={messages.map((m) => ({ role: m.role, content: m.content }))}
        onSend={askLunaAsEmployee}
        onClear={clearLunaHistoryAsEmployee}
        quickPrompts={QUICK_PROMPTS}
        subtitle="Suporte e dúvidas sobre o programa de colaboradores."
        emptyStateText="Pergunte à LunaAI como funciona a comissão, o pagamento, ou como recrutar mais produtores."
      />
    </div>
  );
}
