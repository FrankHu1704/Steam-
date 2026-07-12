"use client";

import { useState } from "react";

const faqs = [
  {
    q: "Como faço upload do meu bot?",
    a: "Após a ativação do plano, você recebe acesso ao painel de controlo onde pode enviar os ficheiros do seu bot via Git, FTP ou upload direto. O deploy é feito automaticamente em minutos.",
  },
  {
    q: "É possível migrar de outro host?",
    a: "Sim. A nossa equipa ajuda gratuitamente na migração do seu bot de qualquer outro provedor, garantindo que fica tudo funcional sem tempo de inatividade.",
  },
  {
    q: "Qual plano escolher?",
    a: "Para bots pessoais ou testes, o LS 1 ou LS 2 são suficientes. Para bots com muitos utilizadores ou múltiplas integrações, recomendamos o LS 4 ou superior.",
  },
  {
    q: "Posso aumentar/diminuir o plano?",
    a: "Sim, pode fazer upgrade ou downgrade do seu plano a qualquer momento diretamente no painel, sem perder os dados do seu bot.",
  },
  {
    q: "Qual é o suporte?",
    a: "Suporte via WhatsApp e Email, com resposta em até 24 horas. Planos superiores têm prioridade no atendimento.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="container-px mx-auto max-w-3xl py-20">
      <h2 className="text-center text-3xl font-extrabold text-white sm:text-4xl">
        Perguntas Frequentes
      </h2>

      <div className="mt-10 space-y-3">
        {faqs.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.q}
              className="card-glass overflow-hidden"
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-white sm:text-base"
              >
                {item.q}
                <span
                  className={`ml-4 shrink-0 text-primary-light transition-transform ${
                    isOpen ? "rotate-45" : ""
                  }`}
                >
                  +
                </span>
              </button>
              {isOpen && (
                <div className="px-5 pb-4 text-sm text-white/60">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
