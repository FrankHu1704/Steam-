const COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  awaiting_customer: "bg-slate-100 text-slate-700",
  approved: "bg-emerald-100 text-emerald-800",
  active: "bg-emerald-100 text-emerald-800",
  success: "bg-emerald-100 text-emerald-800",
  paid: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
  failed: "bg-red-100 text-red-700",
  suspended: "bg-red-100 text-red-700",
  expired: "bg-red-100 text-red-700",
  refunded: "bg-purple-100 text-purple-700",
  chargeback: "bg-purple-100 text-purple-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
        COLORS[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
