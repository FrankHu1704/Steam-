import Link from "next/link";
import { Eye, Users2, Store, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { UserRoleSelect } from "@/components/admin/user-role-select";
import { getAllUsers } from "@/lib/data/admin";
import { cn, formatCurrency } from "@/lib/utils";

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

export default async function AdminUsersPage() {
  const users = await getAllUsers();

  const producers = users.filter((u) => u.role === "producer").length;
  const admins = users.filter((u) => u.role === "admin").length;

  const tiles = [
    { label: "Total", value: users.length, icon: Users2, style: "bg-primary/10 text-primary" },
    { label: "Produtores", value: producers, icon: Store, style: "bg-amber-500/10 text-amber-600" },
    { label: "Admins", value: admins, icon: ShieldCheck, style: "bg-emerald-500/10 text-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Utilizadores</h1>
        <p className="text-sm text-muted-foreground">{users.length} contas registadas.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{tile.label}</p>
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tile.style)}>
                  <tile.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold">{tile.value}</p>
            </CardContent>
          </Card>
        ))}
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
                  <tr key={user.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-semibold text-white">
                          {initials(user.name)}
                        </span>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </td>
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
