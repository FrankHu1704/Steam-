import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { AdminLayout } from "../../components/AdminLayout";
import { Link } from "react-router-dom";

export function AdminOverview() {
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [pendingProducts, setPendingProducts] = useState(0);
  const [pendingMerchants, setPendingMerchants] = useState(0);

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, "withdrawals"), where("status", "==", "pending")), (s) =>
        setPendingWithdrawals(s.size)
      ),
      onSnapshot(query(collection(db, "products"), where("status", "==", "pending")), (s) =>
        setPendingProducts(s.size)
      ),
      onSnapshot(query(collection(db, "merchants"), where("status", "==", "pending")), (s) =>
        setPendingMerchants(s.size)
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-brand-900">Visão Geral</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Link to="/admin/withdrawals" className="rounded-xl bg-white p-6 shadow-sm hover:shadow-md">
          <p className="text-sm text-slate-500">Saques Pendentes</p>
          <p className="mt-2 text-3xl font-bold text-brand-900">{pendingWithdrawals}</p>
        </Link>
        <Link to="/admin/products" className="rounded-xl bg-white p-6 shadow-sm hover:shadow-md">
          <p className="text-sm text-slate-500">Produtos Pendentes</p>
          <p className="mt-2 text-3xl font-bold text-brand-900">{pendingProducts}</p>
        </Link>
        <Link to="/admin/merchants" className="rounded-xl bg-white p-6 shadow-sm hover:shadow-md">
          <p className="text-sm text-slate-500">Merchants por Ativar</p>
          <p className="mt-2 text-3xl font-bold text-brand-900">{pendingMerchants}</p>
        </Link>
      </div>
    </AdminLayout>
  );
}
