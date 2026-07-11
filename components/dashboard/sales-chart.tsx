"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/utils";

export function SalesChart({ data, currency }: { data: { date: string; total: number }[]; currency: string }) {
  const formatted = data.map((d) => ({ ...d, label: d.date.slice(5) }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={formatted}>
        <defs>
          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          formatter={(value: number) => formatCurrency(value, currency as "MZN" | "ZAR")}
          contentStyle={{ borderRadius: 12, borderColor: "hsl(var(--border))", fontSize: 13 }}
        />
        <Area type="monotone" dataKey="total" stroke="#2563EB" strokeWidth={2} fill="url(#salesGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
