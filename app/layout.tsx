import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LunaAI Connect — FRANK AI SOLUTIONS",
  description:
    "Liga o LunaAI ao teu WhatsApp e treina como ele deve responder, sem nunca perder a identidade FRANK AI SOLUTIONS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="text-accent">🌙</span>
              <span>
                Luna<span className="text-accent">AI</span> Connect
              </span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-emerald-100/70">
              <Link href="/dashboard" className="hover:text-accent">
                Painel
              </Link>
              <Link href="/login" className="hover:text-accent">
                Entrar
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-accent px-3 py-1.5 font-medium text-black hover:bg-emerald-400"
              >
                Criar conta
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
        <footer className="border-t border-border py-6 text-center text-xs text-emerald-100/50">
          Powered by LunaAI —{" "}
          <a
            href="https://frank-perfil.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            FRANK AI SOLUTIONS
          </a>{" "}
          🇲🇿
        </footer>
      </body>
    </html>
  );
}
