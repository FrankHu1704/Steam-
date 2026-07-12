export default function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-[#0a0e1a]/80 backdrop-blur-md">
      <div className="container-px mx-auto flex max-w-6xl items-center justify-between py-4">
        <a href="#" className="flex items-center gap-2 text-lg font-bold text-white">
          <span>☁️</span> Senga Host
        </a>

        <nav className="hidden items-center gap-8 text-sm text-white/70 sm:flex">
          <a href="#planos" className="hover:text-white">Planos</a>
          <a href="#faq" className="hover:text-white">FAQ</a>
          <a href="#contato" className="hover:text-white">Contato</a>
        </nav>

        <a
          href="#planos"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          Escolher Plano
        </a>
      </div>
    </header>
  );
}
