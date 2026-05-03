import type { Metadata } from "next";

import "./globals.css";
import "./public.css";
import "./public-refinements.css";

export const metadata: Metadata = {
  title: "À table tonton !",
  description:
    "Pizzas artisanales, de saison et locales. Préparez votre demande simplement par SMS ou navigateur.",
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