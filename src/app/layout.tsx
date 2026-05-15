import type { Metadata } from "next";

import "./globals.css";
import "./public.css";
import "./public-refinements.css";

const siteUrl = "https://atabletonton.fr";

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "FoodEstablishment",
  name: "À table tonton !",
  url: siteUrl,
  image: `${siteUrl}/assets/logo-header.svg`,
  logo: `${siteUrl}/assets/logo-header.svg`,
  telephone: "+33679958962",
  email: "contact@atabletonton.fr",
  address: {
    "@type": "PostalAddress",
    streetAddress: "35 La Varlanchie",
    postalCode: "87440",
    addressLocality: "Marval",
    addressCountry: "FR",
  },
  servesCuisine: ["Pizza", "Cuisine artisanale"],
  priceRange: "€€",
  sameAs: ["https://www.facebook.com/profile.php?id=61588844054910"],
  areaServed: [
    {
      "@type": "Place",
      name: "Marval",
    },
    {
      "@type": "AdministrativeArea",
      name: "Haute-Vienne",
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "À table tonton ! — Pizzas gourmandes et généreuses à Marval",
    template: "%s — À table tonton !",
  },
  description:
    "À table tonton ! prépare des pizzas gourmandes et généreuses à Marval, avec une carte courte, des produits choisis avec soin et une prise de commande simple.",
  applicationName: "À table tonton !",
  authors: [{ name: "À table tonton !" }],
  creator: "À table tonton !",
  publisher: "À table tonton !",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: siteUrl,
    siteName: "À table tonton !",
    title: "À table tonton ! — Pizzas gourmandes et généreuses à Marval",
    description:
      "Pizzas gourmandes et généreuses à Marval. Carte courte, produits choisis avec soin, commande simple en ligne ou par SMS.",
    images: [
      {
        url: "/assets/logo-header.svg",
        alt: "À table tonton !",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "À table tonton ! — Pizzas gourmandes et généreuses à Marval",
    description:
      "Pizzas gourmandes et généreuses à Marval. Carte courte, produits choisis avec soin, commande simple en ligne ou par SMS.",
    images: ["/assets/logo-header.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(localBusinessJsonLd),
          }}
        />
        {children}
      </body>
    </html>
  );
}