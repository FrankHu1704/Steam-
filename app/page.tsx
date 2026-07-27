import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/landing/hero";
import {
  Features,
  Differentiators,
  HowItWorks,
  Benefits,
  HumanTouch,
  PaymentMethods,
  Testimonials,
  Faq,
} from "@/components/landing/sections";

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "PagaJá",
  alternateName: "PagaJá Moçambique",
  url: "https://pagaja.site",
  logo: "https://pagaja.site/icons/icon-512.png",
  description:
    "PagaJá é a plataforma moçambicana para vender infoprodutos digitais — eBooks, cursos online, mentorias e ficheiros digitais — com pagamentos via M-Pesa e e-Mola.",
  areaServed: "MZ",
  sameAs: [
    "https://www.instagram.com/pagaja.co.mz",
    "https://chat.whatsapp.com/Ga5A5WwQ4EJ9yI8DaR860t",
  ],
};

export default function Home() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
      />
      <SiteNav />
      <Hero />
      <Features />
      <Differentiators />
      <HowItWorks />
      <Benefits />
      <HumanTouch />
      <PaymentMethods />
      <Testimonials />
      <Faq />
      <SiteFooter />
    </div>
  );
}
