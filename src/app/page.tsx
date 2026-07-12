import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import PricingSection from "@/components/PricingSection";
import Faq from "@/components/Faq";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <PricingSection />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
