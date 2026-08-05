import { Users2, Store, ShieldCheck, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { UsersTable } from "@/components/admin/users-table";
import { getAllUsers } from "@/lib/data/admin";
import { cn } from "@/lib/utils";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const users = await getAllUsers();

  const producers = users.filter((u) => u.role === "producer").length;
  const admins = users.filter((u) => u.role === "admin").length;
  const buyers = users.filter((u) => u.role === "buyer").length;

  const filters = [
    { label: "Todos", value: "" },
    { label: "Produtores", value: "producer" },
    { label: "Compradores", value: "buyer" },
    { label: "Admins", value: "admin" },
  ];
  const activeRole = role ?? "";
  const filteredUsers = activeRole ? users.filter((u) => u.role === activeRole) : users;

  const tiles = [
    { label: "Total", value: users.length, icon: Users2, style: "bg-primary/10 text-primary" },
    { label: "Produtores", value: producers, icon: Store, style: "bg-amber-500/10 text-amber-600" },
    { label: "Compradores", value: buyers, icon: ShoppingBag, style: "bg-violet-500/10 text-violet-600" },
    { label: "Admins", value: admins, icon: ShieldCheck, style: "bg-emerald-500/10 text-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Utilizadores</h1>
        <p className="text-sm text-muted-foreground">{users.length} contas registadas.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <a
            key={f.value}
            href={f.value ? `/admin/users?role=${f.value}` : "/admin/users"}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              activeRole === f.value ? "bg-brand-gradient text-white shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </a>
        ))}
      </div>

      <UsersTable users={filteredUsers} />
    </div>
  );
}
