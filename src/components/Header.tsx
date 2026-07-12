"use client";

import { useState } from "react";

const LINKS = [
  { href: "#planos", label: "Planos" },
  { href: "#faq", label: "FAQ" },
  { href: "#contato", label: "Contato" },
  { href: "/painel", label: "Área do Cliente" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-[#0a0e1a]/80 backdrop-blur-md">
      <div className="container-px mx-auto flex max-w-6xl items-center justify-between py-4">
        <a href="#" className="flex items-center gap-2 text-lg font-bold text-white">
          <span>☁️</span> Senga Host
        </a>

        <nav className="hidden items-center gap-8 text-sm text-white/70 sm:flex">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="#planos"
          className="hidden rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark sm:block"
        >
          Escolher Plano
        </a>

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-white sm:hidden"
          aria-label="Abrir menu"
          aria-expanded={open}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <nav className="border-t border-white/10 bg-[#0a0e1a] px-6 py-4 sm:hidden">
          <ul className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-3 text-sm font-medium text-white/80 hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li className="mt-2">
              <a
                href="#planos"
                onClick={() => setOpen(false)}
                className="block rounded-lg bg-primary px-3 py-3 text-center text-sm font-semibold text-white"
              >
                Escolher Plano
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
