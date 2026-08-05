"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserRoleSelect } from "@/components/admin/user-role-select";
import { formatCurrency } from "@/lib/utils";
import type { Profile } from "@/types/database";

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

export function UsersTable({ users }: { users: Profile[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone ?? "").toLowerCase().includes(q)
    );
  }, [users, query]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por nome, email ou telefone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
              <th className="p-4 font-medium">Nome</th>
              <th className="p-4 font-medium">Email</th>
              <th className="p-4 font-medium">Telefone</th>
              <th className="p-4 font-medium">Vendas</th>
              <th className="p-4 font-medium">Faturamento</th>
              <th className="p-4 font-medium">Saldo disponível</th>
              <th className="p-4 font-medium">Email verificado</th>
              <th className="p-4 font-medium">Membro desde</th>
              <th className="p-4 font-medium">Papel</th>
              <th className="p-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-10 text-center text-muted-foreground">
                  Nenhum utilizador encontrado para &quot;{query}&quot;.
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
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
                  <td className="p-4 text-muted-foreground">{user.lifetime_sales_count}</td>
                  <td className="p-4 font-medium">
                    {formatCurrency(user.lifetime_revenue, user.currency as "MZN" | "ZAR")}
                  </td>
                  <td className="p-4">{formatCurrency(user.balance_available, user.currency as "MZN" | "ZAR")}</td>
                  <td className="p-4">
                    <Badge variant={user.email_verified ? "success" : "secondary"}>
                      {user.email_verified ? "Sim" : "Não"}
                    </Badge>
                  </td>
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
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        A mostrar {filtered.length} de {users.length} utilizadores.
      </p>
    </div>
  );
}
