import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const SITE_URL = "https://pagaja.site";
const TITLE = "PayNow (PagaJá) — Venda os seus infoprodutos em minutos";
const DESCRIPTION =
  "PayNow, também conhecido como PagaJá, é a plataforma moçambicana para vender eBooks, cursos online, mentorias, ficheiros digitais e muito mais. Pagamentos via M-Pesa e e-Mola, saques instantâneos.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s — PayNow" },
  description: DESCRIPTION,
  keywords: [
    "PayNow",
    "PagaJá",
    "Paga Já",
    "pagaja.site",
    "infoprodutos Moçambique",
    "vender eBooks Moçambique",
    "vender cursos online Moçambique",
    "M-Pesa",
    "e-Mola",
    "checkout Moçambique",
    "plataforma de pagamentos Moçambique",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_MZ",
    url: SITE_URL,
    siteName: "PayNow",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "PayNow" }],
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/icons/icon-512.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PayNow",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  verification: {
    google: "gzP3exWawMfUm48T0lifyJDqiwZJwEUwg_vFRa2vZ2M",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563EB",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "PayNow",
        alternateName: "PagaJá",
        url: SITE_URL,
        logo: `${SITE_URL}/icons/icon-512.png`,
      },
      {
        "@type": "WebSite",
        name: "PayNow",
        alternateName: "PagaJá",
        url: SITE_URL,
      },
    ],
  };

  return (
    <html lang="pt" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
