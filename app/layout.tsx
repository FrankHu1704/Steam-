import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const SITE_URL = "https://pagaja.site";
const TITLE = "PagaJá — Venda os seus infoprodutos em minutos";
const DESCRIPTION =
  "PagaJá é a plataforma moçambicana para vender eBooks, cursos online, mentorias, ficheiros digitais e muito mais. Pagamentos via M-Pesa e e-Mola, saques instantâneos.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s — PagaJá" },
  description: DESCRIPTION,
  keywords: [
    "PagaJá",
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
    siteName: "PagaJá",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "PagaJá" }],
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
    title: "PagaJá",
  },
  icons: {
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
  return (
    <html lang="pt" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
