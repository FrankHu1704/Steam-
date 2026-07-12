import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Senga Host - Hospedagem de Bots WhatsApp em Moçambique",
  description:
    "Hospedagem confiável de bots WhatsApp a partir de 100 MT/mês. Deploy instantâneo, uptime 99.9% e suporte dedicado.",
  keywords: [
    "hospedagem de bots",
    "bot whatsapp",
    "hosting moçambique",
    "senga host",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-MZ" className={inter.variable}>
      <body className="min-h-screen bg-hero-gradient font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
