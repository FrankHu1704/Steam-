import { Megaphone, Users2, Rocket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BroadcastForm } from "@/components/admin/broadcast-form";
import { InactiveProducersAnnouncement } from "@/components/admin/inactive-producers-announcement";
import { getAllUsers } from "@/lib/data/admin";
import { getInactiveProducersCount } from "@/lib/actions/admin";

export default async function AdminBroadcastPage() {
  const [users, inactiveProducersCount] = await Promise.all([getAllUsers(), getInactiveProducersCount()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Comunicados</h1>
        <p className="text-sm text-muted-foreground">
          Envie um email para todos os {users.length} utilizadores registados na plataforma.
        </p>
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white">
          <Users2 className="h-5 w-5" />
        </span>
        <div>
          <p className="text-2xl font-bold">{users.length}</p>
          <p className="text-sm text-muted-foreground">destinatários vão receber este comunicado</p>
        </div>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Novo comunicado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BroadcastForm userCount={users.length} />
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-4 w-4" /> Novidade: Saques instantâneos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InactiveProducersAnnouncement count={inactiveProducersCount} />
        </CardContent>
      </Card>
    </div>
  );
}
