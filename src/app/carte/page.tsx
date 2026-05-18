import type { Metadata } from "next";

import PublicCarteBuilder from "@/components/public-carte-builder";
import PublicSiteShell from "@/components/public-site-shell";
import { getActivePizzas } from "@/lib/data";
import type { Pizza } from "@/lib/types";

export const dynamic = "force-dynamic";

const SITE_URL = "https://atabletonton.fr";

export const metadata: Metadata = {
  title: "Carte et commande de pizzas à Marval",
  description:
    "Retrouvez la carte d’À table tonton ! : pizzas à emporter à Marval, recettes gourmandes et originales, créneau souhaité et demande de commande simple.",
  alternates: {
    canonical: "/carte",
  },
  openGraph: {
    title: "Carte et commande de pizzas à Marval — À table tonton !",
    description:
      "Choisissez vos pizzas, indiquez votre créneau souhaité et préparez votre demande simplement.",
    url: "/carte",
    type: "website",
  },
};

function buildMenuStructuredData(pizzas: Pizza[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": `${SITE_URL}/carte#menu`,
    name: "Carte de pizzas à Marval — À table tonton !",
    url: `${SITE_URL}/carte`,
    provider: {
      "@type": "FoodEstablishment",
      "@id": `${SITE_URL}/#atabletonton`,
      name: "À table tonton !",
    },
    hasMenuSection: [
      {
        "@type": "MenuSection",
        name: "Pizzas",
        hasMenuItem: pizzas.map((pizza) => ({
          "@type": "MenuItem",
          name: pizza.name,
          description: pizza.description || pizza.ingredients || undefined,
          image: pizza.photoPath ? `${SITE_URL}${pizza.photoPath}` : undefined,
          offers: {
            "@type": "Offer",
            price: (pizza.priceCents / 100).toFixed(2),
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
          },
        })),
      },
    ],
  };
}

export default async function CartePage() {
  const pizzas = await getActivePizzas();
  const menuStructuredData = buildMenuStructuredData(pizzas);

  return (
    <PublicSiteShell currentPage="carte">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(menuStructuredData),
        }}
      />

      <section
        aria-labelledby="carte-title"
        style={{
          padding: "34px 0 32px",
        }}
      >
        <h1
          id="carte-title"
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            padding: 0,
            margin: "-1px",
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          Carte et commande de pizzas à Marval
        </h1>

        <img
          src="/assets/carte-hero-illustration.svg"
          alt=""
          aria-hidden="true"
          style={{
            display: "block",
            width: "100%",
            height: "auto",
          }}
        />
      </section>

      <PublicCarteBuilder pizzas={pizzas} />

      <section
        aria-label="Informations locales sur la carte"
        style={{
          maxWidth: "980px",
          margin: "20px auto 52px",
          padding: "0 20px",
          color: "rgba(17, 17, 17, 0.62)",
          fontSize: "0.84rem",
          fontWeight: 700,
          lineHeight: 1.5,
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0 }}>
          Retrouvez notre carte de pizzas à emporter à Marval, entre
          Haute-Vienne et Dordogne, et préparez votre demande de commande
          simplement.
        </p>
      </section>
    </PublicSiteShell>
  );
}