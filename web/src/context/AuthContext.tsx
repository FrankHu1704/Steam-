import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export type Role = "merchant" | "admin" | null;

export interface MerchantProfile {
  uid: string;
  businessName: string;
  name: string;
  email: string;
  phone: string;
  status: "pending" | "active" | "suspended";
  balanceAvailable: number;
  balancePending: number;
  currency: "MZN" | "ZAR";
}

interface AuthState {
  user: User | null;
  role: Role;
  merchant: MerchantProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  role: null,
  merchant: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    merchant: null,
    loading: true,
  });

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ user: null, role: null, merchant: null, loading: false });
        return;
      }

      const tokenResult = await user.getIdTokenResult(true);
      const role = (tokenResult.claims.role as Role) ?? "merchant";
      setState((prev) => ({ ...prev, user, role, loading: false }));
    });
  }, []);

  useEffect(() => {
    if (!state.user) return;
    const ref = doc(db, "merchants", state.user.uid);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setState((prev) => ({
          ...prev,
          merchant: { uid: snap.id, ...(snap.data() as Omit<MerchantProfile, "uid">) },
        }));
      }
    });
  }, [state.user]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
