import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gamely — Painel do Fornecedor",
  description: "Sub-painel white-label Gamely conectado à infraestrutura Cubyc",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-[#05070b] text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
