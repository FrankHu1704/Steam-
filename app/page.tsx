import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/landing/hero";
import {
  Features,
  HowItWorks,
  Benefits,
  HumanTouch,
  PaymentMethods,
  Testimonials,
  Faq,
} from "@/components/landing/sections";

export default function Home() {
  return (
    <div>
      <SiteNav />
      <Hero />
      <Features />
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
