import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import NewAgentForm from "./NewAgentForm";
import LogoutButton from "./LogoutButton";

const STATUS_LABEL: Record<string, string> = {
  connected: "🟢 Ligado",
  pairing: "🟡 A parear",
  disconnected: "🔴 Desligado",
};

export default async function DashboardPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const agents = await prisma.agent.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Os teus agentes</h1>
        <LogoutButton />
      </div>

      <div className="mb-8 rounded-lg border border-border bg-card p-4">
        <NewAgentForm />
      </div>

      {agents.length === 0 ? (
        <p className="text-sm text-emerald-100/60">
          Ainda não tens agentes. Cria o primeiro acima.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {agents.map((agent) => (
            <li key={agent.id}>
              <Link
                href={`/agents/${agent.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-accent"
              >
                <div>
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-sm text-emerald-100/60">
                    {agent.phoneNumber ? `+${agent.phoneNumber}` : "Sem número ligado"}
                  </p>
                </div>
                <span className="text-sm">{STATUS_LABEL[agent.status] ?? agent.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
