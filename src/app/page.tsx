import { Navbar } from '@/components/marketing/navbar'
import { Hero } from '@/components/marketing/hero'
import { StatsSection } from '@/components/marketing/stats-section'
import { Features } from '@/components/marketing/features'
import { Pricing } from '@/components/marketing/pricing'
import { Faq } from '@/components/marketing/faq'
import { Contact } from '@/components/marketing/contact'
import { Cta } from '@/components/marketing/cta'
import { Footer } from '@/components/marketing/footer'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <StatsSection />
        <Features />
        <Pricing />
        <Faq />
        <Cta />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
