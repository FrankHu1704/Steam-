export default function Footer() {
  return (
    <footer id="contato" className="border-t border-white/10 bg-[#070a12]">
      <div className="container-px mx-auto max-w-6xl py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-bold text-white">
              <span>☁️</span> Senga Host
            </div>
            <p className="mt-3 text-sm text-white/50">
              Hospedagem de bots WhatsApp rápida, segura e acessível para
              Moçambique.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Links Úteis</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/50">
              <li><a href="#planos" className="hover:text-white">Planos</a></li>
              <li><a href="#faq" className="hover:text-white">FAQ</a></li>
              <li><a href="/termos" className="hover:text-white">Termos de Serviço</a></li>
              <li><a href="/privacidade" className="hover:text-white">Política de Privacidade</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Contato</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/50">
              <li>
                <a
                  href="https://wa.me/258849311757"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white"
                >
                  WhatsApp: +258 84 931 1757
                </a>
              </li>
              <li>
                <a
                  href="mailto:starchannelmoz@gmail.com"
                  className="hover:text-white"
                >
                  starchannelmoz@gmail.com
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Redes Sociais</h4>
            <div className="mt-3 flex gap-4 text-sm text-white/50">
              <a href="#" className="hover:text-white" aria-label="Facebook">Facebook</a>
              <a href="#" className="hover:text-white" aria-label="Instagram">Instagram</a>
              <a href="#" className="hover:text-white" aria-label="X">X</a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/40">
          © {new Date().getFullYear()} Senga Host. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
