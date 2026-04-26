import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Planificateur pizzas",
  description: "Version d'essai locale pour prise de commande pizzeria",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}