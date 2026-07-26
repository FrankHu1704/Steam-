import Link from "next/link";
import { Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { UserRoleSelect } from "@/components/admin/user-role-select";
import { getAllUsers } from "@/lib/data/admin";
import { formatCurrency } from "@/lib/utils";

export default async function AdminUsersPage() {
  const users = await getAllUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Utilizadores</h1>
        <p className="text-sm text-muted-foreground">{users.length} contas registadas.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-4 font-medium">Nome</th>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium">Telefone</th>
                  <th className="p-4 font-medium">Saldo disponível</th>
                  <th className="p-4 font-medium">Membro desde</th>
                  <th className="p-4 font-medium">Papel</th>
                  <th className="p-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border/60 last:border-0">
                    <td className="p-4 font-medium">{user.name}</td>
                    <td className="p-4 text-muted-foreground">{user.email}</td>
                    <td className="p-4 text-muted-foreground">{user.phone ?? "—"}</td>
                    <td className="p-4">{formatCurrency(user.balance_available, user.currency as "MZN" | "ZAR")}</td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString("pt-MZ")}
                    </td>
                    <td className="p-4">
                      <UserRoleSelect userId={user.id} role={user.role} />
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver tudo
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
