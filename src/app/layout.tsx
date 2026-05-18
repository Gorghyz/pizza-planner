import type { Metadata } from "next";

import "./globals.css";
import "./public.css";
import "./public-refinements.css";

const siteUrl = "https://atabletonton.fr";
const ogImageUrl = "/assets/og-image.png";

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "FoodEstablishment",
  name: "À table tonton !",
  description:
    "Foodtruck de pizzas gourmandes et originales à Marval, entre Haute-Vienne et Dordogne.",
  url: siteUrl,
  image: `${siteUrl}${ogImageUrl}`,
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
  servesCuisine: ["Pizza", "Cuisine artisanale", "Street food"],
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
    {
      "@type": "AdministrativeArea",
      name: "Dordogne",
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default:
      "À table tonton ! — Foodtruck de pizzas gourmandes et originales à Marval",
    template: "%s — À table tonton !",
  },
  description:
    "Foodtruck de pizzas à emporter à Marval, entre Haute-Vienne et Dordogne. Des pizzas gourmandes, généreuses et originales, préparées avec des produits choisis avec soin.",
  keywords: [
    "pizza Marval",
    "pizzeria Marval",
    "pizza à emporter Marval",
    "commander pizza Marval",
    "foodtruck pizza",
    "food truck pizza",
    "foodtruck Marval",
    "street food Marval",
    "pizzas originales",
    "pizzas artisanales",
    "pizzas gourmandes",
    "Haute-Vienne",
    "Dordogne",
  ],
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
    title:
      "À table tonton ! — Foodtruck de pizzas gourmandes et originales à Marval",
    description:
      "Pizzas à emporter à Marval, entre Haute-Vienne et Dordogne. Une carte de pizzas gourmandes, généreuses et originales.",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "À table tonton ! — Pizzas gourmandes et généreuses à Marval",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "À table tonton ! — Foodtruck de pizzas gourmandes et originales à Marval",
    description:
      "Pizzas à emporter à Marval, entre Haute-Vienne et Dordogne. Une carte de pizzas gourmandes, généreuses et originales.",
    images: [ogImageUrl],
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