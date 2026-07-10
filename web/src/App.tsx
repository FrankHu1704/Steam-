import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

import { Landing } from "./pages/Landing";
import { Login } from "./pages/auth/Login";
import { Signup } from "./pages/auth/Signup";
import { PublicCheckout } from "./pages/PublicCheckout";

import { Overview } from "./pages/merchant/Overview";
import { Products } from "./pages/merchant/Products";
import { Payments } from "./pages/merchant/Payments";
import { Withdrawals } from "./pages/merchant/Withdrawals";
import { Settings } from "./pages/merchant/Settings";

import { AdminOverview } from "./pages/admin/AdminOverview";
import { AdminWithdrawals } from "./pages/admin/AdminWithdrawals";
import { AdminProducts } from "./pages/admin/AdminProducts";
import { AdminMerchants } from "./pages/admin/AdminMerchants";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/pay/:paymentId" element={<PublicCheckout />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requireRole="merchant">
                <Overview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/products"
            element={
              <ProtectedRoute requireRole="merchant">
                <Products />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/payments"
            element={
              <ProtectedRoute requireRole="merchant">
                <Payments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/withdrawals"
            element={
              <ProtectedRoute requireRole="merchant">
                <Withdrawals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/settings"
            element={
              <ProtectedRoute requireRole="merchant">
                <Settings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute requireRole="admin">
                <AdminOverview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/withdrawals"
            element={
              <ProtectedRoute requireRole="admin">
                <AdminWithdrawals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute requireRole="admin">
                <AdminProducts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/merchants"
            element={
              <ProtectedRoute requireRole="admin">
                <AdminMerchants />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
