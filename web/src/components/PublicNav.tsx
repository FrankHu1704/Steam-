import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { InstallAppButton } from "./InstallAppButton";

export function PublicNav() {
  const { user, role } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-10">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-lg font-bold text-brand-900">
          Paga<span className="text-brand-500">Já</span>
        </Link>
        <div className="hidden gap-8 text-sm font-medium text-slate-600 md:flex">
          <a href="#metodos" className="hover:text-brand-600">Métodos</a>
          <a href="#como-funciona" className="hover:text-brand-600">Como Funciona</a>
          <a href="#saques" className="hover:text-brand-600">Saques</a>
          <a href="#contacto" className="hover:text-brand-600">Contacto</a>
        </div>
        <div className="flex items-center gap-3">
          <InstallAppButton className="rounded-lg border border-brand-500 px-3 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50 sm:px-4 sm:text-sm" />
          {user ? (
            <Link
              to={role === "admin" ? "/admin" : "/dashboard"}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Ir para o Dashboard
            </Link>
          ) : (
            <div className="flex gap-3">
              <Link to="/login" className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-brand-600">
                Entrar
              </Link>
              <Link
                to="/signup"
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
              >
                Criar Conta
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
