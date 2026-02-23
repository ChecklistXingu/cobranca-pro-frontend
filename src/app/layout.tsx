import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cobrança Pro",
  description: "Plataforma de gestão de cobrança de títulos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
