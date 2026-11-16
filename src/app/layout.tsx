import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gamelykeys.com"),
  title: "Gamely — Painel do Fornecedor",
  description: "Portal Gamely (gamelykeys.com)",
  icons: {
    icon: "/logogamely.png",
    apple: "/logogamely.png",
  },
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
