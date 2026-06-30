import type { Metadata } from "next";

import "./globals.css";
import "yet-another-react-lightbox/styles.css";
import "./public.css";
import "./public-refinements.css";

const siteUrl = "https://atabletonton.fr";
const ogImageUrl = "/assets/og-image.png";

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "À table tonton !",
      url: siteUrl,
      logo: `${siteUrl}/assets/logo-header.svg`,
      image: `${siteUrl}${ogImageUrl}`,
      email: "contact@atabletonton.fr",
      telephone: "+33679958962",
      sameAs: ["https://www.facebook.com/profile.php?id=61588844054910"],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "À table tonton !",
      url: siteUrl,
      inLanguage: "fr-FR",
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
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
            __html: JSON.stringify(websiteJsonLd),
          }}
        />
        {children}
      </body>
    </html>
  );
}