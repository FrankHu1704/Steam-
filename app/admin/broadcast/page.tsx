import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BroadcastForm } from "@/components/admin/broadcast-form";
import { getAllUsers } from "@/lib/data/admin";

export default async function AdminBroadcastPage() {
  const users = await getAllUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Comunicados</h1>
        <p className="text-sm text-muted-foreground">
          Envie um email para todos os {users.length} utilizadores registados na plataforma.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Novo comunicado</CardTitle>
        </CardHeader>
        <CardContent>
          <BroadcastForm userCount={users.length} />
        </CardContent>
      </Card>
    </div>
  );
}
